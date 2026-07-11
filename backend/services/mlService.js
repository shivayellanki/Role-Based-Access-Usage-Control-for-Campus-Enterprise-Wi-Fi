/**
 * mlService.js
 * ------------
 * Calls ml/predict.py via child_process and returns the structured prediction.
 *
 * Integration pattern:
 *   Node (Express) ──► Python child process ──► Isolation Forest pipeline ──► JSON result
 *
 * Error handling:
 *   - Python not found
 *   - Model file missing
 *   - Timeout (10 seconds)
 *   - Invalid / empty JSON output
 *   - Non-zero exit code
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const MODEL_PATH = path.join(__dirname, '../../ml/model.joblib');
const PREDICT_SCRIPT = path.join(__dirname, '../../ml/predict.py');
const METRICS_PATH = path.join(__dirname, '../../ml/metrics.json');

// Detect Python executable (cross-platform)
function getPythonExecutable() {
  const candidates = ['python', 'python3'];
  // On Windows, 'python' is the standard name; on Linux/Mac, 'python3' may be needed.
  // We return 'python' first; if unavailable the error will surface clearly.
  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * Reads actual model metrics from ml/metrics.json (written by train_model.py).
 * Returns null if the file does not exist.
 */
function getModelMetrics() {
  try {
    if (!fs.existsSync(METRICS_PATH)) return null;
    const raw = fs.readFileSync(METRICS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Checks whether the model file exists on disk.
 */
function isModelReady() {
  return fs.existsSync(MODEL_PATH) && fs.existsSync(PREDICT_SCRIPT);
}

/**
 * Runs ml/predict.py with the provided session data via stdin.
 * Returns a Promise that resolves with the prediction result object.
 *
 * @param {Object} sessionData  - { role, download_mb, upload_mb,
 *                                  session_duration_minutes, login_hour,
 *                                  violation_count }
 * @returns {Promise<Object>}   - { is_anomaly, anomaly_score, risk_score,
 *                                  risk_level, reasons }
 */
function analyzSession(sessionData) {
  return new Promise((resolve, reject) => {
    if (!isModelReady()) {
      return resolve({
        error: 'ML model not ready. Run python ml/train_model.py to train the model first.',
        model_ready: false,
      });
    }

    const python = getPythonExecutable();
    const sessionJson = JSON.stringify(sessionData);

    const child = spawn(python, [PREDICT_SCRIPT]);

    let stdout = '';
    let stderr = '';
    let timeoutId;

    // Timeout handling
    timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('ML prediction timed out after 10 seconds.'));
    }, 10000);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to start ML process: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        console.error('[MLService] Python process exited with code:', code);
        console.error('[MLService] stderr:', stderr);
        return reject(new Error(`ML prediction process failed with exit code ${code}. Error: ${stderr.trim()}`));
      }

      const output = stdout.trim();
      if (!output) {
        return reject(new Error('ML prediction returned empty output.'));
      }

      try {
        const result = JSON.parse(output);
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result);
      } catch (parseErr) {
        console.error('[MLService] JSON parse error. Raw output:', output);
        reject(new Error('Failed to parse ML prediction output.'));
      }
    });

    // Write input JSON to stdin
    child.stdin.write(sessionJson);
    child.stdin.end();
  });
}

module.exports = {
  analyzSession,
  isModelReady,
  getModelMetrics,
};
