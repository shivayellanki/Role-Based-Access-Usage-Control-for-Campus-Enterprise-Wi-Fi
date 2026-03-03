import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, removeAuthToken } from '../utils/auth';
import { authService } from '../services/authService';
import { LogOut, LayoutDashboard, ShieldCheck, User, Menu, X, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const isAdmin = user?.role === 'Admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Glassmorphic Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo area */}
            <div className="flex items-center gap-3">
              <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 group">
                <div className="p-2 bg-gradient-to-br from-brand to-blue-600 rounded-xl shadow-md group-hover:scale-105 transition-transform">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                  RB‑WiFi
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/10 text-brand uppercase tracking-wider ml-1">
                  Enterprise
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {user && (
                <>
                  <div className="flex items-center gap-4 border-r border-gray-200 pr-6 mr-2">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-gray-900">
                        {user.fullName || user.username}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {user.role}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center shadow-sm">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>

                  {isAdmin && (
                    <Link to="/admin" className={`flex items-center gap-2 text-sm font-medium transition-colors ${location.pathname.startsWith('/admin') ? 'text-brand' : 'text-gray-500 hover:text-gray-900'}`}>
                      <ShieldCheck className="w-4 h-4" />
                      Admin Console
                    </Link>
                  )}

                  {!isAdmin && (
                    <button onClick={() => navigate('/dashboard')} className={`flex items-center gap-2 text-sm font-medium transition-colors ${location.pathname === '/dashboard' ? 'text-brand' : 'text-gray-500 hover:text-gray-900'}`}>
                      <LayoutDashboard className="w-4 h-4" />
                      My Dashboard
                    </button>
                  )}

                  <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {user && (
                <div className="mb-4 pb-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{user.fullName || user.username}</div>
                    <div className="text-xs text-brand font-medium">{user.role}</div>
                  </div>
                </div>
              )}
              {isAdmin && (
                <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-base font-medium text-gray-900 hover:bg-gray-50 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-gray-500" /> Admin Console
                </Link>
              )}
              {!isAdmin && (
                <button onClick={() => { setIsMobileMenuOpen(false); navigate('/dashboard'); }} className="w-full text-left block px-3 py-2 rounded-lg text-base font-medium text-gray-900 hover:bg-gray-50 flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-gray-500" /> Dashboard
                </button>
              )}
              <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 flex items-center gap-2">
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;


