import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { setAuthToken, setUser } from '../utils/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, KeyRound, ArrowRight, ShieldCheck, Wifi } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const macAddress = searchParams.get('mac') || '';
  const [authMode, setAuthMode] = useState('internal'); // 'internal' or 'guest'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Internal login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Guest login form state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleInternalLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authService.login(username, password, macAddress || undefined);
      setAuthToken(data.token);
      setUser(data.user);
      navigate(data.user.role === 'Admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed or Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.requestOTP(email);
      setOtpSent(true);
      setSuccess('OTP sent to your email!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await authService.verifyOTP(email, otp, macAddress || undefined);
      setAuthToken(data.token);
      setUser(data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50 overflow-hidden relative">
      {/* Absolute Decorative Elements for the whole page */}
      <div className="absolute top-[-15%] right-[-5%] w-[50%] h-[50%] bg-brand/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Left Column: Brand/Illustration */}
      <div className="hidden lg:flex flex-col relative bg-gray-900 overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-indigo-950 to-brand-dark opacity-90 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay z-0"></div>
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0,transparent_50%)] z-0"
        />

        <div className="relative z-10 p-12 lg:p-16 flex flex-col justify-between h-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-blue-500 flex items-center justify-center shadow-lg shadow-brand/20">
                <Wifi className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">RB‑WiFi Enterprise</h1>
            </div>

            <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mt-12 leading-tight">
              Secure.<br />Intelligent.<br />Access Control.
            </h2>
            <p className="mt-6 text-lg text-indigo-200/80 max-w-md leading-relaxed">
              Dynamically assign network access policies based on user roles, detect AI anomalies in real-time, and manage bandwidth securely.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}
            className="grid grid-cols-2 gap-4 mt-auto"
          >
            {[
              { title: "Dynamic Policies", icon: <ShieldCheck className="w-5 h-5 text-brand-light" /> },
              { title: "Deep DPI Audit", icon: <ArrowRight className="w-5 h-5 text-brand-light" /> },
              { title: "Smart OTP Auth", icon: <KeyRound className="w-5 h-5 text-brand-light" /> },
              { title: "AI Threat Engine", icon: <ShieldCheck className="w-5 h-5 text-brand-light" /> }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
                <div className="bg-white/10 p-2 rounded-lg">{feature.icon}</div>
                <span className="text-sm font-medium text-white">{feature.title}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right Column: Auth Card */}
      <div className="flex items-center justify-center p-6 lg:p-12 relative z-10 h-full flex-col">
        {/* Mobile Logo Only */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-blue-500 flex items-center justify-center shadow-md">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">RB‑WiFi</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px] bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-500/5 ring-1 ring-gray-200/50 p-8 sm:p-10"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="mt-2 text-sm text-gray-500">Sign in to your enterprise network</p>
          </div>

          {/* Custom Toggle */}
          <div className="relative flex p-1 bg-gray-100/80 rounded-xl mb-8">
            <button
              onClick={() => { setAuthMode('internal'); setError(''); setSuccess(''); setOtpSent(false); }}
              className={`relative w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 z-10 ${authMode === 'internal' ? 'text-brand' : 'text-gray-500 hover:text-gray-700'}`}
            >
              School / Faculty
            </button>
            <button
              onClick={() => { setAuthMode('guest'); setError(''); setSuccess(''); setOtpSent(false); }}
              className={`relative w-1/2 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 z-10 ${authMode === 'guest' ? 'text-brand' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Guest Portal
            </button>
            {/* Animated Pill */}
            <motion.div
              layout
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm"
              initial={false}
              animate={{ left: authMode === 'internal' ? '4px' : 'calc(50% + 2px)' }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium text-center">
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="mb-6 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-medium text-center">
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {authMode === 'internal' ? (
              <motion.form
                key="internal"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                onSubmit={handleInternalLogin} className="space-y-5"
              >
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 ml-1">Username or Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="text" className="input pl-10" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Enter your ID" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <a href="#" className="text-xs font-semibold text-brand hover:text-brand-dark transition-colors">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input type="password" className="input pl-10" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full py-3 mt-4 text-base shadow-brand/25 relative overflow-hidden group" disabled={loading}>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {loading ? 'Authenticating...' : 'Sign In'}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="guest"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {!otpSent ? (
                  <form onSubmit={handleRequestOTP} className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 ml-1">Guest Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="guest@example.com" />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-full py-3 mt-4" disabled={loading}>
                      {loading ? 'Sending Code...' : 'Request Verification Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 ml-1">Secure OTP Code</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <KeyRound className="h-5 w-5 text-gray-400" />
                        </div>
                        <input type="text" className="input pl-10 text-center tracking-[0.5em] font-mono text-lg" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="000000" maxLength="6" />
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-full py-3 mt-2" disabled={loading}>
                      {loading ? 'Verifying...' : 'Verify & Connect'}
                    </button>
                    <button type="button" className="btn w-full py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 mt-2" onClick={() => { setOtpSent(false); setOtp(''); }}>
                      Use a different email
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

