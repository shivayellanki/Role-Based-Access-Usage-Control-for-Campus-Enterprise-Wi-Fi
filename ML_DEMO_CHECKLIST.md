# ML Demo Checklist — RB-WiFi Isolation Forest Integration

## BEFORE DEMO

- [ ] Run `python ml/generate_dataset.py` — verify "1100 rows" output
- [ ] Run `python ml/train_model.py` — verify splits, contamination comparison, final test metrics
- [ ] Verify `ml/model.joblib` exists
- [ ] Verify `ml/metrics.json` has `final_test_metrics` and correct values
- [ ] Verify `ml/training_stats.json` has feature means/stds and score percentiles
- [ ] Start backend: `cd backend && npm run dev`
- [ ] Start frontend: `cd frontend && npm run dev`
- [ ] Open browser at http://localhost:5173 (or whichever port Vite uses)
- [ ] Log in as Admin (`admin` / `admin123`)
- [ ] Navigate to Admin Dashboard -> Overview
- [ ] Confirm the "ML Anomaly Detection" card loads with status "Model Active"
- [ ] Confirm Final Test Set Metrics show: Precision, Recall, F1, ROC-AUC, PR-AUC

---

## DEMO FLOW

### 1. Explain the existing rule-based detector
- The existing system uses fixed thresholds (e.g., Student > 2 GB = HIGH threat, Guest > 800 MB = CRITICAL)
- Show the `anomalyDetector.js` code briefly
- Highlight the limitation: only single-feature rules

### 2. Explain the limitation
- "What if a student downloads 1.8 GB at 2 AM with 5 violations? No single rule triggers, but the combination is suspicious."
- This is the **motivation for ML**

### 3. Show the ML Anomaly Detection card on Admin Dashboard
- Point out:
  - **Model**: Isolation Forest
  - **Problem Type**: Unsupervised Anomaly Detection
  - **Data Split**: Train 70% / Validation 15% / Test 15%
  - **Contamination**: 0.10 (selected via validation set)

### 4. Show Final Test Set Metrics
- Explain the 70/15/15 methodology
- "Validation set selected contamination. Test set was touched exactly once."
- Point out Recall=86.67% — "we catch 87% of actual anomalies"
- Point out ROC-AUC=0.9387 — "very strong anomaly discrimination"
- Point out PR-AUC=0.5646 — "realistic for a 9% anomaly base rate"

### 5. Run the Normal Faculty example
- Select: "Normal Faculty — daytime usage" preset
- Click "Run ML Analysis"
- Show:
  - `is_anomaly: false`
  - `risk_score: ~7 (LOW)`
  - "No single feature shows a strong individual deviation"

### 6. Run the Anomalous Student example
- Select: "Anomalous Student — 2 AM + massive download" preset
- Click "Run ML Analysis"
- Show:
  - `is_anomaly: true`
  - `risk_score: 100 (CRITICAL)`
  - Top 3 feature deviations:
    - "Violation count is unusually high"
    - "Upload usage significantly higher than normal"
    - "Download usage significantly higher than normal"

### 7. Explain Risk Score
- "This is NOT a probability."
- "It is a normalized mapping of the Isolation Forest decision score using training score percentiles."
- "Lower decision score → more anomalous → higher risk score"

### 8. Explain Feature Deviation Explanation
- "For each numerical feature, we compute z-score = |value - training_mean| / training_std"
- "The top 3 features with the largest z-scores are reported"
- "This is NOT the internal math of Isolation Forest — it is a supplementary heuristic to explain why a session looks unusual"

### 9. Mention Limitations
- Synthetic dataset (no real network logs available)
- Process spawn per request (not suitable for large-scale production)
- Global statistics (not per-role baselines)

### 10. Mention Future Improvements
- Real campus network logs
- FastAPI inference service
- SHAP for model-intrinsic explainability
- Model monitoring and drift detection
