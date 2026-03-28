<div align="center">
  <h1>🛡️ Project AEGIS: Cyber-Infrastructure Defense</h1>
  <p><b>Identifying the "Shadow Controller" in Nexus City’s Network</b></p>
</div>

<br>

<div align="center">
  <img src="https://img.shields.io/badge/Status-Finalist_Ready-success?style=for-the-badge" alt="Hackathon Status">
  <img src="https://img.shields.io/badge/SQLite-DB-blue?style=for-the-badge&logo=sqlite">
  <img src="https://img.shields.io/badge/FastAPI-API-009688?style=for-the-badge&logo=fastapi">
  <img src="https://img.shields.io/badge/WebSockets-Live_Stream-orange?style=for-the-badge">
</div>

---

## 🎯 The Mission
A "Shadow Controller" has infiltrated Nexus City. Our mission is to ingest live telemetry, bypass deceptive JSON masking the underlying HTTP hijackings, decode Base64 hardware serials, and adapt to data schemas rotating strictly every 10 minutes.

This repository presents the **AEGIS Command Console** — an automated ingestion pipeline that accurately maps Nexus City's threat status in real time.

## 🏗️ Architecture Design (Finalist-Grade)
Rather than executing raw batch `.csv` parsing on a faked frontend, we engineered a full-stack streaming application:

1. **Embedded Data Store:** We utilize native Python `sqlite3` to persist the 10,000+ telemetry records, 500 node mappings, and schema rotation configuration.
2. **WebSocket Streaming Engine:** Our async pipeline in `backend/services/pipeline.py` fetches pages from the database every 50ms and streams them natively to the frontend `ws://` endpoint, exactly as live logs would behave in production.
3. **Dynamic Schema Parser:** We completely bypassed the standard `.fillna()` hack. By consulting `schema_config`, our engine watches the stream and gracefully handles schema version switching (V1 → V2) natively without downtime, signaling the exact log `time_start` block.
4. **Data Visualization:** We mapped the entire City using D3.js physics mapping, backed by real-time Sleeper Latency `Chart.js` tracking processing 6000+ events natively in the browser.

## 🔪 Threat Vectors Mitigated
- 🎭 **Spoofing Detection:** JSON says `OPERATIONAL`, but HTTP Codes >400. Flagged immediately via DataFrame aggregation.
- 💣 **DDoS Flooding:** Tracks unnatural frequency spikes per Node ID comparing against regional medians.
- 💤 **Sleeper Malware:** Triggers whenever Node latency exceeds 300% of the city-wide average latency bounds.

## ⚙️ How to Boot the AEGIS Console
We have containerized the boot process perfectly into a single script.

### Option A: One-Click Boot (Windows)
Just double-click `start.bat` in the repository root.
It will automatically:
1. Ensure `FastAPI`, `Uvicorn`, and `Pandas` dependencies are installed.
2. Seed the embedded SQLite database with the processed artifacts.
3. Boot the API.
4. Launch the Dashboard in Chrome automatically.

### Option B: Manual Boot
**1. Seed Database**
```bash
python -m backend.db.seed_db
```
**2. Launch Backend Simulator**
```bash
uvicorn backend.main:app --reload
```
**3. Launch Dashboard**
```bash
cd frontend && python -m http.server 8080
```
Navigate to `http://localhost:8080` in your browser.

---

> *"Built to detect, protect, and repel."* 🛡️
