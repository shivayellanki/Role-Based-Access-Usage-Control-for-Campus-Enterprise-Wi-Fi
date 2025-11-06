import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin } from './utils/auth';
import Login from './components/Login';
import Layout from './components/Layout';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated() ? <Login /> : <Navigate to={isAdmin() ? '/admin' : '/dashboard'} />} />
        
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <UserDashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/admin/*"
          element={
            <PrivateRoute adminOnly>
              <Layout>
                <AdminDashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        
        <Route path="/" element={<Navigate to={isAuthenticated() ? (isAdmin() ? '/admin' : '/dashboard') : '/login'} />} />
      </Routes>
    </Router>
  );
}

export default App;


