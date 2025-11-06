import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import AdminOverview from './admin/AdminOverview';
import AdminPolicies from './admin/AdminPolicies';
import AdminSessions from './admin/AdminSessions';
import AdminViolations from './admin/AdminViolations';

const AdminDashboard = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <div className="card p-0">
          <nav className="flex lg:block overflow-auto">
            <NavLink to="overview" className={({ isActive }) => `block px-4 py-3 border-b lg:border-b-0 lg:border-l-4 ${isActive ? 'lg:border-blue-600 bg-blue-50 text-blue-700' : 'lg:border-transparent hover:bg-gray-50'}`}>Overview</NavLink>
            <NavLink to="sessions" className={({ isActive }) => `block px-4 py-3 border-b lg:border-b-0 lg:border-l-4 ${isActive ? 'lg:border-blue-600 bg-blue-50 text-blue-700' : 'lg:border-transparent hover:bg-gray-50'}`}>Sessions</NavLink>
            <NavLink to="policies" className={({ isActive }) => `block px-4 py-3 border-b lg:border-b-0 lg:border-l-4 ${isActive ? 'lg:border-blue-600 bg-blue-50 text-blue-700' : 'lg:border-transparent hover:bg-gray-50'}`}>Policies</NavLink>
            <NavLink to="violations" className={({ isActive }) => `block px-4 py-3 lg:border-l-4 ${isActive ? 'lg:border-blue-600 bg-blue-50 text-blue-700' : 'lg:border-transparent hover:bg-gray-50'}`}>Violations</NavLink>
          </nav>
        </div>
      </aside>
      <section className="lg:col-span-9">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
            <p className="text-sm text-gray-500">Manage sessions, users, and policies</p>
          </div>
        </div>
        <Routes>
          <Route path="overview" element={<AdminOverview />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="policies" element={<AdminPolicies />} />
          <Route path="violations" element={<AdminViolations />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </section>
    </div>
  );
};

export default AdminDashboard;

