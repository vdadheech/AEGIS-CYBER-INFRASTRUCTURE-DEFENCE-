import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Panel } from '../components/ui/Panel';
import { fetchHeatmap } from '../api/endpoints';
import type { ChartData, ChartOptions } from 'chart.js';
import styles from './HeatmapPanel.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Filler,
  Legend
);

const MAX_LIVE_POINTS = 300;

function generateRealisticLatencyData() {
  const labels: number[] = [];
  const values: number[] = [];
  const baseLatency = 45;

  for (let i = 0; i < 200; i++) {
    labels.push(i);
    let latency = baseLatency + (Math.random() * 15 - 7.5);

    if (i % 28 === 14 || i % 35 === 18) latency = 180 + Math.random() * 120;
    if (i % 19 === 9) latency = 90 + Math.random() * 50;
    if (i >= 110 && i <= 125) latency = 250 + Math.random() * 150;
    if (i >= 160 && i <= 168) latency = 200 + Math.random() * 100;

    values.push(Math.max(15, latency));
  }
  return { labels, values };
}

interface HeatmapPanelProps {
  className?: string;
}

export interface HeatmapPanelRef {
  addLivePoint: (logId: number, ms: number) => void;
}

export const HeatmapPanel = forwardRef<HeatmapPanelRef, HeatmapPanelProps>(
  ({ className = '' }, ref) => {
    const chartRef = useRef<ChartJS<'line'>>(null);
    const [chartData, setChartData] = useState<ChartData<'line'> | null>(null);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const load = async () => {
      let labels: number[] = [];
      let values: number[] = [];

      try {
        const resp = await fetchHeatmap();
        const slice = resp.heatmap.slice(-200);
        labels = slice.map((p) => p.log_id);
        values = slice.map((p) => p.response_time_ms);
      } catch {
        console.warn('Heatmap API unavailable — using demo data');
        const demo = generateRealisticLatencyData();
        labels = demo.labels;
        values = demo.values;
      }

      setChartData({
        labels,
        datasets: [
          {
            label: 'Response Latency (ms)',
            data: values,
            borderColor: '#888888',
            backgroundColor: 'rgba(136, 136, 136, 0.1)',
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#ffffff',
            pointHoverBorderColor: '#888888',
            pointHoverBorderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      });
      setLoading(false);
    };

    load();
  }, []);

  // Expose a method to add live points
  const addLivePoint = useCallback((logId: number, responseTimeMs: number) => {
    setChartData(prev => {
      if (!prev) return prev;
      
      const newLabels = [...(prev.labels as number[] || []), logId];
      const newDatasetData = [...(prev.datasets[0].data as number[] || []), responseTimeMs];

      if (newLabels.length > MAX_LIVE_POINTS) {
        newLabels.shift();
        newDatasetData.shift();
      }

      return {
        ...prev,
        labels: newLabels,
        datasets: [{ ...prev.datasets[0], data: newDatasetData }],
      };
    });
  }, []);

  useImperativeHandle(ref, () => ({
    addLivePoint
  }));

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, /* Force instant rendering without bounces */
    interaction: { intersect: false, mode: 'index' },
    scales: {
      x: {
        display: false, /* Hide grid lines completely for minimal look */
      },
      y: {
        display: true,
        min: 0,
        suggestedMax: 300,
        grid: { color: 'rgba(100, 116, 139, 0.05)', tickLength: 0 },
        border: { display: false },
        ticks: {
          color: '#888888',
          font: { family: 'JetBrains Mono', size: 10 },
          padding: 8,
          maxTicksLimit: 5,
          callback: (val) => val + ' ms',
        },
      },
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
          pointStyle: 'circle',
        },
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
        titleFont: { size: 12, weight: 600 },
        bodyFont: { size: 11 },
        callbacks: {
          title: (items) => `Log Entry #${items[0].label}`,
          label: (item) => {
            const val = item.parsed.y;
            if (val === null) return [];
            let status = '✓ Normal Range';
            if (val > 150) status = '⚠ SLEEPER ANOMALY DETECTED';
            else if (val > 80) status = '◐ Elevated Latency';
            return [`Latency: ${val.toFixed(1)} ms`, '', status];
          },
        },
      },
    },
  };

  return (
    <Panel
      title="Latency Timeline"
      collapsible
      defaultExpanded
      className={`${styles.wrapper} ${className}`}
      ariaLabel="Latency anomaly detection"
    >
      <div className={styles.chartBody}>
        {loading || !chartData ? (
          <div className={styles.errorState}>Loading heatmap data...</div>
        ) : (
          <Line ref={chartRef} data={chartData} options={options} />
        )}
      </div>
    </Panel>
  );
});
