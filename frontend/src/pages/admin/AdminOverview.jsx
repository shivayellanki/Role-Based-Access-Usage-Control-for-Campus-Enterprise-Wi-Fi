import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { Users, Activity, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import MLAnomalyCard from './MLAnomalyCard';

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

    const interval = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
    </div>
  );

  if (error) return (
    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium">
      {error}
    </div>
  );

  if (!dashboard) return <div className="p-8 text-center text-gray-500">No data available</div>;

  const sessionsByRoleData = {
    labels: dashboard.sessionsByRole.map(r => r.role),
    datasets: [{
      data: dashboard.sessionsByRole.map(r => parseInt(r.count)),
      backgroundColor: ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      borderWidth: 0,
      hoverOffset: 4
    }],
  };

  const usageByRoleData = {
    labels: dashboard.usageByRole.map(r => r.role),
    datasets: [{
      label: 'Data Usage (GB)',
      data: dashboard.usageByRole.map(r => r.total_bytes / (1024 * 1024 * 1024)),
      backgroundColor: '#4f46e5',
      borderRadius: 6,
      barThickness: 32,
    }],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        border: { display: false }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { usePointStyle: true, padding: 20 } }
    },
    cutout: '60%'
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 scrollbar-hide pb-10">

      {/* Top Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="glass-card flex items-center gap-4 bg-gradient-to-br from-white to-blue-50/50">
          <div className="p-4 bg-blue-100/50 text-blue-600 rounded-2xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Sessions</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{dashboard.activeSessions}</h3>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card flex items-center gap-4 bg-gradient-to-br from-white to-emerald-50/50">
          <div className="p-4 bg-emerald-100/50 text-emerald-600 rounded-2xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Users</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{dashboard.totalUsers}</h3>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card flex items-center gap-4 bg-gradient-to-br from-white to-red-50/50">
          <div className="p-4 bg-red-100/50 text-red-600 rounded-2xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Violations Today</p>
            <h3 className="text-3xl font-extrabold text-gray-900 mt-1">{dashboard.violations?.length || 0}</h3>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants} className="glass-card flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-brand">
              <Users className="w-4 h-4" />
            </span>
            Sessions by Role
          </h2>
          <div className="h-64 flex-1">
            <Pie data={sessionsByRoleData} options={pieOptions} />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Activity className="w-4 h-4" />
            </span>
            Daily Usage by Role
          </h2>
          <div className="h-64 flex-1">
            <Bar data={usageByRoleData} options={barOptions} />
          </div>
        </motion.div>
      </div>

      {/* ML Anomaly Detection */}
      <motion.div variants={itemVariants}>
        <MLAnomalyCard />
      </motion.div>

      {/* Recent Violations */}
      {dashboard.violations && dashboard.violations.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card !p-0 overflow-hidden border border-red-100/50">
          <div className="px-6 py-5 border-b border-red-100/50 bg-red-50/30 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <ShieldAlert className="w-4 h-4" />
              </span>
              Recent Violations
            </h2>
            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{dashboard.violations.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold border-b border-gray-100 pl-6">User</th>
                  <th className="p-4 font-semibold border-b border-gray-100">Role</th>
                  <th className="p-4 font-semibold border-b border-gray-100">Violation Type</th>
                  <th className="p-4 font-semibold border-b border-gray-100">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dashboard.violations.slice(0, 8).map((v) => (
                  <tr key={v.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="p-4 pl-6 text-sm font-medium text-gray-900">{v.username}</td>
                    <td className="p-4 text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium">{v.role}</span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {v.violation_type}
                    </td>
                    <td className="p-4 text-sm font-mono text-gray-500">
                      {new Date(v.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AdminOverview;



