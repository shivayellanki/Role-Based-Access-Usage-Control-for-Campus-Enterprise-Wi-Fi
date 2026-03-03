import React, { useEffect, useState, useRef } from 'react';
import { sessionService } from '../../services/sessionService';
import { Users, Search, RefreshCw, PowerOff, Clock, HardDrive, ShieldCheck, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return gb.toFixed(2) + ' GB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return mb.toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(2) + ' KB';
};

const AdminSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [selectedRole, setSelectedRole] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [limit, setLimit] = useState(100);

  const pollerRef = useRef(null);

  const load = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      setError('');
      const params = {
        limit,
        ...(showActiveOnly ? { active: true } : {}),
        ...(selectedRole && selectedRole !== 'All' ? { role: selectedRole } : {}),
      };
      const data = await sessionService.getAll(params);
      setSessions(data || []);
    } catch (err) {
      setError('Failed to fetch sessions. Check connection.');
    } finally {
      if (showRefreshIndicator) setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Poll every 10 seconds to keep sessions fresh
    pollerRef.current = setInterval(() => {
      load(false);
    }, 10000);
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [showActiveOnly, selectedRole, limit]);

  const handleDisconnect = async (sessionId) => {
    if (!window.confirm('Disconnect this session immediately?')) return;
    try {
      await sessionService.disconnect(sessionId);
      await load(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to disconnect session');
    }
  };

  const handleManualRefresh = () => {
    load(true);
  };

  const roles = ['All', 'Admin', 'Student', 'Faculty', 'Staff', 'Guest'];

  const filteredSessions = sessions.filter(s => {
    const query = searchQuery.toLowerCase();
    return s.username.toLowerCase().includes(query) || (s.email && s.email.toLowerCase().includes(query));
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header and Controls */}
      <div className="glass-card flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="p-2 bg-blue-100/50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            Network Sessions
          </h2>
          <p className="text-sm text-gray-500 mt-1">Monitor and manage connected user sessions</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* Search */}
          <div className="relative flex-grow xl:flex-grow-0 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 pr-4 py-2 w-full bg-white/50 border-gray-200 shadow-sm"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl overflow-x-auto scrollbar-hide">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${selectedRole === role ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Controls Group */}
          <div className="flex items-center gap-3 bg-white/50 p-1.5 rounded-xl border border-gray-100 shadow-sm">
            <label className="flex items-center gap-2 px-3 py-1 cursor-pointer select-none">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={showActiveOnly} onChange={(e) => setShowActiveOnly(e.target.checked)} />
                <div className={`block w-8 h-5 rounded-full transition-colors ${showActiveOnly ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${showActiveOnly ? 'transform translate-x-3' : ''}`}></div>
              </div>
              <span className="text-xs font-medium text-gray-600">Active Only</span>
            </label>

            <div className="h-4 w-px bg-gray-200"></div>

            <select
              className="bg-transparent text-xs font-medium text-gray-600 focus:outline-none cursor-pointer pr-2"
              value={String(limit)}
              onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
            >
              <option value="20">20 items</option>
              <option value="50">50 items</option>
              <option value="100">100 items</option>
            </select>

            <div className="h-4 w-px bg-gray-200"></div>

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`p-1.5 rounded-lg text-gray-500 hover:text-brand hover:bg-brand/10 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Sessions Data Grid */}
      <div className="glass-card !p-0 overflow-hidden border border-gray-200/50">
        {filteredSessions.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-900">No sessions found</p>
            <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-widest border-b border-gray-100">
                  <th className="p-5 pl-6 font-semibold">User Details</th>
                  <th className="p-5 font-semibold"><div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Access Role</div></th>
                  <th className="p-5 font-semibold"><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Session Time</div></th>
                  <th className="p-5 font-semibold"><div className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5" /> Bandwidth Used</div></th>
                  <th className="p-5 font-semibold text-center">Status / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {filteredSessions.map((session) => (
                    <motion.tr
                      key={session.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* User Info */}
                      <td className="p-4 pl-6 border-r border-gray-50/50 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-gray-500 uppercase">{session.username.substring(0, 2)}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{session.username}</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{session.email || 'No email provided'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Info */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${session.role_name === 'Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            session.role_name === 'Student' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              session.role_name === 'Guest' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                          {session.role_name}
                        </span>
                      </td>

                      {/* Time Info */}
                      <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-gray-400 text-xs">{new Date(session.started_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </td>

                      {/* Metrics Info */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        <div className="font-mono font-medium text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 inline-block">
                          {formatBytes(session.data_used_bytes)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-3">
                          {session.is_active ? (
                            <>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Active
                              </span>
                              <button
                                onClick={() => handleDisconnect(session.id)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 absolute right-4"
                                title="Disconnect Session"
                              >
                                <PowerOff className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              Offline
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AdminSessions;



