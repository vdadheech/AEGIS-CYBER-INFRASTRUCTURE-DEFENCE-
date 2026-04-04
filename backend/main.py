from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.api.routes import router
from backend.api.graph_routes import router as graph_router
from backend.db.database import init_db
from backend.engine.threat_model import AEGISThreatModel
from backend.services.pipeline import stream_telemetry
from backend.services.async_pipeline import start_pipeline, stop_pipeline
import logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events for the Attribution Engine.
    """
    # STARTUP
    logger.info("🛡️ AEGIS Active Attribution Engine - Initialization Sequence")
    
    # Initialize database with new schema
    init_db()
    logger.info("✅ Database initialized with Attribution Engine schema")
    
    # Preload ML model
    AEGISThreatModel.preload_model()
    logger.info("✅ Legacy ML model preloaded")
    
    # Start async processing pipeline
    await start_pipeline()
    logger.info("✅ Async processing pipeline started")
    
    logger.info("🚀 AEGIS Active Attribution Engine online and operational")
    
    yield
    
    # SHUTDOWN
    logger.info("🛑 AEGIS shutting down...")
    await stop_pipeline()
    logger.info("✅ Async pipeline stopped")


app = FastAPI(
    title="AEGIS Active Attribution Engine API",
    description="Enterprise-grade C2 detection with graph + temporal intelligence",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aegis-frontend-navy.vercel.app/","http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Legacy routes
app.include_router(router, prefix="/api")

# New Attribution Engine routes
app.include_router(graph_router, prefix="/api")


@app.get("/")
def health_check():
    return {
        "status": "AEGIS Active Attribution Engine is ONLINE",
        "version": "2.0.0",
        "capabilities": [
            "graph_analytics",
            "temporal_fingerprinting",
            "header_fingerprinting",
            "c2_attribution"
        ]
    }


@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    Live telemetry stream endpoint.
    Streams all telemetry log events and schema rotation notices to the client.
    """
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/telemetry")
    try:
        async for event_json in stream_telemetry():
            await websocket.send_text(event_json)
        # Stream complete — send a done signal
        await websocket.send_text('{"event": "stream_complete"}')
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except (RuntimeError, ValueError, TypeError) as e:
        logger.error(f"WebSocket error: {e}")
