import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { mlService } from '../../services/mlService';

// ── Icons (inline SVGs to avoid adding new deps) ────────────────────────────
const BrainIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);

// ── Risk level colour map ─────────────────────────────────────────────────────
const RISK_COLOURS = {
  CRITICAL: { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500' },
  HIGH:     { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  MEDIUM:   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  LOW:      { bg: 'bg-emerald-100',text: 'text-emerald-700',border: 'border-emerald-300',dot: 'bg-emerald-500' },
};

// ── Anomaly test cases ────────────────────────────────────────────────────────
const EXAMPLES = [
  {
    label: '🚨 Anomalous Student — 2 AM + massive download',
    data: { role: 'Student', download_mb: 1800, upload_mb: 650, session_duration_minutes: 300, login_hour: 2, violation_count: 5 },
  },
  {
    label: '✅ Normal Faculty — daytime usage',
    data: { role: 'Faculty', download_mb: 700, upload_mb: 140, session_duration_minutes: 180, login_hour: 10, violation_count: 0 },
  },
  {
    label: '⚠️ Suspicious Guest — extreme bandwidth',
    data: { role: 'Guest', download_mb: 950, upload_mb: 300, session_duration_minutes: 240, login_hour: 3, violation_count: 7 },
  },
];

// ── Small metric card ─────────────────────────────────────────────────────────
const MetricPill = ({ label, value, pct = true }) => (
  <div className="flex flex-col items-center px-3 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
    <span className="text-base font-extrabold text-indigo-700">
      {value !== null && value !== undefined
        ? pct ? (Number(value) * 100).toFixed(1) + '%' : Number(value).toFixed(4)
        : '—'}
    </span>
    <span className="text-xs font-medium text-indigo-500 mt-0.5 uppercase tracking-wide text-center">{label}</span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const MLAnomalyCard = () => {
  const [status, setStatus]         = useState(null);
  const [loadingStatus, setLS]      = useState(true);
  const [form, setForm]             = useState(EXAMPLES[0].data);
  const [selectedEx, setSelectedEx] = useState(0);
  const [result, setResult]         = useState(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [analyzeError, setAErr]     = useState('');

  // ── Load model status on mount ────────────────────────────────────────────
  useEffect(() => {
    mlService.getStatus()
      .then(setStatus)
      .catch(() => setStatus({ status: 'error' }))
      .finally(() => setLS(false));
  }, []);

  const handleExampleSelect = (idx) => {
    setSelectedEx(idx);
    setForm(EXAMPLES[idx].data);
    setResult(null);
    setAErr('');
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setResult(null);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setResult(null);
    setAErr('');
    try {
      const payload = {
        role: form.role,
        download_mb: Number(form.download_mb),
        upload_mb: Number(form.upload_mb),
        session_duration_minutes: Number(form.session_duration_minutes),
        login_hour: Number(form.login_hour),
        violation_count: Number(form.violation_count),
      };
      const res = await mlService.analyzeSession(payload);
      setResult(res);
    } catch (err) {
      setAErr(err.response?.data?.error || err.message || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const risk = result ? (RISK_COLOURS[result.risk_level] || RISK_COLOURS.LOW) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card border border-indigo-100/60 bg-gradient-to-br from-white to-indigo-50/30"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
            <BrainIcon />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">ML Anomaly Detection</h2>
            <p className="text-xs text-gray-500 mt-0.5">Isolation Forest · Unsupervised</p>
          </div>
        </div>
        {/* Status badge */}
        {loadingStatus ? (
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 animate-pulse">
            Loading...
          </span>
        ) : status?.status === 'active' ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Model Active
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {status?.status === 'not_ready' ? 'Not Trained' : 'Error'}
          </span>
        )}
      </div>

      {/* ── Model info row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Model</p>
          <p className="font-semibold text-gray-800">Isolation Forest</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Problem Type</p>
          <p className="font-semibold text-gray-800">Unsupervised Anomaly Detection</p>
        </div>
      </div>

      {/* ── Data split info ─────────────────────────────────────────────────── */}
      {status?.data_split && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 border border-blue-100 text-blue-700">
            Train {status.data_split.train_percentage}%
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 border border-purple-100 text-purple-700">
            Validation {status.data_split.validation_percentage}%
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 border border-emerald-100 text-emerald-700">
            Test {status.data_split.test_percentage}%
          </span>
          {status.selected_contamination != null && (
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 border border-indigo-100 text-indigo-700">
              Contamination {status.selected_contamination}
            </span>
          )}
        </div>
      )}

      {/* ── Final Test Metrics row ──────────────────────────────────────────── */}
      {status?.metrics && (
        <>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Final Test Set Metrics</p>
          <div className="grid grid-cols-5 gap-2 mb-6">
            <MetricPill label="Precision" value={status.metrics.precision} />
            <MetricPill label="Recall"    value={status.metrics.recall} />
            <MetricPill label="F1 Score"  value={status.metrics.f1_score} />
            <MetricPill label="ROC-AUC"   value={status.metrics.roc_auc} />
            <MetricPill label="PR-AUC"    value={status.metrics.pr_auc} />
          </div>
        </>
      )}
      {status?.status === 'not_ready' && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          ⚠️ Model not trained yet. Run <code className="font-mono text-xs bg-amber-100 px-1 rounded">python ml/train_model.py</code> first.
        </div>
      )}

      <hr className="border-gray-100 mb-5" />

      {/* ── Test section ────────────────────────────────────────────────────── */}
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
        🔬 Test ML Detection
      </h3>

      {/* Example selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map((ex, idx) => (
          <button
            key={idx}
            onClick={() => handleExampleSelect(idx)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
              selectedEx === idx
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Input form */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Role */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
          <select
            value={form.role}
            onChange={e => handleFormChange('role', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
          >
            {['Student','Faculty','Staff','Guest','Admin'].map(r => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        {/* Login Hour */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Login Hour (0-23)</label>
          <input type="number" min="0" max="23"
            value={form.login_hour}
            onChange={e => handleFormChange('login_hour', parseInt(e.target.value)||0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
          />
        </div>
        {/* Download */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Download (MB)</label>
          <input type="number" min="0"
            value={form.download_mb}
            onChange={e => handleFormChange('download_mb', parseFloat(e.target.value)||0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
          />
        </div>
        {/* Upload */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Upload (MB)</label>
          <input type="number" min="0"
            value={form.upload_mb}
            onChange={e => handleFormChange('upload_mb', parseFloat(e.target.value)||0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
          />
        </div>
        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
          <input type="number" min="0"
            value={form.session_duration_minutes}
            onChange={e => handleFormChange('session_duration_minutes', parseFloat(e.target.value)||0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
          />
        </div>
        {/* Violations */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Violations</label>
          <input type="number" min="0"
            value={form.violation_count}
            onChange={e => handleFormChange('violation_count', parseInt(e.target.value)||0)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
          />
        </div>
      </div>

      {/* Analyze button */}
      <button
        id="ml-analyze-btn"
        onClick={handleAnalyze}
        disabled={analyzing || status?.status !== 'active'}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
          bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {analyzing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Analyzing...
          </>
        ) : '🤖 Run ML Analysis'}
      </button>

      {/* Error */}
      {analyzeError && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {analyzeError}
        </div>
      )}

      {/* ── Result panel ────────────────────────────────────────────────────── */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 space-y-3"
        >
          {/* Verdict banner */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${risk.bg} ${risk.border}`}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${risk.dot}`} />
              <span className={`font-bold text-sm ${risk.text}`}>
                {result.is_anomaly ? '⚡ ANOMALY DETECTED' : '✅ NORMAL SESSION'}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${risk.bg} ${risk.text} border ${risk.border}`}>
              {result.risk_level}
            </span>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Risk Score</p>
              <p className="text-2xl font-extrabold text-gray-900">{result.risk_score}<span className="text-sm font-medium text-gray-400">/100</span></p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Anomaly Score</p>
              <p className="text-2xl font-extrabold text-gray-900 font-mono">
                {result.anomaly_score?.toFixed(4)}
              </p>
              <p className="text-xs text-gray-400">(not a probability)</p>
            </div>
          </div>

          {/* Feature deviation explanations */}
          {result.reasons && result.reasons.length > 0 && (
            <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2">
                📊 Feature Deviation Explanation
              </p>
              <ul className="space-y-1.5">
                {result.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-indigo-900 flex gap-2">
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-indigo-400 mt-3 italic">
                Note: These are z-score deviations from training statistics, not direct Isolation Forest explanations.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default MLAnomalyCard;
