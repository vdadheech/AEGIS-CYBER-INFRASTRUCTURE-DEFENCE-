# 🔧 QUICK FIX - Get Graphs Showing

Your UI is empty because the database has no data. Here's how to fix it:

## Step 1: Stop the Backend Server

Press `Ctrl+C` in the terminal where `uvicorn` is running.

## Step 2: Seed the Database

Run this command:

```bash
python -m backend.db.seed_db
```

**OR** double-click: `seed_database.bat`

You should see:
```
[INFO] Seeded 10000 rows into telemetry_logs.
[INFO] Seeded 100 rows into node_registry.
[INFO] Seeded 3 rows into schema_versions.
[INFO] SUCCESS: AEGIS database fully seeded.
```

## Step 3: Restart the Backend

```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

## Step 4: Refresh the Frontend

Refresh your browser at http://localhost:5173

You should now see:
- ✅ Nodes on the Forensic City Map
- ✅ Assets in the Asset Registry
- ✅ Data in the Latency Timeline

---

## About the Attribution Engine

The **new Attribution Engine** I built has separate components that show:

1. **WebGL Threat Graph** - Interactive graph showing C2 suspects
2. **Timing Scatter Plot** - Beacon detection visualization  
3. **Node Inspector** - Detailed C2 attribution breakdown

These are in:
- `frontend-react/src/components/ui/ThreatGraph.tsx`
- `frontend-react/src/components/ui/TimingScatter.tsx`
- `frontend-react/src/components/ui/NodeInspector.tsx`

To integrate them into your main dashboard, you'd need to:
1. Import these components in your main App.tsx
2. Add a new "Attribution" tab
3. Use the `useAttributionEngine` hook to fetch data

---

## Quick Test of New API

Once backend is running:

```bash
# Get threat summary (new endpoint)
curl http://localhost:8000/api/v1/graph/summary

# Check health (shows new capabilities)
curl http://localhost:8000/

# Get active threats
curl http://localhost:8000/api/v1/graph/active-threats
```

These return data from the **Attribution Engine** (graph analytics, beacon detection, etc.)

---

## Summary

**Current UI (legacy):**  
Shows basic threat detection from Isolation Forest

**New Attribution Engine:**  
Adds C2 detection via graph/temporal/header analysis (components created but not yet integrated into main dashboard)

The **demo script** (`demo_attribution_engine.py`) already showed you the Attribution Engine working - that was the detection logic in action!
