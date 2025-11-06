import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { setAuthToken, setUser } from '../utils/auth';

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
      setError(err.response?.data?.error || 'Login failed');
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
      setSuccess('OTP sent to your email! Check console for demo (OTP is logged there).');
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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Brand/Illustration */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white">
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">RB‑WiFi</h1>
          <p className="mt-4 text-blue-100">Role‑based Wi‑Fi access with smart policies, session controls, and beautiful dashboards.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-4">High‑level Policies</div>
            <div className="bg-white/10 rounded-lg p-4">Audit & Sessions</div>
            <div className="bg-white/10 rounded-lg p-4">OTP Guest Access</div>
            <div className="bg-white/10 rounded-lg p-4">Charts & Reports</div>
          </div>
        </div>
      </div>

      {/* Right: Auth Card */}
      <div className="flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Welcome back</h2>
          <p className="mt-2 text-center text-sm text-gray-500">Sign in to continue to RB‑WiFi</p>

          <div className="mt-6 grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              className={`px-3 py-2 rounded-md text-sm font-semibold transition ${authMode === 'internal' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              onClick={() => { setAuthMode('internal'); setError(''); setSuccess(''); setOtpSent(false); }}
            >
              Internal
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm font-semibold transition ${authMode === 'guest' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
              onClick={() => { setAuthMode('guest'); setError(''); setSuccess(''); setOtpSent(false); }}
            >
              Guest
            </button>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
          {success && <div className="mt-3 text-sm text-green-600">{success}</div>}

          {authMode === 'internal' ? (
            <form onSubmit={handleInternalLogin} className="mt-6 space-y-4">
              <div>
                <label className="label">Username or Email</label>
                <input type="text" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="admin" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="admin123" />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              {!otpSent ? (
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="guest@example.com" />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                    {loading ? 'Sending…' : 'Request OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="label">Enter OTP</label>
                    <input type="text" className="input" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="123456" maxLength="6" />
                    <small className="block mt-1 text-gray-500">Check console/backend logs for OTP code</small>
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                    {loading ? 'Verifying…' : 'Verify OTP'}
                  </button>
                  <button type="button" className="btn btn-secondary w-full" onClick={() => { setOtpSent(false); setOtp(''); }}>
                    Resend OTP
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
            <strong className="text-gray-900">Demo Accounts</strong>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>Admin: admin / admin123</div>
              <div>Student: student / student123</div>
              <div>Faculty: faculty / faculty123</div>
              <div>Staff: staff / staff123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

