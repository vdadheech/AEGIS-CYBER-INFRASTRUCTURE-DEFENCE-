# 🚀 Quick Start - AEGIS Attribution Engine Demo

## Run the Demo (Shows All New Features)

### Windows:
```bash
run_demo.bat
```

### Linux/Mac:
```bash
python demo_attribution_engine.py
```

## What the Demo Shows

The demo simulates realistic network traffic and demonstrates:

1. **Graph Analytics** - Detects C2 controller via network topology
2. **Temporal Fingerprinting** - Identifies beacon patterns (300ms and 1000ms intervals)
3. **Header Fingerprinting** - Catches Python and curl clients pretending to be browsers
4. **Attribution Scoring** - Combines all signals into C2 confidence scores

### Expected Output:

```
🎯 C2 Attribution Results:

🔴 10.0.0.42 (CRITICAL - 87.3%)
   Primary Indicators:
   • Beacon pattern: beacon @ 300ms
   • Rigid timing (automation signature)
   • Non-browser HTTP fingerprint

🔴 10.0.0.87 (CRITICAL - 84.1%)
   Primary Indicators:
   • Beacon pattern: beacon @ 1000ms
   • Low-jitter timing (possible automation)

🟢 192.168.1.50 (LOW - 12.5%)
   Normal human traffic pattern
```

---

## Run Full System

### 1. Install Dependencies

```bash
# Backend dependencies
pip install -r requirements.txt

# Frontend dependencies
cd frontend-react
npm install
```

### 2. Start Backend Server

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Expected output:
```
INFO:     AEGIS Active Attribution Engine - Initialization Sequence
INFO:     ✅ Database initialized with Attribution Engine schema
INFO:     ✅ Async processing pipeline started
INFO:     🚀 AEGIS Active Attribution Engine online
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### 3. Start Frontend

```bash
cd frontend-react
npm run dev
```

Visit: http://localhost:5173

---

## New API Endpoints

### Graph Analytics API

```bash
# Get active threats (C2 candidates)
curl http://localhost:8000/api/v1/graph/active-threats?min_score=50

# Get detailed node analysis
curl http://localhost:8000/api/v1/graph/node/192.168.1.100

# Get timing data for scatter plot
curl http://localhost:8000/api/v1/graph/timing?max_points=500

# Get threat summary
curl http://localhost:8000/api/v1/graph/summary

# Detect C2 star topologies
curl http://localhost:8000/api/v1/graph/star-topologies
```

---

## Architecture Changes

### NEW: Detection Engines

```
backend/engine/
├── graph_engine.py          # NetworkX graph analytics
├── temporal_engine.py       # Beacon detection
├── header_fingerprint.py    # HTTP client fingerprinting
└── attribution_scorer.py    # Multi-signal C2 scoring
```

### NEW: Async Pipeline

```
backend/services/
└── async_pipeline.py        # Background workers for heavy computation
```

### NEW: Graph API

```
backend/api/
└── graph_routes.py          # /api/v1/graph/* endpoints
```

### NEW: Frontend Components

```
frontend-react/src/components/ui/
├── ThreatGraph.tsx          # WebGL graph (10K+ nodes @ 60fps)
├── TimingScatter.tsx        # Beacon visualization
└── NodeInspector.tsx        # Attribution details
```

---

## Key Improvements Over Original System

| Original | Attribution Engine v2.0 |
|----------|------------------------|
| Row-by-row Isolation Forest | Graph + Temporal + Header analysis |
| No timing analysis | Beacon detection with jitter analysis |
| Synchronous API | Async processing pipeline |
| SVG rendering (~500 nodes) | WebGL rendering (10,000+ nodes) |
| Generic "anomaly score" | Explainable C2 confidence with reasons |

---

## Detection Capabilities

✅ **Beaconing behavior** - Fixed interval callbacks with jitter analysis  
✅ **Coordinated clusters** - Botnet victim groups  
✅ **Automated C2** - Tool signatures (requests, curl, etc.)  
✅ **Star topologies** - Controller → victim relationships  
✅ **Relay nodes** - High betweenness centrality  
✅ **Header spoofing** - Claims browser but headers don't match  

---

## Troubleshooting

### "NetworkX not installed"
```bash
pip install networkx==3.2.1
```

### "react-force-graph not found"
```bash
cd frontend-react
npm install react-force-graph-2d
```

### Port already in use
```bash
# Backend
uvicorn backend.main:app --port 8001

# Frontend
npm run dev -- --port 5174
```

---

## Performance Metrics

- **Graph computation**: O(V + E) for centrality
- **Beacon detection**: O(N) per node
- **API response time**: <100ms for 1000 nodes
- **Frontend rendering**: 60fps at 10,000+ nodes (WebGL)

---

## For More Details

See `IMPLEMENTATION.md` for complete technical documentation.
