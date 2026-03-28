# 🛡️ Project AEGIS: Cyber-Infrastructure Defense

![FastAPI](https://img.shields.io/badge/FastAPI-Production-green?logo=fastapi)
![SQLite](https://img.shields.io/badge/Database-SQLite-blue?logo=sqlite)
![WebSockets](https://img.shields.io/badge/Streaming-WebSockets-orange)
![ML](https://img.shields.io/badge/Machine%20Learning-Isolation%20Forest-red)
![Tests](https://img.shields.io/badge/Tests-120%2B%20Assertions-success)
![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen)

---

## 🚨 Mission Brief

**Nexus City is under attack.**

A rogue entity—**“Shadow Controller”**—has infiltrated critical infrastructure using **deceptive payloads, schema mutations, and stealth malware**.

🛡️ **Project AEGIS** is a real-time **Security Operations Center (SOC) Command Console** built to:

- Stream live telemetry
- Adapt to rotating schemas
- Detect anomalies using ML
- Enable instant threat containment

---

## 🎥 Live Demo

> ⚠️ Replace these links with your actual demo assets

### 🔴 Full System Demo
![Demo GIF](assets/demo.gif)

---

### 🖼️ Dashboard Screenshots

| Forensic Map | Heatmap | Asset Registry |
|-------------|--------|----------------|
| ![](assets/map.png) | ![](assets/heatmap.png) | ![](assets/table.png) |

---

## ✨ Why This is a Finalist-Grade Submission

🚀 This is not a static dashboard — it's a **production-grade cyber defense system**.

- ⚡ Real-time **WebSocket streaming (50ms)**
- 🧠 **Dynamic schema switching (V1 → V2)**
- 🤖 **Machine Learning anomaly detection**
- 🎯 **Live quarantine system (interactive)**
- 🧪 **120+ tests, 100% passing**
- 🏗️ Clean, scalable architecture

---

## 🏗️ Architecture Overview
       ┌────────────────────────────┐
       │        Frontend UI         │
       │ (D3.js + Chart.js + JS)   │
       └────────────┬──────────────┘
                    │ WebSocket
                    ▼
       ┌────────────────────────────┐
       │      FastAPI Backend       │
       │  REST + Streaming Engine   │
       └────────────┬──────────────┘
                    │
    ┌───────────────┼────────────────┐
    ▼               ▼                ▼
    ────────────┐ ┌──────────────┐ ┌──────────────┐
     │ SQLite DB │ │ ML Engine │ │ Schema Parser│
     │ Telemetry │ │ Isolation │ │ Dynamic V1/V2│
       │ │ │ Forest Model │ │ Switching │
    └────────────┘ └──────────────┘ └──────────────┘
    
---

## ⚙️ Core Engineering Highlights

### 🔄 Real-Time Streaming Engine
- Fetches data every **50ms**
- Streams via **WebSockets**
- Simulates **production-grade live logs**

---

### 🧠 Dynamic Schema Parser
- Handles schema rotation every **10 minutes**
- No `.fillna()` hacks
- **Zero downtime**

---

### 🤖 Machine Learning Integration
- Isolation Forest (scikit-learn)
- Detects **multi-variate anomalies**
- Fallback to heuristics if needed

---

### 🧪 Production-Ready Engineering
- Type-safe code
- Pydantic validation
- DB migrations
- 120+ test assertions
- 100% passing

---

## 🛑 Threat Vectors Mitigated

### 🕵️ Spoofing
- Detects mismatch:
  - JSON: `"OPERATIONAL"`
  - HTTP: `>= 400`

---

### 🌊 DDoS Flooding
- Detects abnormal request spikes
- Compares with **network medians**

---

### 🧬 Sleeper Malware
- Trigger: latency > **300% baseline**
- Detected via ML

---

## 🖥️ Dashboard & Workflow

### 🌐 Forensic City Map
- D3.js physics-based visualization

| Status | Meaning |
|------|--------|
| 🟢 Green | Healthy |
| 🟡 Yellow | DDoS / Spoofing |
| 🔴 Red | Compromised |
| 🟣 Purple | Quarantined |

---

### ⚡ Interactive Quarantine System

**Flow:**

1. Click 🔴 node  
2. Open inspector  
3. Click **[ QUARANTINE NODE ]**  
4. API call:
     POST /api/nodes/{id}/quarantine

5. DB updates  
6. Node turns 🟣 instantly (WebSocket)

---

### 🔥 Sleeper Heatmap
- Chart.js visualization
- Tracks anomaly spikes

---

### 📊 Asset Registry
- Live updating table
- Decoded serials
- Threat scores

---

## 🧰 Tech Stack

**Backend**
- Python, FastAPI, Uvicorn
- SQLite3, Pandas

**ML**
- scikit-learn (Isolation Forest)

**Frontend**
- JavaScript, D3.js, Chart.js

**Architecture**
- REST + WebSocket

---

## 📁 Project Structure
aegis-console/
├── backend/
├── frontend/
├── data/
├── logs/
├── tests/
├── aegis/
├── .env.example
├── start.bat
└── README.md

✅ Updated Manual Setup

Replace your setup commands with this version:

### 🛠️ Manual Setup

#### 1. Install dependencies

cd backend
pip install -r requirements.txt


#### 2. Seed database

python -m db.seed_db


#### 3. Start detection engine

python -m engine.detection


#### 4. Run backend

uvicorn main:app --reload


#### 5. Start frontend

cd ../frontend
python -m http.server 8080


#### 6. Open browser

http://localhost:8080

⚠️ Why this matters (judges notice this)
❌ Wrong path → project fails to run instantly
✅ Correct structure → shows production awareness
✅ Clean commands → shows developer experience maturity
💡 Optional (even better)

If you want to look extra professional, add this line under setup:

> ⚠️ All backend commands must be run from the `backend/` directory.

If you want, I can next:

Fix your start.bat according to this structure
Or review your actual repo layout screenshot to ensure everything is perfect for judges 🚀
now give me architecture

Perfect — this is where you can really impress judges. A strong architecture section shows engineering depth, not just features.

Here’s a clean, GitHub-ready Architecture section you can paste directly into your README:

## 🏗️ System Architecture

Project AEGIS follows a **real-time, event-driven architecture** combining REST APIs with WebSocket streaming to simulate a production-grade Security Operations Center (SOC).

---

### 🔄 High-Level Architecture

               ┌────────────────────────────┐
               │        Frontend UI         │
               │  (D3.js + Chart.js + JS)  │
               └────────────┬──────────────┘
                            │
             ┌──────────────┴──────────────┐
             │                             │
     REST API Calls                 WebSocket Stream
 (User Actions / Control)        (Live Telemetry Feed)
             │                             │
             ▼                             ▼
    ┌──────────────────────────────────────────┐
    │           FastAPI Backend                │
    │  - API Layer (Routes)                   │
    │  - Streaming Engine (50ms loop)         │
    │  - Schema Adapter (V1 ↔ V2)             │
    │  - Threat Detection Engine              │
    └────────────┬──────────────┬────────────┘
                 │              │
                 ▼              ▼
     ┌────────────────┐   ┌────────────────────┐
     │   SQLite DB    │   │   ML Model Engine  │
     │ (Telemetry)    │   │ Isolation Forest   │
     └────────────────┘   └────────────────────┘

---

### ⚙️ Data Flow Pipeline

1. **Telemetry Ingestion**
   - Data is stored in SQLite
   - Simulates real-world infrastructure logs

2. **Streaming Engine**
   - Fetches records every **50ms**
   - Pushes data via **WebSockets** to frontend

3. **Dynamic Schema Parsing**
   - Detects schema version (V1 / V2)
   - Normalizes payloads **without downtime**

4. **Threat Detection Layer**
   - Rule-based detection (Spoofing, DDoS)
   - ML-based anomaly detection (Isolation Forest)

5. **Frontend Visualization**
   - Live updates on:
     - Node map (D3.js)
     - Heatmaps (Chart.js)
     - Asset registry

6. **User Interaction Loop**
   - User triggers actions (e.g., quarantine)
   - REST API updates DB
   - Changes broadcast instantly via WebSocket

---

### 🧠 Backend Component Breakdown

#### 🔹 API Layer (FastAPI)
- Handles REST endpoints:
  - `GET /api/nodes`
  - `POST /api/nodes/{id}/quarantine`
- Uses **Pydantic models** for validation

---

#### 🔹 Streaming Engine
- Core real-time loop (50ms interval)
- Reads paginated data from SQLite
- Broadcasts updates to all connected clients

---

#### 🔹 Schema Adapter
- Detects schema drift:
  - Version 1 → basic fields
  - Version 2 → extended/renamed fields
- Ensures **backward compatibility**

---

#### 🔹 Threat Detection Engine

**Rule-Based Detection:**
- Spoofing → JSON vs HTTP mismatch
- DDoS → frequency spike detection

**ML-Based Detection:**
- Isolation Forest (unsupervised)
- Detects:
  - Latency anomalies
  - Behavioral deviations

---

### 🌐 Frontend Architecture

#### 🔹 D3.js Visualization Engine
- Physics-based node graph
- Real-time updates via WebSocket

#### 🔹 Chart.js Analytics Layer
- Latency heatmaps
- Trend visualization

#### 🔹 State Synchronization
- WebSocket keeps UI in sync with backend
- No manual refresh required

---

### 🔐 Real-Time Quarantine Flow


User क्लिक करता है 🔴 Node
↓
Inspector Panel Open
↓
[ QUARANTINE NODE ]
↓
POST /api/nodes/{id}/quarantine
↓
Database Updated
↓
WebSocket Broadcast
↓
Node turns 🟣 (Instant Feedback)


---

### 🚀 Key Architectural Advantages

- ⚡ **Low Latency (50ms streaming)**
- 🔄 **Zero-downtime schema evolution**
- 🧠 **Hybrid detection (Rules + ML)**
- 📡 **Event-driven updates (WebSocket)**
- 🧪 **Testable and modular design**

---

### 🏁 Summary

AEGIS is designed as a **scalable, real-time cyber defense system** that mimics:

- Live SOC environments  
- Streaming data pipelines  
- Adaptive threat intelligence systems  

> 🛡️ *Built for speed, resilience, and real-world complexity.*
💡 Pro Tip (Judge Psychology)

This section signals:

You understand system design
You didn’t just “build features”
You can think like a backend + infra engineer

If you want next level:

I can convert this into a clean architecture diagram image (PNG)
Or help you explain this in 1-minute interview answer 🎯
project architecture

Here’s a crisp, judge-impressing “Project Architecture” section — cleaner, more visual, and focused on system design clarity. You can paste this directly into your README.

## 🏗️ Project Architecture

Project AEGIS is built as a **real-time, event-driven cyber defense system** that combines **streaming, machine learning, and interactive control loops**.

---

## 🔷 Architecture Overview

              ┌────────────────────────────┐
              │        Frontend UI         │
              │  D3.js • Chart.js • JS     │
              └────────────┬──────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼

REST API (Control) WebSocket (Live Feed) Static Assets
│ │
└──────────────┬───────┘
▼
┌────────────────────────────┐
│ FastAPI Backend │
│---------------------------│
│ • API Layer │
│ • Streaming Engine (50ms) │
│ • Schema Adapter │
│ • Threat Detection Engine │
└────────────┬──────────────┘
│
┌──────────────┼──────────────┐
▼ ▼ ▼
┌────────────┐ ┌──────────────┐ ┌──────────────┐
│ SQLite DB │ │ ML Engine │ │ Rule Engine │
│ Telemetry │ │ Isolation │ │ Spoof/DDoS │
│ Storage │ │ Forest │ │ Detection │
└────────────┘ └──────────────┘ └──────────────┘


---

## 🔄 End-to-End Data Flow


[ SQLite DB ]
│
▼
[ Streaming Engine ] (fetch every 50ms)
│
▼
[ Schema Adapter ] (V1 ↔ V2 normalization)
│
▼
[ Threat Detection Engine ]
├── Rule-Based Detection
└── ML (Isolation Forest)
│
▼
[ WebSocket Broadcast ]
│
▼
[ Frontend Dashboard ]
│
▼
[ User Action → REST API → DB Update → WebSocket Sync ]


---

## ⚙️ Core Components

### 🔹 1. Streaming Engine
- Polls database every **50ms**
- Simulates **real-world telemetry streams**
- Pushes updates via WebSocket

---

### 🔹 2. Dynamic Schema Adapter
- Handles **schema rotation every 10 minutes**
- Supports:
  - V1 → legacy format  
  - V2 → extended format  
- Ensures **zero downtime compatibility**

---

### 🔹 3. Threat Detection Layer

#### Rule-Based Engine
- Spoofing detection (payload mismatch)
- DDoS detection (frequency spikes)

#### ML Engine
- Isolation Forest (unsupervised)
- Detects:
  - Latency anomalies
  - Behavioral deviations

---

### 🔹 4. API Layer (FastAPI)
- REST endpoints for control actions
- Example:

POST /api/nodes/{id}/quarantine

- Uses **Pydantic validation**

---

### 🔹 5. Frontend Visualization Layer

- **D3.js** → Real-time node graph
- **Chart.js** → Heatmaps & analytics
- **WebSocket client** → instant updates

---

## ⚡ Real-Time Feedback Loop


User clicks compromised node (🔴)
↓
Inspector Panel opens
↓
[ QUARANTINE NODE ]
↓
REST API Call
↓
Database Updated
↓
WebSocket Broadcast
↓
UI Updates instantly (🟣)


---

## 🚀 Architectural Strengths

- ⚡ Ultra-low latency streaming (50ms)
- 🔄 Schema-resilient ingestion pipeline
- 🧠 Hybrid detection (Rules + ML)
- 📡 Event-driven (WebSocket-based)
- 🧪 Fully testable modular backend

---

## 🏁 Summary

AEGIS architecture is designed to mimic **real-world SOC systems**:

- Continuous telemetry ingestion  
- Adaptive data processing  
- Intelligent anomaly detection  
- Instant response & containment  

> 🛡️ *Engineered for real-time cyber defense at scale.*
🔥 If you want to go even further

I can:

Convert this into a clean PNG architecture diagram (for README)
Or create a 1-slide architecture explanation for presentations
Or help you explain this in interviews (very useful 👀)

Just tell me 👍
---

## 🚀 Getting Started

### ⚡ One-Click (Windows)
start.bat


---

### 🛠️ Manual Setup
pip install -r requirements.txt
python -m backend.db.seed_db
python -m backend.engine.detection
uvicorn backend.main:app --reload

cd frontend
python -m http.server 8080


Open → http://localhost:8080

---

## 🧪 Running Tests
pytest tests/ -v


✔ 120+ assertions  
✔ 100% passing  

---

## 🏆 What Makes AEGIS Stand Out

- Real-time streaming (not static logs)
- ML-powered anomaly detection
- Dynamic schema resilience
- Interactive cyber response system
- Production-level testing

---

## 🔮 Future Enhancements

- RBAC authentication
- Kafka-based streaming
- Multi-city scaling
- Deep learning anomaly models

---

## 🏁 Conclusion

AEGIS is not just a dashboard —  
it is a **live cyber-defense system**.

> 🛡️ **Detect. Adapt. Defend.**
