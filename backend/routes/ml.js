/**
 * backend/routes/ml.js
 * --------------------
 * Express routes for the ML anomaly detection integration.
 *
 * GET  /api/ml/status      — Returns model status and actual metrics
 * POST /api/ml/analyze     — Analyzes a session and returns ML prediction
 *
 * Both endpoints require authentication.
 * POST /api/ml/analyze requires Admin role.
 */

const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { analyzSession, isModelReady, getModelMetrics } = require('../services/mlService');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/ml/status
// Returns model health and actual training metrics from ml/metrics.json
// ---------------------------------------------------------------------------
router.get('/status', authenticateToken, (req, res) => {
  try {
    const ready = isModelReady();
    const metrics = getModelMetrics();

    if (!ready) {
      return res.json({
        status: 'not_ready',
        model: 'Isolation Forest',
        problem_type: 'Unsupervised Anomaly Detection',
        message: 'Model not trained yet. Run: python ml/train_model.py',
        metrics: null,
      });
    }

    // Safely pull from the new structured metrics format
    const testMetrics = metrics?.final_test_metrics || null;
    const training    = metrics?.training || null;

    res.json({
      status: 'active',
      model: 'Isolation Forest',
      problem_type: 'Unsupervised Anomaly Detection',
      selected_contamination: metrics?.selected_contamination ?? null,
      data_split: metrics?.data_split ?? null,
      training: training,
      metrics: testMetrics ? {
        precision:  testMetrics.precision,
        recall:     testMetrics.recall,
        f1_score:   testMetrics.f1_score,
        roc_auc:    testMetrics.roc_auc,
        pr_auc:     testMetrics.pr_auc,
        confusion_matrix: testMetrics.confusion_matrix,
      } : null,
    });
  } catch (err) {
    console.error('[ML /status] Error:', err);
    res.status(500).json({ error: 'Failed to retrieve ML status.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ml/analyze
// Admin-only: analyze a network session using the Isolation Forest model
// ---------------------------------------------------------------------------
router.post('/analyze', authenticateToken, requireRole('Admin'), async (req, res) => {
  try {
    const {
      role,
      download_mb,
      upload_mb,
      session_duration_minutes,
      login_hour,
      violation_count,
    } = req.body;

    // --- Input validation ---
    const VALID_ROLES = ['Student', 'Faculty', 'Staff', 'Guest', 'Admin'];

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        error: `Invalid or missing 'role'. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }
    if (typeof download_mb !== 'number' || download_mb < 0) {
      return res.status(400).json({ error: "'download_mb' must be a non-negative number." });
    }
    if (typeof upload_mb !== 'number' || upload_mb < 0) {
      return res.status(400).json({ error: "'upload_mb' must be a non-negative number." });
    }
    if (typeof session_duration_minutes !== 'number' || session_duration_minutes < 0) {
      return res.status(400).json({ error: "'session_duration_minutes' must be a non-negative number." });
    }
    if (typeof login_hour !== 'number' || login_hour < 0 || login_hour > 23) {
      return res.status(400).json({ error: "'login_hour' must be an integer between 0 and 23." });
    }
    if (typeof violation_count !== 'number' || violation_count < 0) {
      return res.status(400).json({ error: "'violation_count' must be a non-negative integer." });
    }

    const sessionData = {
      role,
      download_mb,
      upload_mb,
      session_duration_minutes,
      login_hour,
      violation_count,
    };

    const prediction = await analyzSession(sessionData);
    res.json(prediction);

  } catch (err) {
    console.error('[ML /analyze] Error:', err.message);
    res.status(500).json({ error: err.message || 'ML analysis failed.' });
  }
});

module.exports = router;
