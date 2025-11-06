import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { sessionService } from '../services/sessionService';

const UserDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);

  useEffect(() => {
    loadDashboard();
    loadSessionHistory();
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
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!dashboard) {
    return <div>No data available</div>;
  }

  const { policy, usage, activeSession } = dashboard;

  return (
    <div className="container">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 mb-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">My Policy</h2>
          <div className="space-y-2">
            <div><strong>Role:</strong> {policy.role}</div>
            <div><strong>Bandwidth:</strong> {policy.bandwidth_down_mbps} Mbps down / {policy.bandwidth_up_mbps} Mbps up</div>
            {policy.daily_quota_gb && (<div><strong>Daily Quota:</strong> {policy.daily_quota_gb} GB</div>)}
            {policy.session_time_limit_minutes && (<div><strong>Session Limit:</strong> {policy.session_time_limit_minutes} minutes</div>)}
            <div><strong>Access Hours:</strong> {policy.allowed_hours}</div>
            {policy.blocked_categories && policy.blocked_categories.length > 0 && (<div><strong>Blocked:</strong> {policy.blocked_categories.join(', ')}</div>)}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Usage Today</h2>
          <div className="space-y-2">
            <div><strong>Data Used:</strong> {usage.dataUsedGB} GB</div>
            {usage.quotaGB && (
              <>
                <div><strong>Quota:</strong> {usage.quotaGB} GB</div>
                <div><strong>Remaining:</strong> {usage.remainingGB} GB</div>
                <div className="mt-3">
                  <div className="h-2.5 w-full rounded bg-gray-200">
                    <div className={`h-2.5 rounded ${usage.remainingBytes > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (usage.dataUsedBytes / usage.quotaBytes) * 100)}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </>
            )}
            <div><strong>Time Used:</strong> {usage.timeUsedMinutes} minutes</div>
          </div>
        </div>

        {activeSession && (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Active Session</h2>
            <div className="space-y-2">
              <div><strong>Started:</strong> {new Date(activeSession.started_at).toLocaleString()}</div>
              <div><strong>IP Address:</strong> {activeSession.ip_address || 'N/A'}</div>
              <div><strong>Data Used:</strong> {formatBytes(activeSession.data_used_bytes)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Session History</h2>
        {sessionHistory.length === 0 ? (
          <p className="text-gray-500">No session history available</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-3 text-left">Started</th>
                <th className="p-3 text-left">Ended</th>
                <th className="p-3 text-left">Data Used</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessionHistory.map((session) => (
                <tr key={session.id} className="border-b border-gray-100">
                  <td className="p-3">{new Date(session.started_at).toLocaleString()}</td>
                  <td className="p-3">{session.ended_at ? new Date(session.ended_at).toLocaleString() : 'Active'}</td>
                  <td className="p-3">{formatBytes(session.data_used_bytes)}</td>
                  <td className="p-3"><span className={session.is_active ? 'text-emerald-600' : 'text-gray-500'}>{session.is_active ? 'Active' : 'Ended'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;

