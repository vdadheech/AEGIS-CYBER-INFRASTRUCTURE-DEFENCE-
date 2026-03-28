/**
 * heatmap.js — Sleeper Heatmap (Latency Intelligence Timeline)
 * Pre-seeded from /api/heatmap on load. Live updates pushed by ws_stream.js.
 */

const API_BASE = "http://127.0.0.1:8000/api";

async function initHeatmap() {
    const ctx = document.getElementById('heatmapChart');
    if (!ctx) return;

    // Fetch initial data immediately so the chart is never blank
    let initialData = [];
    try {
        const resp = await fetch(`${API_BASE}/heatmap`);
        const json = await resp.json();
        // Show last 300 points for a clean timeline
        const slice = json.heatmap.slice(-300);
        initialData = slice.map(p => ({ x: p.log_id, y: p.response_time_ms }));
    } catch (e) {
        console.warn("Heatmap pre-seed failed — chart will start empty.", e);
    }

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Latency (ms)',
                data: initialData,
                borderColor: '#f43f5e',
                backgroundColor: 'rgba(244, 63, 94, 0.05)',
                borderWidth: 1.5,
                pointRadius: 0,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            parsing: { xAxisKey: 'x', yAxisKey: 'y' },
            scales: {
                x: { display: false },
                y: {
                    grid:  { color: 'rgba(56, 189, 248, 0.06)' },
                    ticks: { color: '#64748b', font: { size: 10 } },
                    border: { color: 'transparent' }
                }
            },
            plugins: {
                legend: { labels: { color: '#64748b', font: { size: 11 } } }
            }
        }
    });

    // Register with WebSocket stream for live points
    if (typeof registerLiveChart === 'function') {
        registerLiveChart(chart);
    }
}

document.addEventListener("DOMContentLoaded", initHeatmap);