import React, { useEffect, useState } from 'react';
import { policyService } from '../../services/policyService';

const AdminPolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

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

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Policies by Role</h2>
      {policies.length === 0 ? (
        <p className="text-gray-500">No policies found</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Down (Mbps)</th>
                <th className="p-3 text-left">Up (Mbps)</th>
                <th className="p-3 text-left">Daily Quota (GB)</th>
                <th className="p-3 text-left">Session Limit (min)</th>
                <th className="p-3 text-left">Allowed Hours</th>
                <th className="p-3 text-left">24x7</th>
                <th className="p-3 text-left">Blocked Categories</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="p-3">{p.role_name}</td>
                  <td className="p-3">
                    {p._editing ? (
                      <input className="input"
                        type="number"
                        value={p._draft?.bandwidth_down_mbps ?? ''}
                        onChange={(e) => updateDraft(p.id, 'bandwidth_down_mbps', e.target.value)}
                        placeholder="-"
                      />
                    ) : (
                      p.bandwidth_down_mbps ?? '-'
                    )}
                  </td>
                  <td className="p-3">
                    {p._editing ? (
                      <input className="input"
                        type="number"
                        value={p._draft?.bandwidth_up_mbps ?? ''}
                        onChange={(e) => updateDraft(p.id, 'bandwidth_up_mbps', e.target.value)}
                        placeholder="-"
                      />
                    ) : (
                      p.bandwidth_up_mbps ?? '-'
                    )}
                  </td>
                  <td className="p-3">
                    {p._editing ? (
                      <input className="input"
                        type="number"
                        value={p._draft?.daily_quota_gb ?? ''}
                        onChange={(e) => updateDraft(p.id, 'daily_quota_gb', e.target.value)}
                        placeholder="-"
                      />
                    ) : (
                      p.daily_quota_gb ?? '-'
                    )}
                  </td>
                  <td className="p-3">
                    {p._editing ? (
                      <input className="input"
                        type="number"
                        value={p._draft?.session_time_limit_minutes ?? ''}
                        onChange={(e) => updateDraft(p.id, 'session_time_limit_minutes', e.target.value)}
                        placeholder="-"
                      />
                    ) : (
                      p.session_time_limit_minutes ?? '-'
                    )}
                  </td>
                  <td className="p-3">
                    {p._editing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input" type="time" value={p._draft?.allowed_hours_start || ''} onChange={(e) => updateDraft(p.id, 'allowed_hours_start', e.target.value)} />
                        <input className="input" type="time" value={p._draft?.allowed_hours_end || ''} onChange={(e) => updateDraft(p.id, 'allowed_hours_end', e.target.value)} />
                      </div>
                    ) : (
                      p.allowed_hours_start && p.allowed_hours_end ? `${p.allowed_hours_start} - ${p.allowed_hours_end}` : '-'
                    )}
                  </td>
                  <td className="p-3">
                    {p._editing ? (
                      <input type="checkbox" className="checkbox" checked={!!p._draft?.access_24x7} onChange={(e) => updateDraft(p.id, 'access_24x7', e.target.checked)} />
                    ) : (
                      p.access_24x7 ? 'Yes' : 'No'
                    )}
                  </td>
                  <td className="p-3">
                    {p._editing ? (
                      <input className="input"
                        type="text"
                        value={Array.isArray(p._draft?.blocked_categories) ? p._draft.blocked_categories.join(',') : (p._draft?.blocked_categories || '')}
                        onChange={(e) => updateDraft(p.id, 'blocked_categories', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                        placeholder="adult, gambling"
                      />
                    ) : (
                      Array.isArray(p.blocked_categories) ? p.blocked_categories.join(', ') : (p.blocked_categories || '-')
                    )}
                  </td>
                  <td className="p-3">
                    {p._editing ? (
                      <div className="flex gap-2">
                        <button className="btn btn-primary" onClick={() => savePolicy(p)} disabled={savingId === p.id}>
                          {savingId === p.id ? 'Saving…' : 'Save'}
                        </button>
                        <button className="btn btn-secondary" onClick={() => cancelEdit(p.id)} disabled={savingId === p.id}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-secondary" onClick={() => startEdit(p.id)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPolicies;


