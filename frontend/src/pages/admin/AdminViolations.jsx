import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { AlertTriangle, ShieldAlert, Clock, User, ShieldCheck, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminViolations = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dashboardService.getAdminDashboard();
        setViolations(data.violations || []);
      } catch (err) {
        setError('Failed to fetch violations data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="glass-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-red-50/30 to-transparent border-l-4 border-l-red-500">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="p-2 bg-red-100/80 text-red-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </span>
            Threat Violations
          </h2>
          <p className="text-sm text-gray-500 mt-1">Review critical security and policy violations detected on the network</p>
        </div>
        <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 shadow-sm flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-sm font-bold text-red-700">{violations.length} Active Alerts</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Violations Data Grid */}
      <div className="glass-card !p-0 overflow-hidden border border-red-100/50 shadow-sm">
        {violations.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-lg font-medium text-gray-900">Network is secure</p>
            <p className="text-sm mt-1">No recent violations detected.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-red-50/30 text-gray-500 text-xs uppercase tracking-widest border-b border-red-100/50">
                  <th className="p-5 pl-6 font-semibold"><div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> User Instance</div></th>
                  <th className="p-5 font-semibold"><div className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Access Role</div></th>
                  <th className="p-5 font-semibold"><div className="flex items-center gap-1.5"><FileWarning className="w-3.5 h-3.5" /> Violation Context</div></th>
                  <th className="p-5 font-semibold"><div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Detection Timestamp</div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50/50">
                <AnimatePresence>
                  {violations.slice(0, 50).map((violation, index) => (
                    <motion.tr
                      key={violation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-red-50/40 transition-colors group cursor-default"
                    >
                      {/* User Info */}
                      <td className="p-4 pl-6 border-r border-red-50/30 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs ring-2 ring-white">
                            {violation.username.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-gray-900">{violation.username}</span>
                        </div>
                      </td>

                      {/* Role Info */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {violation.role}
                        </span>
                      </td>

                      {/* Context */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="inline-flex flex-col">
                          <span className="font-bold text-red-600 flex items-center gap-1.5 text-sm bg-red-50 px-2 py-0.5 rounded border border-red-100">
                            <AlertTriangle className="w-3 h-3" />
                            {violation.violation_type}
                          </span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="p-4 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-600 font-mono">
                          <span className="font-semibold text-gray-900">{new Date(violation.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="text-gray-400 text-xs">{new Date(violation.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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

export default AdminViolations;



