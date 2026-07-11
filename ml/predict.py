"""
predict.py
----------
Accepts a JSON string of one network session and returns a structured
anomaly prediction from the trained Isolation Forest pipeline.

Usage:
    python ml/predict.py '{"role":"Student","download_mb":1800,"upload_mb":650,
                           "session_duration_minutes":300,"login_hour":2,
                           "violation_count":5}'

Output JSON:
    {
        "is_anomaly": true,
        "anomaly_score": -0.15,
        "risk_score": 85,
        "risk_level": "CRITICAL",
        "reasons": [
            "Login time is unusual compared with training behavior",
            ...
        ]
    }

Notes:
  - anomaly_score is Isolation Forest's decision_function output (NOT a probability).
  - risk_score (0-100) is a normalized mapping of the decision score.
  - reasons are Feature Deviation Explanations based on z-scores from training
    statistics — they are NOT the internal reasoning of Isolation Forest.
"""

import sys
import os
import json
import math
import joblib
import pandas as pd

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(SCRIPT_DIR, "model.joblib")
STATS_PATH   = os.path.join(SCRIPT_DIR, "training_stats.json")

NUMERICAL_FEATURES = [
    "download_mb",
    "upload_mb",
    "session_duration_minutes",
    "login_hour",
    "violation_count",
]

FEATURE_LABELS = {
    "download_mb":                 "Download usage",
    "upload_mb":                   "Upload usage",
    "session_duration_minutes":    "Session duration",
    "login_hour":                  "Login time",
    "violation_count":             "Violation count",
}

RISK_LEVELS = [
    (80, "CRITICAL"),
    (60, "HIGH"),
    (30, "MEDIUM"),
    (0,  "LOW"),
]


def compute_risk_score(decision_score: float, stats: dict) -> int:
    """
    Maps the Isolation Forest decision_function score to a 0-100 risk score.

    decision_function scores:
      - Positive / high -> normal (low risk)
      - Negative / low  -> anomalous (high risk)

    We use p5 and p95 of training scores as the mapping boundaries.
    The score is clamped to [0, 100].

    This is NOT a probability.
    """
    p5  = stats["score_percentiles"]["p5"]
    p95 = stats["score_percentiles"]["p95"]

    if p95 == p5:
        return 50   # degenerate case — return mid-point

    # Invert: lower decision score → higher risk
    # Normalise to [0, 1] then scale to [0, 100]
    risk_raw = (p95 - decision_score) / (p95 - p5)
    risk_score = int(round(min(max(risk_raw * 100, 0), 100)))
    return risk_score


def risk_level(risk_score: int) -> str:
    for threshold, level in RISK_LEVELS:
        if risk_score >= threshold:
            return level
    return "LOW"


def generate_reasons(session: dict, stats: dict) -> list:
    """
    Feature Deviation Explanation (NOT Isolation Forest internal reasoning).

    For each numerical feature, compute:
        z_score = |value - training_mean| / training_std

    Select the top 3 features with the largest absolute z-scores and
    generate human-readable explanations.
    """
    z_scores = {}
    for feat in NUMERICAL_FEATURES:
        val  = session.get(feat, 0)
        mean = stats[feat]["mean"]
        std  = stats[feat]["std"]
        if std > 0:
            z_scores[feat] = abs(val - mean) / std
        else:
            z_scores[feat] = 0.0

    # Take top 3 deviating features
    top_features = sorted(z_scores.items(), key=lambda x: x[1], reverse=True)[:3]

    reasons = []
    for feat, z in top_features:
        if z < 1.0:
            continue   # not meaningfully different — skip

        val  = session.get(feat, 0)
        mean = stats[feat]["mean"]
        label = FEATURE_LABELS[feat]

        if feat == "login_hour":
            reasons.append(
                f"Login time ({val}:00) is unusual compared with typical training behavior "
                f"(average login hour ~ {mean:.0f}:00)."
            )
        elif feat == "violation_count":
            reasons.append(
                f"Violation count ({val}) is unusually high compared with normal sessions "
                f"(average ~ {mean:.1f})."
            )
        elif val > mean:
            reasons.append(
                f"{label} ({val:.1f} MB) is significantly higher than normal sessions "
                f"(average ~ {mean:.1f} MB, z-score={z:.1f})."
            )
        else:
            reasons.append(
                f"{label} ({val:.1f}) differs notably from learned normal behavior "
                f"(average ~ {mean:.1f}, z-score={z:.1f})."
            )

    if not reasons:
        reasons.append("No single feature shows a strong individual deviation; "
                       "the Isolation Forest detected an unusual combination of values.")

    return reasons


def predict(session_json: str) -> dict:
    # Load model and stats
    if not os.path.exists(MODEL_PATH):
        return {"error": "Model file not found. Run ml/train_model.py first."}
    if not os.path.exists(STATS_PATH):
        return {"error": "Training stats not found. Run ml/train_model.py first."}

    pipeline = joblib.load(MODEL_PATH)
    with open(STATS_PATH) as f:
        stats = json.load(f)

    session = json.loads(session_json)

    # Build DataFrame for pipeline
    df = pd.DataFrame([{
        "role":                       session.get("role", "Student"),
        "download_mb":                float(session.get("download_mb", 0)),
        "upload_mb":                  float(session.get("upload_mb", 0)),
        "session_duration_minutes":   float(session.get("session_duration_minutes", 0)),
        "login_hour":                 int(session.get("login_hour", 12)),
        "violation_count":            int(session.get("violation_count", 0)),
    }])

    raw_pred       = pipeline.predict(df)[0]          # 1 = normal, -1 = anomaly
    decision_score = float(pipeline.decision_function(df)[0])

    is_anomaly   = bool(raw_pred == -1)
    rs           = compute_risk_score(decision_score, stats)
    rl           = risk_level(rs)
    reasons      = generate_reasons(session, stats)

    return {
        "is_anomaly":    is_anomaly,
        "anomaly_score": round(decision_score, 6),
        "risk_score":    rs,
        "risk_level":    rl,
        "reasons":       reasons,
    }


if __name__ == "__main__":
    try:
        if len(sys.argv) >= 2 and sys.argv[1].strip():
            input_data = sys.argv[1]
        else:
            input_data = sys.stdin.read().strip()

        if not input_data:
            print(json.dumps({"error": "No input provided via command line argument or stdin."}))
            sys.exit(1)

        result = predict(input_data)
        print(json.dumps(result))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Prediction failed: {str(e)}"}))
        sys.exit(1)
