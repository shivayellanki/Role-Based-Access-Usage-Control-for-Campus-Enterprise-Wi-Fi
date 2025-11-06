import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const AdminOverview = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dashboardService.getAdminDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!dashboard) return <div>No data available</div>;

  const sessionsByRoleData = {
    labels: dashboard.sessionsByRole.map(r => r.role),
    datasets: [{
      data: dashboard.sessionsByRole.map(r => parseInt(r.count)),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    }],
  };

  const usageByRoleData = {
    labels: dashboard.usageByRole.map(r => r.role),
    datasets: [{
      label: 'Data Usage (GB)',
      data: dashboard.usageByRole.map(r => r.total_bytes / (1024 * 1024 * 1024)),
      backgroundColor: '#3b82f6',
    }],
  };

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600">Active Sessions</h3>
          <div className="mt-2 text-3xl font-extrabold text-blue-600">{dashboard.activeSessions}</div>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600">{dashboard.totalUsers}</div>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600">Violations Today</h3>
          <div className="mt-2 text-3xl font-extrabold text-red-600">{dashboard.violations?.length || 0}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Sessions by Role</h2>
          <Pie data={sessionsByRoleData} />
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Usage by Role</h2>
          <Bar data={usageByRoleData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>

      {dashboard.violations && dashboard.violations.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Violations</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Violation Type</th>
                <th className="p-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.violations.slice(0, 10).map((v) => (
                <tr key={v.id} className="border-b border-gray-100">
                  <td className="p-3">{v.username}</td>
                  <td className="p-3">{v.role}</td>
                  <td className="p-3"><span className="text-red-600">{v.violation_type}</span></td>
                  <td className="p-3">{new Date(v.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;



