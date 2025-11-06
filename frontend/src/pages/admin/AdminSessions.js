import React, { useEffect, useState, useRef } from 'react';
import { sessionService } from '../../services/sessionService';

const formatBytes = (bytes) => {
  if (!bytes) return '0 GB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const AdminSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [selectedRole, setSelectedRole] = useState('All');
  const [limit, setLimit] = useState(100);
  const pollerRef = useRef(null);

  const load = async () => {
    try {
      setError('');
      const params = {
        limit,
        ...(showActiveOnly ? { active: true } : {}),
        ...(selectedRole && selectedRole !== 'All' ? { role: selectedRole } : {}),
      };
      const data = await sessionService.getAll(params);
      setSessions(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Poll every 10 seconds to keep sessions fresh
    pollerRef.current = setInterval(async () => {
      try {
        setIsRefreshing(true);
        const params = {
          limit,
          ...(showActiveOnly ? { active: true } : {}),
          ...(selectedRole && selectedRole !== 'All' ? { role: selectedRole } : {}),
        };
        const data = await sessionService.getAll(params);
        setSessions(data || []);
      } catch (_) {
      } finally {
        setIsRefreshing(false);
      }
    }, 10000);
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [showActiveOnly, selectedRole, limit]);

  const handleDisconnect = async (sessionId) => {
    if (!window.confirm('Disconnect this session?')) return;
    try {
      await sessionService.disconnect(sessionId);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to disconnect session');
    }
  };

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      await load();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="checkbox" checked={showActiveOnly} onChange={(e) => setShowActiveOnly(e.target.checked)} />
            Active only
          </label>
          <select className="input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option>All</option>
            <option>Admin</option>
            <option>Student</option>
            <option>Faculty</option>
            <option>Staff</option>
            <option>Guest</option>
          </select>
          <select className="input" value={String(limit)} onChange={(e) => setLimit(parseInt(e.target.value) || 50)}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
          <button className="btn btn-secondary" onClick={handleManualRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      {sessions.length === 0 ? (
        <p className="text-gray-500">No active sessions</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Started</th>
              <th className="p-3 text-left">Data Used</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-gray-100">
                <td className="p-3">{session.username} ({session.email})</td>
                <td className="p-3">{session.role_name}</td>
                <td className="p-3">{new Date(session.started_at).toLocaleString()}</td>
                <td className="p-3">{formatBytes(session.data_used_bytes)}</td>
                <td className="p-3">
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDisconnect(session.id)}
                  >
                    Disconnect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminSessions;



