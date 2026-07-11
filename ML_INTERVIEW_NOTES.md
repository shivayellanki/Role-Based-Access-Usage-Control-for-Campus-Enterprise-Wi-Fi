# ML Interview Notes — RB-WiFi Isolation Forest Integration

Concise, fresher-level answers for 40 potential ML interview questions.

---

### 1. What problem does your ML enhancement solve?
It detects unusual *combinations* of network session behavior (download, upload, login time, duration, violations) that individually fall below fixed rule thresholds but are collectively anomalous.

### 2. Why were fixed rules insufficient?
Fixed rules use a single metric at a time. They miss cases where no single value is extreme but several values are mildly unusual together — exactly the pattern a sophisticated attacker or compromised device might exhibit.

### 3. Is this classification or anomaly detection?
Anomaly Detection. We identify rare sessions that differ significantly from the majority of normal patterns, rather than classifying into predefined labeled categories.

### 4. Why did you choose unsupervised learning?
Campus networks rarely have reliable, labeled datasets of real malicious sessions. Unsupervised learning allows us to learn "normal" behavioral patterns directly from network activity without needing attack labels.

### 5. Why Isolation Forest?
Isolation Forest is designed specifically for anomaly detection in tabular data. It runs efficiently in O(n log n), does not require distance metrics (avoiding the curse of dimensionality), and isolates anomalies directly rather than profiling normal points. It also works well with mixed features after encoding.

### 6. Explain Isolation Forest simply.
It builds many random trees. Each tree randomly picks a feature and splits its value. Anomalies are "few and different" — they have extreme values so they get isolated quickly (short path length). Normal points cluster together and need many more splits.

### 7. How does Isolation Forest isolate anomalies?
It recursively and randomly partitions features. The path length from the root to the leaf where a sample is isolated is the anomaly score. Shorter paths = more anomalous.

### 8. Why are anomalies isolated with shorter path lengths?
Because anomalies have extreme or unusual feature values. A random split along any dimension is likely to cut them off early from the rest of the data. Normal, densely packed points require many more splits to isolate.

### 9. What features did you use?
- `role` (categorical: Student, Faculty, Staff, Guest, Admin)
- `download_mb` (numerical)
- `upload_mb` (numerical)
- `session_duration_minutes` (numerical)
- `login_hour` (numerical, 0-23)
- `violation_count` (numerical)

### 10. Why OneHotEncode role?
ML models require numerical input. Role is a nominal categorical variable (unordered). OneHotEncoder creates 5 binary columns (role_Student, role_Faculty, etc.), preventing the model from assuming a false numerical ordering.

### 11. Why use sklearn Pipeline?
A Pipeline bundles preprocessing and model into a single object. This prevents data leakage during evaluation, simplifies saving and loading, and ensures new inference data is transformed exactly the same way as training data.

### 12. What is contamination?
Contamination is the expected proportion of anomalies in the dataset. It sets the decision threshold for the Isolation Forest. With contamination=0.10, roughly 10% of predictions will be labeled anomalous.

### 13. Why did you compare multiple contamination values?
Because Isolation Forest is unsupervised, there is no built-in supervised scoring function. We manually compared 3 candidates (0.05, 0.10, 0.15) on the Validation set using synthetic evaluation labels, and selected the one with the best F1 score.

### 14. How did you split the dataset?
**70% Train / 15% Validation / 15% Test** — stratified splits to preserve anomaly class proportions:
- **Train**: Fit preprocessing and model (normal rows only)
- **Validation**: Select contamination hyperparameter
- **Test**: Final evaluation, touched exactly once

### 15. How did you evaluate an unsupervised model?
We used synthetic anomaly labels (injected during dataset generation) on the held-out Validation and Test splits. We computed Precision, Recall, F1, Confusion Matrix, ROC-AUC, and PR-AUC.

### 16. Where did labels come from?
Labels (`is_anomaly`) were synthetically generated programmatically alongside the dataset. They represent a controlled ground truth for evaluation purposes only.

### 17. Did Isolation Forest train using labels?
**No.** The model was trained *only* on the normal subset (`is_anomaly == 0`) of the Training split. Labels were entirely withheld from the fitting stage and used only for post-training evaluation.

### 18. What is precision?
Precision = TP / (TP + FP). Of all sessions flagged as anomalous, what fraction were truly anomalous? It measures how reliable the alerts are (minimizing false alarms).

### 19. What is recall?
Recall = TP / (TP + FN). Of all actual anomalies, what fraction did we catch? It measures how well we detect real threats (minimizing missed attacks).

### 20. Why does recall matter in network security?
Missing a real attack (False Negative) can lead to data breaches or system compromise. It is generally safer to catch more threats (higher recall) even if it produces some false alarms (lower precision), as analysts can filter false positives.

### 21. What is F1 score?
F1 = 2 * (Precision * Recall) / (Precision + Recall). The harmonic mean of precision and recall. Particularly useful for imbalanced datasets where anomalies are rare.

### 22. What is ROC-AUC?
Area Under the Receiver Operating Characteristic Curve. Measures how well the model separates anomalies from normals across all decision thresholds. ROC-AUC = 0.9387 means excellent discrimination ability.

### 23. What is PR-AUC?
Area Under the Precision-Recall Curve. More informative than ROC-AUC on imbalanced datasets. PR-AUC = 0.5646 reflects realistic performance given the low base rate of anomalies (9%).

### 24. Explain the confusion matrix for your project.
Final Test set results:
- **TN=136**: Normal sessions correctly identified as normal
- **FP=14**: Normal sessions falsely flagged as anomalies
- **FN=2**: Actual anomalies missed (predicted normal)
- **TP=13**: Actual anomalies correctly caught

### 25. What is overfitting?
When a model learns the noise of training data so specifically that it performs poorly on new, unseen data.

### 26. Can Isolation Forest overfit?
Partially. With very deep trees or very few samples, it might over-adapt to the specific anomalies in training data. Setting n_estimators=100 and using default tree depth constraints provides regularization.

### 27. What is an anomaly score?
The Isolation Forest `decision_function` output. More negative = more anomalous; more positive = more normal. It is **not a probability**.

### 28. Is your risk score a probability?
**No.** The risk score (0-100) is a normalized mapping of the decision score using training score percentiles. It indicates relative risk level, not a statistical probability of attack.

### 29. How did you calculate risk score?
We computed the p5 and p95 of decision scores on the normal training set. A new score is linearly mapped onto [0, 100] by its position between p95 (normal boundary) and p5 (anomaly boundary), clamped within range.

### 30. How does your explainability method work?
For each numerical feature, we compute:
`z_score = |value - training_mean| / training_std`
using statistics from normal training rows only. The top 3 features with z >= 1.0 are reported with human-readable explanations.

### 31. Is feature deviation the same as SHAP?
No. SHAP calculates game-theoretic marginal contributions of each feature to the model output, accounting for feature interactions. Feature deviation is a simpler global univariate heuristic comparing to training averages.

### 32. Why didn't you use SHAP?
SHAP adds computational overhead, requires C++ dependencies, is slow per prediction, and is harder to explain to non-technical stakeholders. For a fresher-level integration, z-score deviations are lightweight, accurate, and clearly explainable.

### 33. Why didn't you use Random Forest?
Random Forest is a supervised classification model and requires labeled training data (normal vs malicious). We have no reliable labels for real production sessions.

### 34. Why didn't you use Logistic Regression?
Also supervised. Also assumes linear relationships. Not suitable for high-dimensional anomaly boundary detection.

### 35. Why didn't you use K-Means?
K-Means is designed for clustering, not anomaly detection directly. It is sensitive to the choice of k, struggles with mixed features, and distance-to-centroid scoring is less reliable than Isolation Forest's path-length mechanism.

### 36. How did you integrate Python ML with Node.js?
Node.js spawns a Python child process via `child_process.spawn`, writes the session JSON to its stdin, reads the prediction JSON from stdout, parses it, and returns it to the frontend. The Python process then exits.

### 37. Why use child_process.spawn with stdin?
Using stdin avoids command-line argument quoting and encoding issues (especially on Windows). The JSON is passed cleanly as a byte stream and does not appear in the process command arguments.

### 38. What happens if Python prediction fails?
The Node ML service catches errors (non-zero exit code, empty output, invalid JSON, timeout), logs them, and returns a safe error response to the API caller without crashing the Express server.

### 39. What are your project's limitations?
1. Synthetic dataset (not real campus traffic)
2. Small dataset (~1,100 sessions)
3. Global statistics for explainability (not per-role)
4. Process spawn overhead per request
5. No temporal/history features

### 40. How did you avoid data leakage?
We split the dataset into Train/Validation/Test before any preprocessing. The Isolation Forest was fit strictly on normal Training rows. Contamination was selected using the Validation set. The Test set was used exactly once for final evaluation. The synthetic `is_anomaly` column was never passed to the model during any stage of fitting.
