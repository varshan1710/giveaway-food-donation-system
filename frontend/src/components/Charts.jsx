// components/Charts.jsx
// Reusable Chart.js wrappers for the admin analytics dashboard.

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
};

export const DonationTrendChart = ({ trend = [], forecast = [] }) => {
  const labels = [...trend.map((t) => t.date), ...forecast.map((f) => f.date)];
  const actual = [...trend.map((t) => t.count), ...Array(forecast.length).fill(null)];
  const predicted = [...Array(trend.length).fill(null), ...forecast.map((f) => f.predictedCount)];

  const data = {
    labels,
    datasets: [
      {
        label: 'Donations',
        data: actual,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.15)',
        tension: 0.35,
        spanGaps: false,
      },
      {
        label: 'Predicted demand',
        data: predicted,
        borderColor: '#f59e0b',
        borderDash: [6, 4],
        backgroundColor: 'transparent',
        tension: 0.35,
        spanGaps: false,
      },
    ],
  };

  return (
    <div style={{ height: 300 }}>
      <Line data={data} options={commonOptions} />
    </div>
  );
};

export const CategoryBarChart = ({ categoryStats = [] }) => {
  const data = {
    labels: categoryStats.map((c) => c._id),
    datasets: [
      {
        label: 'Donations',
        data: categoryStats.map((c) => c.count),
        backgroundColor: '#22c55e',
        borderRadius: 6,
      },
    ],
  };
  return (
    <div style={{ height: 280 }}>
      <Bar data={data} options={{ ...commonOptions, plugins: { legend: { display: false } } }} />
    </div>
  );
};

export const StatusDoughnutChart = ({ statusStats = [] }) => {
  const colors = {
    pending: '#facc15',
    accepted: '#3b82f6',
    rejected: '#ef4444',
    out_for_pickup: '#a855f7',
    picked_up: '#6366f1',
    delivered: '#22c55e',
    expired: '#9ca3af',
    cancelled: '#9ca3af',
  };

  const data = {
    labels: statusStats.map((s) => s._id),
    datasets: [
      {
        data: statusStats.map((s) => s.count),
        backgroundColor: statusStats.map((s) => colors[s._id] || '#94a3b8'),
        borderWidth: 0,
      },
    ],
  };
  return (
    <div style={{ height: 280 }}>
      <Doughnut data={data} options={commonOptions} />
    </div>
  );
};

export const UsersByRoleChart = ({ usersByRole = [] }) => {
  const data = {
    labels: usersByRole.map((u) => u._id),
    datasets: [
      {
        label: 'Users',
        data: usersByRole.map((u) => u.count),
        backgroundColor: ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6'],
        borderRadius: 6,
      },
    ],
  };
  return (
    <div style={{ height: 260 }}>
      <Bar data={data} options={{ ...commonOptions, plugins: { legend: { display: false } } }} />
    </div>
  );
};
