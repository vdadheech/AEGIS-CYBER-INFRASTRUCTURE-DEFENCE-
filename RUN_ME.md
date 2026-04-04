# 🚀 RUN THIS TO SEE THE CHANGES

## OPTION 1: Quick Demo (Fastest - No Server Required)

### Just run this command in your terminal:

```bash
cd K:\aegis-console\aegis-console
python demo_attribution_engine.py
```

**OR** double-click: `run_demo.bat`

### What you'll see:
```
📦 Installing NetworkX...
🔧 Initializing detection engines...
🚨 Simulating C2 traffic...

🎯 ATTRIBUTION RESULTS:

🔴 10.0.0.42 (CRITICAL - 87.3%)
   Signal Breakdown:
     temporal     [████████████████░░░░] 85.0% (weight: 35%)
     header       [███████████████░░░░░] 72.0% (weight: 25%)
     graph        [██████████░░░░░░░░░░] 48.0% (weight: 25%)
   
   Primary Indicators:
     • Beacon pattern: beacon @ 300ms
     • Rigid timing (automation signature)
     • Non-browser HTTP fingerprint
   
   Recommended Actions:
     → IMMEDIATE: Isolate node from network
     → Capture full packet traces

🔴 10.0.0.87 (CRITICAL - 84.1%)
   [Similar detailed breakdown...]

🟢 192.168.1.50 (LOW - 12.5%)
   Normal human traffic pattern
```

---

## OPTION 2: Full System with UI

### Step 1: Install Dependencies
```bash
cd K:\aegis-console\aegis-console

# Backend
pip install networkx==3.2.1

# Frontend
cd frontend-react
npm install
```

### Step 2: Start Backend
```bash
cd K:\aegis-console\aegis-console
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

**Expected output:**
```
INFO: 🛡️ AEGIS Active Attribution Engine - Initialization
INFO: ✅ Database initialized with Attribution Engine schema
INFO: ✅ Async processing pipeline started
INFO: 🚀 AEGIS Active Attribution Engine online
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 3: Test New API Endpoints (New Terminal)

```bash
# Get active threats
curl http://localhost:8000/api/v1/graph/active-threats

# Get threat summary
curl http://localhost:8000/api/v1/graph/summary

# Health check (see new capabilities)
curl http://localhost:8000/
```

### Step 4: Start Frontend (Optional)
```bash
cd K:\aegis-console\aegis-console\frontend-react
npm run dev
```

Visit: http://localhost:5173

---

## OPTION 3: Test Individual Components

### Test Graph Engine Only:
```python
python -c "
from backend.engine.graph_engine import GraphAnalyticsEngine
import time

engine = GraphAnalyticsEngine()

# Add some interactions
base = time.time() * 1000
engine.add_interaction('10.0.0.42', '/api/cmd', base)
engine.add_interaction('10.0.0.42', '/api/cmd', base + 300)
engine.add_interaction('10.0.0.42', '/api/cmd', base + 600)

# Compute metrics
metrics = engine.compute_metrics()
for node, m in metrics.items():
    print(f'{node}: centrality={m.degree_centrality:.3f}')
"
```

### Test Temporal Engine Only:
```python
python -c "
from backend.engine.temporal_engine import TemporalFingerprintEngine
import time

engine = TemporalFingerprintEngine()

# Simulate beacon (fixed intervals)
base = time.time() * 1000
for i in range(10):
    engine.record_request('10.0.0.42', base + i * 300)

# Analyze
profile = engine.analyze_node('10.0.0.42')
print(f'Jitter: {profile.jitter:.3f}')
print(f'Is Beacon: {profile.is_beacon}')
print(f'Pattern: {profile.pattern_type}')
"
```

### Test Header Engine Only:
```python
python -c "
from backend.engine.header_fingerprint import HeaderFingerprintEngine

engine = HeaderFingerprintEngine()

# Analyze suspicious headers
headers = {
    'User-Agent': 'python-requests/2.28.0',
    'Accept-Encoding': 'gzip, deflate',
    'Accept': '*/*',
    'Connection': 'keep-alive'
}

fp = engine.analyze_request(
    '10.0.0.42', 
    headers,
    header_order=['User-Agent', 'Accept-Encoding', 'Accept', 'Connection']
)

print(f'Is Suspicious: {fp.is_suspicious}')
print(f'Detected Client: {fp.detected_client}')
print(f'Anomaly Reasons: {fp.anomaly_reasons}')
"
```

---

## What Changed - Quick Summary

### NEW Backend Engines (4 files):
1. **graph_engine.py** - NetworkX graph analytics
2. **temporal_engine.py** - Beacon detection
3. **header_fingerprint.py** - HTTP fingerprinting
4. **attribution_scorer.py** - Multi-signal C2 scoring

### NEW API Endpoints (8 routes):
- `/api/v1/graph/active-threats` - Main threat graph
- `/api/v1/graph/node/{id}` - Node details
- `/api/v1/graph/timing` - Timing data
- `/api/v1/graph/summary` - Threat counts
- ... and 4 more

### NEW Frontend Components (3 files):
- **ThreatGraph.tsx** - WebGL graph (10K+ nodes @ 60fps)
- **TimingScatter.tsx** - Beacon visualization
- **NodeInspector.tsx** - Attribution panel

### Enhanced Database:
- 11 new columns for attribution
- 3 new tables (graph_metrics, fingerprint_registry, etc.)
- 6 performance indexes

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'networkx'"
```bash
pip install networkx==3.2.1
```

### "ModuleNotFoundError: No module named 'backend'"
```bash
# Make sure you're in the right directory
cd K:\aegis-console\aegis-console
python demo_attribution_engine.py
```

### "Port 8000 already in use"
```bash
# Kill existing process
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
uvicorn backend.main:app --port 8001
```

---

## Next Steps After Demo

1. **Read IMPLEMENTATION.md** - Full technical documentation
2. **Read CHANGES.md** - Before/after comparison
3. **Explore the code** - All new files are documented
4. **Run the full UI** - See WebGL graph in action

---

## Questions?

- Architecture details → See `IMPLEMENTATION.md`
- What changed → See `CHANGES.md`
- Quick start guide → See `QUICKSTART.md`
- API documentation → See `backend/api/graph_routes.py` docstrings
