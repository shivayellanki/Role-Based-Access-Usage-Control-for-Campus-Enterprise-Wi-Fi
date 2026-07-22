import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { sessionService } from '../services/sessionService';
import { ShieldCheck, Clock, Activity, HardDrive, Wifi, History } from 'lucide-react';
import { motion } from 'framer-motion';

const UserDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);

  useEffect(() => {
    loadDashboard();
    loadSessionHistory();

    const interval = setInterval(() => {
      loadDashboard();
      loadSessionHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await dashboardService.getUserDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionHistory = async () => {
    try {
      const data = await sessionService.getHistory(10);
      setSessionHistory(data);
    } catch (err) {
      console.error('Failed to load session history:', err);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium">
        {error}
      </div>
    );
  }

  if (!dashboard) {
    return <div className="p-8 text-center text-gray-500">No data available</div>;
  }

  const { policy, usage, activeSession } = dashboard;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="text-gray-500 mt-1">Monitor your network usage and access policies.</p>
        </div>
        {activeSession && (
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 font-medium text-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            Connected
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 mb-8">
        {/* Policy Card */}
        <motion.div variants={itemVariants} className="glass-card flex flex-col h-full bg-gradient-to-br from-white to-blue-50/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Access Policy</h2>
          </div>
          <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-500 font-medium text-sm">Assigned Role</span>
              <span className="font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md text-sm">{policy.role}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <span className="text-gray-500 font-medium text-sm">Bandwidth Cap</span>
              <span className="font-semibold text-gray-900">{policy.bandwidth_down_mbps} Mbps / {policy.bandwidth_up_mbps} Mbps</span>
            </div>
            {policy.daily_quota_gb && (
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <span className="text-gray-500 font-medium text-sm">Daily Quota</span>
                <span className="font-semibold text-gray-900">{policy.daily_quota_gb} GB</span>
              </div>
            )}
            <div className="flex justify-between items-center pb-1">
              <span className="text-gray-500 font-medium text-sm">Access Hours</span>
              <span className="font-semibold text-gray-900">{policy.allowed_hours}</span>
            </div>
          </div>
        </motion.div>

        {/* Usage Card */}
        <motion.div variants={itemVariants} className="glass-card flex flex-col h-full bg-gradient-to-br from-white to-brand-light/5 hover:shadow-2xl hover:shadow-brand/10 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-brand/10 text-brand rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Today's Usage</h2>
          </div>
          <div className="space-y-5 flex-1 flex flex-col justify-center">
            {usage.quotaGB ? (
              <>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{usage.dataUsedGB}</span>
                    <span className="text-gray-500 font-medium ml-1">GB used</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{usage.quotaGB} GB</span>
                    <span className="text-xs text-gray-500 block">Total Quota</span>
                  </div>
                </div>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-brand bg-brand/10">
                        {usage.remainingBytes > 0 ? `${usage.remainingGB} GB Left` : 'Limit Exceeded'}
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-gray-100 ring-1 ring-inset ring-gray-200">
                    <div
                      style={{ width: `${Math.min(100, (usage.dataUsedBytes / usage.quotaBytes) * 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${usage.remainingBytes > 0 ? 'bg-gradient-to-r from-brand to-blue-500' : 'bg-red-500'} transition-all duration-1000 ease-out`}
                    ></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{usage.dataUsedGB}</span>
                <span className="text-gray-500 font-medium ml-2">GB used</span>
                <p className="text-sm text-emerald-600 mt-2 font-medium">Unlimited Quota Available</p>
              </div>
            )}

            <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
              <div className="p-2 bg-gray-50 rounded-lg"><Clock className="w-4 h-4 text-gray-500" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{usage.timeUsedMinutes} mins</p>
                <p className="text-xs text-gray-500">Connected time today</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Session Card */}
        {activeSession ? (
          <motion.div variants={itemVariants} className="glass-card flex flex-col h-full bg-gradient-to-br from-white to-emerald-50/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5">
              <Wifi className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                <Wifi className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Active Connection</h2>
            </div>
            <div className="space-y-4 flex-1 relative z-10">
              <div className="p-4 bg-white/60 rounded-xl border border-emerald-100/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Started</span>
                  <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">
                    {new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium text-sm flex items-center gap-2"><HardDrive className="w-4 h-4" /> IP Address</span>
                  <span className="font-mono text-gray-900 text-sm">{activeSession.ip_address || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-emerald-100/30">
                  <span className="text-gray-500 font-medium text-sm">Current Usage</span>
                  <span className="font-bold text-emerald-600">{formatBytes(activeSession.data_used_bytes)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="glass-card flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 border-dashed border-2 border-gray-200">
            <Wifi className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Active Connection</h3>
            <p className="text-sm text-gray-500 mt-1">You are not currently connected to the network.</p>
          </motion.div>
        )}
      </div>

      {/* History Table */}
      <motion.div variants={itemVariants} className="glass-card !p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-white/50 flex items-center gap-3">
          <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
            <History className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Recent Sessions</h2>
        </div>

        {sessionHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No session history available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold border-b border-gray-100 pl-6">Status</th>
                  <th className="p-4 font-semibold border-b border-gray-100">Started</th>
                  <th className="p-4 font-semibold border-b border-gray-100">Ended</th>
                  <th className="p-4 font-semibold border-b border-gray-100">Data Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessionHistory.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      {session.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          Ended
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-900 font-medium">
                      {new Date(session.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {session.ended_at ? new Date(session.ended_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="p-4 text-sm font-mono text-gray-600">
                      {formatBytes(session.data_used_bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default UserDashboard;

