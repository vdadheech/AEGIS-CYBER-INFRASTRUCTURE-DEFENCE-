from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router
from backend.db.database import init_db
from backend.services.pipeline import stream_telemetry
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="AEGIS Defense Console API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.on_event("startup")
def on_startup():
    """Ensure all database tables exist when the server boots."""
    init_db()


@app.get("/")
def health_check():
    return {"status": "AEGIS Server is ONLINE and monitoring."}


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
    except Exception as e:
        logger.error(f"WebSocket error: {e}")