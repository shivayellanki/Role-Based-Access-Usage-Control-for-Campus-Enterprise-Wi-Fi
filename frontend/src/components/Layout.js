import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser, removeAuthToken } from '../utils/auth';
import { authService } from '../services/authService';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      removeAuthToken();
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <nav className="bg-gray-900 text-white">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-xl font-extrabold tracking-tight hover:opacity-90">
              RB‑WiFi
            </Link>
            <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700">Enterprise</span>
          </div>
          <div className="flex items-center gap-6">
            {user && (
              <>
                <span className="hidden md:inline text-sm text-gray-200">
                  {user.fullName || user.username} <span className="text-gray-400">({user.role})</span>
                </span>
                {user.role === 'Admin' && (
                  <Link to="/admin" className="text-sm hover:text-blue-400 transition">
                    Admin Console
                  </Link>
                )}
                <button onClick={handleLogout} className="btn btn-secondary px-4 py-2">
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;


