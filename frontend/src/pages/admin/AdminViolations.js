import React, { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';

const AdminViolations = () => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await dashboardService.getAdminDashboard();
        setViolations(data.violations || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Recent Violations</h2>
      {violations.length === 0 ? (
        <p className="text-gray-500">No recent violations</p>
      ) : (
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
            {violations.slice(0, 20).map((violation) => (
              <tr key={violation.id} className="border-b border-gray-100">
                <td className="p-3">{violation.username}</td>
                <td className="p-3">{violation.role}</td>
                <td className="p-3"><span className="text-red-600">{violation.violation_type}</span></td>
                <td className="p-3">{new Date(violation.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminViolations;



