import React from 'react';
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldAlert, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AdminOverview from './admin/AdminOverview';
import AdminPolicies from './admin/AdminPolicies';
import AdminSessions from './admin/AdminSessions';
import AdminViolations from './admin/AdminViolations';

const AdminDashboard = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Overview', path: '/admin/overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Active Sessions', path: '/admin/sessions', icon: <Users className="w-5 h-5" /> },
    { name: 'Policy Rules', path: '/admin/policies', icon: <ShieldAlert className="w-5 h-5" /> },
    { name: 'Threat Violations', path: '/admin/violations', icon: <AlertTriangle className="w-5 h-5" /> },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-12 max-w-7xl mx-auto">
      {/* Sidebar Navigation */}
      <aside className="lg:col-span-3">
        <div className="sticky top-24">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card !p-3"
          >
            <div className="px-4 py-4 mb-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Console</h2>
            </div>
            <nav className="flex lg:flex-col overflow-auto gap-1 pb-2 lg:pb-0 scrollbar-hide">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `
                    relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${isActive ? 'text-brand' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/80'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="admin-active-nav"
                          className="absolute inset-0 bg-brand/10 rounded-xl"
                          initial={false}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{item.icon}</span>
                      <span className="relative z-10">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="lg:col-span-9 min-h-[600px]">
        <div className="relative h-full">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="overview" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full">
                  <AdminOverview />
                </motion.div>
              } />
              <Route path="sessions" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full">
                  <AdminSessions />
                </motion.div>
              } />
              <Route path="policies" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full">
                  <AdminPolicies />
                </motion.div>
              } />
              <Route path="violations" element={
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full">
                  <AdminViolations />
                </motion.div>
              } />
              <Route path="*" element={<Navigate to="overview" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;

