"""
AEGIS Active Attribution Engine - Async Processing Pipeline

This module implements the asynchronous processing layer that:
1. Decouples ingestion from processing
2. Runs heavy computation in background workers
3. Prevents API blocking and dashboard freezing

ARCHITECTURE:
------------
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Ingest     │────▶│   Queue      │────▶│   Workers    │
│   (FastAPI)  │     │  (asyncio)   │     │  (compute)   │
└──────────────┘     └──────────────┘     └──────────────┘
        │                                         │
        │                                         ▼
        │                               ┌──────────────┐
        └──────────────────────────────▶│   Cache      │
                                        │ (results)    │
                                        └──────────────┘

For production at scale, replace asyncio.Queue with:
- Redis Streams (recommended)
- Apache Kafka (enterprise scale)
- RabbitMQ (complex routing needs)

This implementation uses asyncio for simplicity and zero dependencies.
"""

import asyncio
import json
import logging
import time
from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
from collections import deque

from backend.engine.graph_engine import get_graph_engine
from backend.engine.temporal_engine import get_temporal_engine
from backend.engine.header_fingerprint import get_header_engine
from backend.engine.attribution_scorer import get_attribution_scorer, AttributionResult

logger = logging.getLogger(__name__)


class TaskPriority(Enum):
    CRITICAL = 0    # Real-time threat updates
    HIGH = 1        # Attribution scoring
    NORMAL = 2      # Graph computation
    LOW = 3         # Background maintenance


@dataclass
class ProcessingTask:
    """Unit of work for the processing pipeline."""
    task_type: str
    payload: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL
    created_at: float = field(default_factory=time.time)
    retries: int = 0
    max_retries: int = 3


@dataclass
class ProcessingResult:
    """Result from a processing task."""
    task_type: str
    success: bool
    result: Optional[Any] = None
    error: Optional[str] = None
    processing_time_ms: float = 0


class AsyncProcessingPipeline:
    """
    Async processing pipeline for heavy computation.
    
    Features:
    - Priority-based task queue
    - Background worker pool
    - Result caching
    - Error handling with retries
    - Backpressure support
    """
    
    MAX_QUEUE_SIZE = 10000
    RESULT_CACHE_TTL = 30.0  # 30 seconds
    
    def __init__(self, num_workers: int = 4):
        self.num_workers = num_workers
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue(maxsize=self.MAX_QUEUE_SIZE)
        self._results_cache: Dict[str, Any] = {}
        self._cache_timestamps: Dict[str, float] = {}
        self._workers: List[asyncio.Task] = []
        self._running = False
        self._processed_count = 0
        self._error_count = 0
        
        # Task handlers
        self._handlers: Dict[str, Callable[[Dict], Awaitable[Any]]] = {
            'ingest_telemetry': self._handle_ingest,
            'compute_graph': self._handle_graph_computation,
            'compute_attribution': self._handle_attribution,
            'analyze_timing': self._handle_timing_analysis,
            'analyze_headers': self._handle_header_analysis,
        }
    
    async def start(self) -> None:
        """Start the worker pool."""
        if self._running:
            return
        
        self._running = True
        logger.info(f"Starting async pipeline with {self.num_workers} workers")
        
        # Start workers
        for i in range(self.num_workers):
            worker = asyncio.create_task(self._worker_loop(i))
            self._workers.append(worker)
        
        # Start cache cleanup task
        asyncio.create_task(self._cache_cleanup_loop())
    
    async def stop(self) -> None:
        """Stop the worker pool."""
        self._running = False
        
        # Cancel all workers
        for worker in self._workers:
            worker.cancel()
        
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        logger.info("Async pipeline stopped")
    
    async def submit(self, task: ProcessingTask) -> None:
        """Submit a task for processing."""
        if not self._running:
            raise RuntimeError("Pipeline not running")
        
        # Priority queue uses tuple (priority, counter, task)
        # Counter ensures FIFO for same priority
        priority_tuple = (task.priority.value, time.time(), task)
        
        try:
            self._queue.put_nowait(priority_tuple)
        except asyncio.QueueFull:
            logger.warning(f"Queue full, dropping task: {task.task_type}")
    
    async def submit_and_wait(
        self, 
        task: ProcessingTask,
        timeout: float = 10.0
    ) -> ProcessingResult:
        """Submit a task and wait for result."""
        # Create a unique result key
        result_key = f"{task.task_type}_{id(task)}"
        
        # Modify task to include result key
        task.payload['_result_key'] = result_key
        
        await self.submit(task)
        
        # Wait for result
        start = time.time()
        while time.time() - start < timeout:
            if result_key in self._results_cache:
                result = self._results_cache.pop(result_key)
                self._cache_timestamps.pop(result_key, None)
                return result
            await asyncio.sleep(0.01)
        
        return ProcessingResult(
            task_type=task.task_type,
            success=False,
            error="Timeout waiting for result"
        )
    
    async def _worker_loop(self, worker_id: int) -> None:
        """Main worker loop."""
        logger.debug(f"Worker {worker_id} started")
        
        while self._running:
            try:
                # Get task with timeout to allow checking _running
                try:
                    _, _, task = await asyncio.wait_for(
                        self._queue.get(),
                        timeout=1.0
                    )
                except asyncio.TimeoutError:
                    continue
                
                # Process task
                start = time.time()
                try:
                    handler = self._handlers.get(task.task_type)
                    if handler:
                        result = await handler(task.payload)
                        processing_time = (time.time() - start) * 1000
                        
                        result_obj = ProcessingResult(
                            task_type=task.task_type,
                            success=True,
                            result=result,
                            processing_time_ms=processing_time
                        )
                        
                        # Store result if requested
                        result_key = task.payload.get('_result_key')
                        if result_key:
                            self._results_cache[result_key] = result_obj
                            self._cache_timestamps[result_key] = time.time()
                        
                        self._processed_count += 1
                    else:
                        logger.warning(f"Unknown task type: {task.task_type}")
                        
                except Exception as e:
                    logger.error(f"Worker {worker_id} error processing {task.task_type}: {e}")
                    self._error_count += 1
                    
                    # Retry logic
                    if task.retries < task.max_retries:
                        task.retries += 1
                        await self.submit(task)
                    else:
                        result_key = task.payload.get('_result_key')
                        if result_key:
                            self._results_cache[result_key] = ProcessingResult(
                                task_type=task.task_type,
                                success=False,
                                error=str(e)
                            )
                            self._cache_timestamps[result_key] = time.time()
                
                self._queue.task_done()
                
            except asyncio.CancelledError:
                break
    
    async def _cache_cleanup_loop(self) -> None:
        """Periodically clean expired cache entries."""
        while self._running:
            await asyncio.sleep(10.0)
            
            now = time.time()
            expired = [
                key for key, ts in self._cache_timestamps.items()
                if now - ts > self.RESULT_CACHE_TTL
            ]
            
            for key in expired:
                self._results_cache.pop(key, None)
                self._cache_timestamps.pop(key, None)
    
    # Task Handlers
    
    async def _handle_ingest(self, payload: Dict) -> Dict[str, Any]:
        """
        Handle telemetry ingestion.
        Feeds data into all analysis engines.
        """
        node_id = payload.get('node_id') or payload.get('source_ip', 'unknown')
        timestamp = payload.get('timestamp', time.time() * 1000)
        
        # Feed graph engine
        graph = get_graph_engine()
        source_ip = payload.get('source_ip', str(node_id))
        target = payload.get('target_endpoint', '/api/default')
        graph.add_interaction(source_ip, target, timestamp)
        
        # Feed temporal engine
        temporal = get_temporal_engine()
        temporal.record_request(node_id, timestamp)
        
        # Feed header engine if headers present
        headers = payload.get('headers')
        if headers:
            header_engine = get_header_engine()
            header_engine.analyze_request(
                node_id,
                headers,
                payload.get('header_order')
            )
        
        return {'node_id': node_id, 'ingested': True}
    
    async def _handle_graph_computation(self, payload: Dict) -> Dict[str, Any]:
        """Handle graph metric computation."""
        graph = get_graph_engine()
        metrics = graph.compute_metrics(force=payload.get('force', False))
        
        return {
            'node_count': len(metrics),
            'computed': True
        }
    
    async def _handle_attribution(self, payload: Dict) -> Dict[str, Any]:
        """Handle attribution scoring."""
        scorer = get_attribution_scorer()
        
        node_id = payload.get('node_id')
        if node_id:
            result = scorer.score_node(node_id)
            return result.to_dict()
        else:
            # Score all nodes
            min_score = payload.get('min_score', 50)
            results = scorer.score_all_nodes(min_score=min_score)
            return {
                'nodes': [r.to_dict() for r in results],
                'count': len(results)
            }
    
    async def _handle_timing_analysis(self, payload: Dict) -> Dict[str, Any]:
        """Handle timing pattern analysis."""
        temporal = get_temporal_engine()
        
        node_id = payload.get('node_id')
        if node_id:
            profile = temporal.analyze_node(node_id)
            return profile.to_dict() if profile else {}
        else:
            beacons = temporal.get_beacons(threshold=payload.get('threshold', 0.5))
            return {
                'beacons': [b.to_dict() for b in beacons],
                'count': len(beacons)
            }
    
    async def _handle_header_analysis(self, payload: Dict) -> Dict[str, Any]:
        """Handle header fingerprint analysis."""
        headers = get_header_engine()
        
        suspicious = headers.get_suspicious_nodes(
            threshold=payload.get('threshold', 0.3)
        )
        
        return {
            'suspicious_nodes': [n.to_dict() for n in suspicious],
            'stats': headers.get_fingerprint_stats()
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get pipeline statistics."""
        return {
            'running': self._running,
            'workers': self.num_workers,
            'queue_size': self._queue.qsize(),
            'processed_count': self._processed_count,
            'error_count': self._error_count,
            'cache_size': len(self._results_cache)
        }


# Singleton instance
_pipeline: Optional[AsyncProcessingPipeline] = None


def get_processing_pipeline() -> AsyncProcessingPipeline:
    """Get or create the singleton pipeline instance."""
    global _pipeline
    if _pipeline is None:
        _pipeline = AsyncProcessingPipeline(num_workers=4)
    return _pipeline


async def start_pipeline() -> None:
    """Start the processing pipeline."""
    pipeline = get_processing_pipeline()
    await pipeline.start()


async def stop_pipeline() -> None:
    """Stop the processing pipeline."""
    if _pipeline:
        await _pipeline.stop()


# Convenience functions for common operations

async def ingest_telemetry_async(telemetry: Dict[str, Any]) -> None:
    """Asynchronously ingest telemetry data."""
    pipeline = get_processing_pipeline()
    await pipeline.submit(ProcessingTask(
        task_type='ingest_telemetry',
        payload=telemetry,
        priority=TaskPriority.HIGH
    ))


async def compute_attribution_async(
    node_id: Optional[str] = None,
    min_score: float = 50
) -> Dict[str, Any]:
    """Asynchronously compute attribution scores."""
    pipeline = get_processing_pipeline()
    
    task = ProcessingTask(
        task_type='compute_attribution',
        payload={'node_id': node_id, 'min_score': min_score},
        priority=TaskPriority.HIGH
    )
    
    result = await pipeline.submit_and_wait(task, timeout=30.0)
    
    if result.success:
        return result.result
    else:
        raise RuntimeError(result.error or "Attribution computation failed")
