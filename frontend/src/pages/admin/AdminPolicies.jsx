import React, { useEffect, useState } from 'react';
import { policyService } from '../../services/policyService';
import { ShieldCheck, Edit2, Check, X, Search, Clock, Zap, Target, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await policyService.getAll();
        setPolicies(data || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load policies');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startEdit = (id) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, _editing: true, _draft: { ...p } } : p)));
  };

  const cancelEdit = (id) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, _editing: false, _draft: undefined } : p)));
  };

  const updateDraft = (id, field, value) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, _draft: { ...p._draft, [field]: value } } : p)));
  };

  const savePolicy = async (p) => {
    try {
      setSavingId(p.id);
      setError('');
      const draft = p._draft || p;
      const payload = {
        bandwidth_down_mbps: draft.bandwidth_down_mbps === '' ? null : Number(draft.bandwidth_down_mbps),
        bandwidth_up_mbps: draft.bandwidth_up_mbps === '' ? null : Number(draft.bandwidth_up_mbps),
        daily_quota_gb: draft.daily_quota_gb === '' ? null : Number(draft.daily_quota_gb),
        session_time_limit_minutes: draft.session_time_limit_minutes === '' ? null : Number(draft.session_time_limit_minutes),
        allowed_hours_start: draft.allowed_hours_start || null,
        allowed_hours_end: draft.allowed_hours_end || null,
        blocked_categories: draft.blocked_categories,
        access_24x7: !!draft.access_24x7,
      };
      const updated = await policyService.update(p.id, payload);
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...updated, _editing: false, _draft: undefined } : x)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save policy');
    } finally {
      setSavingId(null);
    }
  };

  const filteredPolicies = policies.filter(p => p.role_name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header and Search */}
      <div className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="p-2 bg-blue-100/50 text-blue-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </span>
            Access Policies
          </h2>
          <p className="text-sm text-gray-500 mt-1">Configure bandwidth, quotas, and access rules per role</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 pr-4 py-2 w-full sm:w-64 bg-gray-50/50 border-gray-200"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Policies Table Container */}
      <div className="glass-card !p-0 overflow-hidden border border-gray-200/50">
        {filteredPolicies.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ShieldCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No policies found matching your criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-widest border-b border-gray-100">
                  <th className="p-4 pl-6 font-semibold">Role</th>
                  <th className="p-4 font-semibold"><div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Bandwidth (Dn/Up)</div></th>
                  <th className="p-4 font-semibold"><div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Quota (GB)</div></th>
                  <th className="p-4 font-semibold"><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Max Session</div></th>
                  <th className="p-4 font-semibold"><div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Access Window</div></th>
                  <th className="p-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {filteredPolicies.map((p) => (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`transition-colors ${p._editing ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}
                    >
                      {/* Role Name */}
                      <td className="p-4 pl-6 font-medium text-gray-900 border-r border-gray-50/50 whitespace-nowrap bg-white/50 backdrop-blur-sm sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-brand"></span>
                          {p.role_name}
                        </div>
                      </td>

                      {/* Bandwidth */}
                      <td className="p-4 text-sm text-gray-600">
                        {p._editing ? (
                          <div className="flex items-center gap-2">
                            <input className="input py-1 px-2 w-20 text-center"
                              type="number"
                              value={p._draft?.bandwidth_down_mbps ?? ''}
                              onChange={(e) => updateDraft(p.id, 'bandwidth_down_mbps', e.target.value)}
                              placeholder="∞"
                            />
                            <span className="text-gray-400">/</span>
                            <input className="input py-1 px-2 w-20 text-center"
                              type="number"
                              value={p._draft?.bandwidth_up_mbps ?? ''}
                              onChange={(e) => updateDraft(p.id, 'bandwidth_up_mbps', e.target.value)}
                              placeholder="∞"
                            />
                            <span className="text-xs text-gray-400">Mbps</span>
                          </div>
                        ) : (
                          <div className="font-mono bg-gray-50 px-2 py-1 rounded inline-flex border border-gray-100 items-center justify-center min-w-[120px]">
                            {p.bandwidth_down_mbps ?? '∞'} <span className="text-gray-400 mx-1">/</span> {p.bandwidth_up_mbps ?? '∞'} <span className="text-xs text-gray-400 ml-1">Mbps</span>
                          </div>
                        )}
                      </td>

                      {/* Quota */}
                      <td className="p-4 text-sm">
                        {p._editing ? (
                          <input className="input py-1 px-2 w-24"
                            type="number"
                            value={p._draft?.daily_quota_gb ?? ''}
                            onChange={(e) => updateDraft(p.id, 'daily_quota_gb', e.target.value)}
                            placeholder="Unlimited"
                          />
                        ) : (
                          p.daily_quota_gb ? <span className="font-semibold text-gray-900">{p.daily_quota_gb} <span className="text-gray-500 font-normal">GB</span></span> : <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">Unlimited</span>
                        )}
                      </td>

                      {/* Session Limit */}
                      <td className="p-4 text-sm">
                        {p._editing ? (
                          <input className="input py-1 px-2 w-24"
                            type="number"
                            value={p._draft?.session_time_limit_minutes ?? ''}
                            onChange={(e) => updateDraft(p.id, 'session_time_limit_minutes', e.target.value)}
                            placeholder="Unlimited"
                          />
                        ) : (
                          p.session_time_limit_minutes ? <span className="text-gray-900">{p.session_time_limit_minutes} <span className="text-gray-500">min</span></span> : <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Allowed Hours & 24x7 */}
                      <td className="p-4 text-sm">
                        {p._editing ? (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 select-none cursor-pointer">
                              <input type="checkbox" className="rounded border-gray-300 text-brand focus:ring-brand" checked={!!p._draft?.access_24x7} onChange={(e) => updateDraft(p.id, 'access_24x7', e.target.checked)} />
                              24/7 Access
                            </label>
                            {!p._draft?.access_24x7 && (
                              <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                                <input className="input py-1 px-2 text-xs w-[90px] text-center" type="time" value={p._draft?.allowed_hours_start || ''} onChange={(e) => updateDraft(p.id, 'allowed_hours_start', e.target.value)} />
                                <span className="text-gray-400">-</span>
                                <input className="input py-1 px-2 text-xs w-[90px] text-center" type="time" value={p._draft?.allowed_hours_end || ''} onChange={(e) => updateDraft(p.id, 'allowed_hours_end', e.target.value)} />
                              </div>
                            )}
                          </div>
                        ) : (
                          p.access_24x7 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700">24/7 Unlimited</span>
                          ) : (
                            <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded inline-flex font-mono text-xs border border-gray-100">
                              {p.allowed_hours_start && p.allowed_hours_end ? `${p.allowed_hours_start} - ${p.allowed_hours_end}` : 'Not Configured'}
                            </span>
                          )
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center border-l border-gray-50/50">
                        {p._editing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="p-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
                              onClick={() => savePolicy(p)}
                              disabled={savingId === p.id}
                              title="Save"
                            >
                              {savingId === p.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              className="p-1.5 bg-white text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors shadow-sm"
                              onClick={() => cancelEdit(p.id)}
                              disabled={savingId === p.id}
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors inline-block"
                            onClick={() => startEdit(p.id)}
                            title="Edit Policy"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
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

export default AdminPolicies;


