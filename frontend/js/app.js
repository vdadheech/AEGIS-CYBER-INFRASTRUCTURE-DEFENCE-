import { fetchWithRetry } from './api/client.js';
import { Tooltip } from './components/tooltip.js';
import { InspectorPanel } from './components/inspector.js';
import { CityMap } from './visualizations/city_map.js';

const API_BASE_URL = "http://127.0.0.1:8000/api";

let cityMap, inspector, tooltip;
let selectedNodeId = null;

/* ════════════════════════════════════
   LIVE CLOCK
   ════════════════════════════════════ */
function startClock() {
    const el = document.getElementById("live-clock");
    setInterval(() => {
        const now = new Date();
        el.textContent = now.toUTCString().split(" ").slice(1, 5).join(" ") + " UTC";
    }, 1000);
}

/* ════════════════════════════════════
   SCHEMA CONSOLE (collapsible drawer)
   ════════════════════════════════════ */
function initSchemaDrawer() {
    const toggle = document.getElementById("schema-toggle");
    const body   = document.getElementById("schema-body");
    const arrow  = document.getElementById("schema-arrow");
    let open = true;
    toggle.addEventListener("click", () => {
        open = !open;
        body.classList.toggle("collapsed", !open);
        arrow.textContent = open ? "▲" : "▼";
    });
}

async function fetchSchemaLogs() {
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/schema-logs`);
        const log = document.getElementById("schema-log");
        log.innerHTML = "";
        data.logs.forEach(msg => {
            const span = document.createElement("span");
            if (msg.includes("THREAT") || msg.includes("SPOOFED")) span.className = "schema-alert";
            else if (msg.includes("SCHEMA V2") || msg.includes("rotation")) span.className = "schema-warn";
            span.textContent = msg;
            log.appendChild(span);
        });
        log.scrollTop = log.scrollHeight;
    } catch (e) {
        console.error("Schema logs fetch failed", e);
    }
}

/* ════════════════════════════════════
   HEATMAP STRIP (collapsible)
   ════════════════════════════════════ */
function initHeatmapStrip() {
    const toggle = document.getElementById("heatmap-toggle");
    const strip  = document.getElementById("heatmap-strip");
    const arrow  = document.getElementById("heatmap-arrow");
    let open = true; // Start expanded so heatmap is visible

    // Start expanded
    strip.classList.add("expanded");
    arrow.textContent = "▲";

    toggle.addEventListener("click", () => {
        open = !open;
        strip.classList.toggle("expanded", open);
        arrow.textContent = open ? "▲" : "▼";

        // Trigger Chart.js resize when strip is opened
        if (open) {
            window.dispatchEvent(new Event('resize'));
        }
    });
}

/* ════════════════════════════════════
   ASSET REGISTRY TABLE
   ════════════════════════════════════ */
async function fetchAssets() {
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/assets`);
        const tbody = document.getElementById("asset-list");
        tbody.innerHTML = "";
        let threats = 0;

        data.assets.forEach(asset => {
            const row = document.createElement("tr");
            row.id = `row-${asset.node_id}`;
            const isHigh = asset.threat_score >= 2;
            const isMed  = asset.threat_score === 1;
            if (isHigh) threats++;

            const threatClass = isHigh ? "threat-high" : isMed ? "threat-warn" : "threat-low";
            const statusLabel = isHigh ? "COMPROMISED" : isMed ? "UNSTABLE" : "HEALTHY";

            row.innerHTML = `
                <td>N-${asset.node_id}</td>
                <td title="${asset.hardware_serial}">${asset.hardware_serial?.slice(0, 10)}…</td>
                <td class="${threatClass}">${asset.threat_score}</td>
                <td class="${threatClass}">${statusLabel}</td>
            `;
            tbody.appendChild(row);
        });

        // Update threat counter
        document.getElementById("tc-active").textContent = threats;
    } catch (e) {
        console.error("Asset fetch failed", e);
    }
}

/* ════════════════════════════════════
   FORENSIC CITY MAP
   ════════════════════════════════════ */
async function renderForensicCityMap() {
    try {
        const data = await fetchWithRetry(`${API_BASE_URL}/city-map`);

        const pipelineNodes = data.nodes.map(n => ({
            id: n.node_serial,
            original_data: n
        }));

        const pipelineLinks = [];
        for (let i = 0; i < pipelineNodes.length; i++) {
            if (i > 0) pipelineLinks.push({ source: pipelineNodes[i].id, target: pipelineNodes[i - 1].id });
            if (i % 5 === 0 && i + 2 < pipelineNodes.length)
                pipelineLinks.push({ source: pipelineNodes[i].id, target: pipelineNodes[i + 2].id });
        }

        cityMap.update({ nodes: pipelineNodes, links: pipelineLinks });

    } catch (err) {
        console.error("City map fetch failed", err);
        document.getElementById("d3-city-map").innerHTML =
            `<div style="color:var(--neon-red);font-family:monospace;padding:40px;text-align:center;font-size:0.8rem;">
                ⚠ DATA CONNECTION SEVERED<br>FORENSIC MAP OFFLINE
             </div>`;
    }
}

/* ════════════════════════════════════
   INSPECTOR PANEL WIRING
   ════════════════════════════════════ */
function initInspector() {
    const panel = document.getElementById("node-inspector");
    document.getElementById("inspector-close").addEventListener("click", () => {
        panel.classList.remove("open");
        // Deselect row
        document.querySelectorAll("#asset-list tr.selected").forEach(r => r.classList.remove("selected"));
    });
}

function onNodeClick(nodeData) {
    const panel = document.getElementById("node-inspector");
    panel.classList.add("open");

    const isQuarantined = nodeData.is_quarantined === 1;
    let badgeClass = "badge-green", label = "HEALTHY";

    if (isQuarantined) {
        badgeClass = "badge-quarantined";
        label = "QUARANTINED";
    } else if (nodeData.status_color === "RED") {
        badgeClass = "badge-red";
        label = "COMPROMISED";
    } else if (nodeData.status_color === "YELLOW") {
        badgeClass = "badge-yellow";
        label = "UNSTABLE";
    }

    const flags = [
        nodeData.spoof_flag  ? "⚠ SPOOFING"  : null,
        nodeData.ddos_flag   ? "⚠ DDoS"       : null,
        nodeData.malware_flag ? "⚠ MALWARE"  : null
    ].filter(Boolean).join("   ") || "None";

    const canQuarantine = nodeData.status_color === "RED" && !isQuarantined;
    const buttonText = isQuarantined ? "[ NODE ISOLATED ]" : "[ QUARANTINE NODE ]";

    panel.querySelector(".inspector-content").innerHTML = `
        <span class="classification-badge ${badgeClass}">${label}</span>
        <div class="inspector-detail">
            <label>Node ID</label>
            <span>N-${nodeData.node_id || "—"}</span>
        </div>
        <div class="inspector-detail">
            <label>Node Serial</label>
            <span>${nodeData.node_serial || "—"}</span>
        </div>
        <div class="inspector-detail">
            <label>Location</label>
            <span>${nodeData.location || "—"}</span>
        </div>
        <div class="inspector-detail">
            <label>HTTP Status</label>
            <span class="${badgeClass.replace("badge-", "threat-")}">${nodeData.http_status || "—"}</span>
        </div>
        <div class="inspector-detail">
            <label>Response Time</label>
            <span>${nodeData.response_time ? nodeData.response_time.toFixed(1) + " ms" : "—"}</span>
        </div>
        <div class="inspector-detail">
            <label>Active Threats</label>
            <span class="${label === "COMPROMISED" ? "threat-high" : "threat-low"}">${flags}</span>
        </div>
        <button class="btn-quarantine ${isQuarantined ? 'quarantined' : ''}" id="btn-q" ${!canQuarantine ? "disabled" : ""}>
            ${buttonText}
        </button>
    `;

    const btn = document.getElementById("btn-q");
    if (btn && canQuarantine) {
        btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.textContent = "[ ISOLATING... ]";

            try {
                const response = await fetch(`${API_BASE_URL}/nodes/${nodeData.node_id}/quarantine`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const result = await response.json();
                    btn.textContent = "[ NODE ISOLATED ]";
                    btn.classList.add("quarantined");

                    // Update the badge
                    const badge = panel.querySelector(".classification-badge");
                    badge.className = "classification-badge badge-quarantined";
                    badge.textContent = "QUARANTINED";

                    // Refresh the map to show updated status
                    await renderForensicCityMap();

                    console.log(`Quarantine success: ${result.message}`);
                } else {
                    const error = await response.json();
                    btn.textContent = "[ QUARANTINE FAILED ]";
                    console.error("Quarantine failed:", error.detail);
                    setTimeout(() => {
                        btn.textContent = "[ QUARANTINE NODE ]";
                        btn.disabled = false;
                    }, 2000);
                }
            } catch (err) {
                console.error("Quarantine API error:", err);
                btn.textContent = "[ CONNECTION ERROR ]";
                setTimeout(() => {
                    btn.textContent = "[ QUARANTINE NODE ]";
                    btn.disabled = false;
                }, 2000);
            }
        });
    }
}

/* ════════════════════════════════════
   BOOT SEQUENCE
   ════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
    startClock();
    initSchemaDrawer();
    initHeatmapStrip();

    tooltip  = new Tooltip("aegis-tooltip");
    inspector = new InspectorPanel("node-inspector");
    cityMap  = new CityMap("d3-city-map", {
        onHover:    (event, data) => tooltip.show(event, data),
        onHoverOut: () => tooltip.hide(),
        onClick:    (data) => onNodeClick(data),
    });

    initInspector();

    // Initial data load
    fetchAssets();
    fetchSchemaLogs();
    renderForensicCityMap();

    // Live polling every 5 seconds
    setInterval(() => {
        fetchAssets();
        renderForensicCityMap();
    }, 5000);

    // Schema console refresh every 30s
    setInterval(fetchSchemaLogs, 30000);
});