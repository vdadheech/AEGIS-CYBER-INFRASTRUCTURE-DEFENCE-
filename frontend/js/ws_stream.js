/**
 * ws_stream.js — Live WebSocket telemetry consumer.
 * Connects to the AEGIS backend WebSocket and animates:
 *   - The Sleeper Heatmap (live data points)
 *   - The Dynamic Schema Console (real rotation events)
 */

const WS_URL = "ws://127.0.0.1:8000/ws/telemetry";

// --- State ---
let liveChart = null;            // Chart.js reference (set by heatmap.js via initLiveChart)
const MAX_LIVE_POINTS = 300;     // Keep last N points visible on heatmap

/**
 * Called by heatmap.js after it creates the Chart.js instance,
 * so we can push live points into it.
 */
function registerLiveChart(chart) {
    liveChart = chart;
}

function appendSchemaConsoleLog(message, isWarning = false) {
    const logBox = document.getElementById("schema-log");
    if (!logBox) return;
    const line = document.createElement("span");
    line.style.color = isWarning ? "#ffcc00" : "#66fcf1";
    line.textContent = message;
    logBox.appendChild(line);
    logBox.appendChild(document.createElement("br"));
    logBox.scrollTop = logBox.scrollHeight;
}

function startLiveStream() {
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        appendSchemaConsoleLog("> WebSocket connected. Live telemetry stream starting...");
    };

    socket.onmessage = (event) => {
        let msg;
        try {
            msg = JSON.parse(event.data);
        } catch {
            return;
        }

        if (msg.event === "log") {
            // Push point to the live heatmap chart
            if (liveChart) {
                const dataset = liveChart.data.datasets[0];
                dataset.data.push({ x: msg.log_id, y: msg.response_time_ms });

                // Trim to keep chart performant
                if (dataset.data.length > MAX_LIVE_POINTS) {
                    dataset.data.shift();
                }
                liveChart.update("none"); // "none" disables animation for smooth streaming
            }

        } else if (msg.event === "schema_change") {
            // Flash a schema rotation warning in the console
            appendSchemaConsoleLog(
                `> ⚠ SCHEMA ROTATION AT LOG ${msg.log_id}: V${msg.version} ACTIVE → KEY '${msg.active_column}'`,
                true   // yellow highlight
            );

        } else if (msg.event === "stream_complete") {
            appendSchemaConsoleLog("> Stream replay complete. All 10,000 packets processed.");
        }
    };

    socket.onerror = () => {
        appendSchemaConsoleLog("> WebSocket error. Is the backend running?", true);
    };

    socket.onclose = () => {
        appendSchemaConsoleLog("> Connection closed.");
    };
}

document.addEventListener("DOMContentLoaded", startLiveStream);
