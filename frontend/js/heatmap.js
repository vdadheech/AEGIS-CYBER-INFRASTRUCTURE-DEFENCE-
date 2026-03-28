/**
 * heatmap.js — Sleeper Heatmap (Latency Intelligence Timeline)
 * Visualizes API response time anomalies that indicate hidden sleeper malware.
 */

const API_BASE = "http://127.0.0.1:8000/api";
let heatmapChart = null;

function generateRealisticLatencyData() {
    const labels = [];
    const values = [];
    const baseLatency = 45;

    for (let i = 0; i < 200; i++) {
        labels.push(i);
        let latency = baseLatency + (Math.random() * 15 - 7.5);

        // Periodic sleeper malware spikes
        if (i % 28 === 14 || i % 35 === 18) {
            latency = 180 + Math.random() * 120;
        }

        // Medium anomalies
        if (i % 19 === 9) {
            latency = 90 + Math.random() * 50;
        }

        // Major attack burst (sleeper malware coordinated activation)
        if (i >= 110 && i <= 125) {
            latency = 250 + Math.random() * 150;
        }

        // Another spike cluster
        if (i >= 160 && i <= 168) {
            latency = 200 + Math.random() * 100;
        }

        values.push(Math.max(15, latency));
    }

    return { labels, values };
}

async function initHeatmap() {
    const canvas = document.getElementById('heatmapChart');
    if (!canvas) {
        console.error("Heatmap canvas not found!");
        return;
    }

    const ctx = canvas.getContext('2d');

    // Ensure the strip is expanded
    const strip = document.getElementById("heatmap-strip");
    if (strip && !strip.classList.contains("expanded")) {
        strip.classList.add("expanded");
    }

    let chartLabels = [];
    let chartValues = [];

    try {
        const resp = await fetch(`${API_BASE}/heatmap`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const slice = json.heatmap.slice(-200);
        chartLabels = slice.map(p => p.log_id);
        chartValues = slice.map(p => p.response_time_ms);
        console.log(`Heatmap: loaded ${chartValues.length} points from API`);
    } catch (e) {
        console.warn("Heatmap API unavailable — using demo data");
        const demoData = generateRealisticLatencyData();
        chartLabels = demoData.labels;
        chartValues = demoData.values;
    }

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(248, 113, 113, 0.6)');
    gradient.addColorStop(0.4, 'rgba(251, 191, 36, 0.3)');
    gradient.addColorStop(1, 'rgba(52, 211, 153, 0.1)');

    heatmapChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Response Latency (ms)',
                data: chartValues,
                borderColor: '#ef4444',
                backgroundColor: gradient,
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#ef4444',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                tension: 0.35,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(100, 116, 139, 0.08)',
                        drawTicks: false
                    },
                    ticks: { display: false },
                    title: {
                        display: true,
                        text: 'Log Entries (Time →)',
                        color: '#64748b',
                        font: { size: 11, weight: '500' },
                        padding: { top: 8 }
                    }
                },
                y: {
                    display: true,
                    min: 0,
                    suggestedMax: 400,
                    grid: {
                        color: 'rgba(100, 116, 139, 0.08)',
                        drawTicks: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        padding: 8,
                        callback: (val) => val + ' ms'
                    },
                    title: {
                        display: true,
                        text: 'Latency',
                        color: '#64748b',
                        font: { size: 11, weight: '500' }
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        boxWidth: 14,
                        boxHeight: 14,
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(100, 116, 139, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 6,
                    padding: 12,
                    displayColors: false,
                    titleFont: { size: 12, weight: '600' },
                    bodyFont: { size: 11 },
                    callbacks: {
                        title: (items) => `Log Entry #${items[0].label}`,
                        label: (item) => {
                            const val = item.parsed.y;
                            let status = '✓ Normal Range';
                            let color = '#34d399';
                            if (val > 150) {
                                status = '⚠ SLEEPER ANOMALY DETECTED';
                                color = '#f87171';
                            } else if (val > 80) {
                                status = '◐ Elevated Latency';
                                color = '#fbbf24';
                            }
                            return [
                                `Latency: ${val.toFixed(1)} ms`,
                                '',
                                status
                            ];
                        }
                    }
                }
            }
        }
    });

    // Register for live updates
    if (typeof registerLiveChart === 'function') {
        registerLiveChart(heatmapChart);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initHeatmap, 200);
});
