import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { isAuthenticated, isAdmin } from './utils/auth';
import Login from './components/Login';
import Layout from './components/Layout';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={
          !isAuthenticated() ?
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="h-full">
              <Login />
            </motion.div> :
            <Navigate to={isAdmin() ? '/admin' : '/dashboard'} />
        } />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
                  <UserDashboard />
                </motion.div>
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <PrivateRoute adminOnly>
              <Layout>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
                  <AdminDashboard />
                </motion.div>
              </Layout>
            </PrivateRoute>
          }
        />

        <Route path="/" element={<Navigate to={isAuthenticated() ? (isAdmin() ? '/admin' : '/dashboard') : '/login'} />} />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-brand/20 selection:text-brand-dark">
        <AnimatedRoutes />
      </div>
    </Router>
  );
}

export default App;
