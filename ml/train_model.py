"""
train_model.py
--------------
Trains an Isolation Forest pipeline for unsupervised anomaly detection on
network sessions.

Methodology details:
  - Dataset split: 70% Train, 15% Validation, 15% Test.
  - Stratification based on synthetic is_anomaly labels is used for splitting.
  - Training: The preprocessing and Isolation Forest are trained ONLY on normal
    rows (is_anomaly == 0) from the Training split.
  - Hyperparameter tuning: Contamination values (0.05, 0.10, 0.15) are compared
    on the Validation split using synthetic is_anomaly labels.
  - Selection: Selected contamination is the one with the highest F1 score.
    Ties are broken by: 1. Higher recall, 2. Higher precision, 3. Middle value (0.10).
  - Evaluation: The selected model is evaluated exactly once on the untouched Test set.
  - Test Metrics: Precision, Recall, F1, Confusion Matrix, ROC-AUC, and PR-AUC (Average Precision).
  - Score percentiles & statistics: Computed strictly on normal training rows.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score, confusion_matrix,
    roc_auc_score, average_precision_score
)
from sklearn.model_selection import train_test_split

SEED = 42
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH   = os.path.join(SCRIPT_DIR, "network_sessions.csv")
MODEL_PATH  = os.path.join(SCRIPT_DIR, "model.joblib")
METRICS_PATH = os.path.join(SCRIPT_DIR, "metrics.json")
STATS_PATH   = os.path.join(SCRIPT_DIR, "training_stats.json")

# Feature columns
CATEGORICAL_FEATURES = ["role"]
NUMERICAL_FEATURES   = [
    "download_mb",
    "upload_mb",
    "session_duration_minutes",
    "login_hour",
    "violation_count",
]
ALL_FEATURES = CATEGORICAL_FEATURES + NUMERICAL_FEATURES


def load_data():
    df = pd.read_csv(DATA_PATH)
    X = df[ALL_FEATURES]
    y = df["is_anomaly"]   # used only for evaluation
    return X, y


def build_pipeline(contamination: float) -> Pipeline:
    preprocessor = ColumnTransformer(transformers=[
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False),
         CATEGORICAL_FEATURES),
        ("num", StandardScaler(), NUMERICAL_FEATURES),
    ])

    model = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=SEED,
    )

    return Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", model),
    ])


def evaluate(pipeline, X_eval, y_eval):
    """
    Isolation Forest returns:  1 -> normal,  -1 -> anomaly
    Our labels use:            0 -> normal,   1 -> anomaly
    """
    raw_pred = pipeline.predict(X_eval)
    y_pred = (raw_pred == -1).astype(int)   # -1 (anomaly) -> 1

    precision = precision_score(y_eval, y_pred, zero_division=0)
    recall    = recall_score(y_eval, y_pred, zero_division=0)
    f1        = f1_score(y_eval, y_pred, zero_division=0)
    cm        = confusion_matrix(y_eval, y_pred).tolist()

    return {
        "precision": round(precision, 4),
        "recall":    round(recall, 4),
        "f1_score":  round(f1, 4),
        "confusion_matrix": cm,
    }


def compare_contamination(X_train_normal, X_val, y_val):
    candidates = [0.05, 0.10, 0.15]
    print("\n--- Hyperparameter Comparison: contamination values on Validation Set ---")
    best_f1 = -1
    best_recall = -1
    best_precision = -1
    best_contamination = 0.10
    best_metrics = {}
    best_pipeline = None
    validation_results = {}

    for c in candidates:
        pipe = build_pipeline(contamination=c)
        pipe.fit(X_train_normal)
        m = evaluate(pipe, X_val, y_val)
        validation_results[f"{c:.2f}"] = m
        print(f"  contamination={c:.2f}  -> precision={m['precision']:.4f}  "
              f"recall={m['recall']:.4f}  f1={m['f1_score']:.4f}")

        is_better = False
        if m["f1_score"] > best_f1:
            is_better = True
        elif m["f1_score"] == best_f1:
            if m["recall"] > best_recall:
                is_better = True
            elif m["recall"] == best_recall:
                if m["precision"] > best_precision:
                    is_better = True
                elif m["precision"] == best_precision:
                    # Tied completely: prefer middle value 0.10 if available
                    if c == 0.10 or (best_contamination != 0.10 and c == 0.15):
                        is_better = True

        if is_better:
            best_f1 = m["f1_score"]
            best_recall = m["recall"]
            best_precision = m["precision"]
            best_contamination = c
            best_metrics = m
            best_pipeline = pipe

    print(f"\nSelected contamination = {best_contamination} (F1 = {best_f1:.4f}, Recall = {best_recall:.4f})")
    return best_pipeline, best_contamination, best_metrics, validation_results


def compute_training_stats(X_train_normal: pd.DataFrame) -> dict:
    stats = {}
    for col in NUMERICAL_FEATURES:
        mean = float(X_train_normal[col].mean())
        std  = float(X_train_normal[col].std())
        stats[col] = {
            "mean": mean,
            "std":  std if std > 0 else 1.0,  # Safe handling for zero std
        }
    return stats


def main():
    # -----------------------------------------------------------------------
    # 1. Load data
    # -----------------------------------------------------------------------
    print("Loading dataset...")
    X, y = load_data()
    print(f"Total samples: {len(X)}  |  Normal: {(y == 0).sum()}  |  Anomalous: {(y == 1).sum()}")

    # -----------------------------------------------------------------------
    # 2. Split data: 70% Train, 15% Validation, 15% Test
    # -----------------------------------------------------------------------
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=SEED, stratify=y
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=SEED, stratify=y_temp
    )

    # -----------------------------------------------------------------------
    # 3. Filter training data: train strictly on normal sessions only
    # -----------------------------------------------------------------------
    X_train_normal = X_train[y_train == 0]
    print(f"\nSplit sizes:")
    print(f"  Train set (normal fit): {len(X_train_normal)} normal sessions (total train: {len(X_train)})")
    print(f"  Validation set:         {len(X_val)} sessions ({y_val.sum()} anomalous)")
    print(f"  Test set:               {len(X_test)} sessions ({y_test.sum()} anomalous)")

    # -----------------------------------------------------------------------
    # 4. Hyperparameter comparison on Validation Split
    # -----------------------------------------------------------------------
    best_pipeline, best_contamination, val_best_metrics, validation_results = compare_contamination(
        X_train_normal, X_val, y_val
    )

    # -----------------------------------------------------------------------
    # 5. Evaluate final selected model exactly once on untouched Test Split
    # -----------------------------------------------------------------------
    test_metrics = evaluate(best_pipeline, X_test, y_test)

    # Calculate ROC-AUC and PR-AUC using -decision_function
    # More anomalous -> lower (negative) decision score -> higher outlier score
    outlier_scores = -best_pipeline.decision_function(X_test)
    roc_auc = float(roc_auc_score(y_test, outlier_scores))
    pr_auc  = float(average_precision_score(y_test, outlier_scores))

    test_metrics["roc_auc"] = round(roc_auc, 4)
    test_metrics["pr_auc"]  = round(pr_auc, 4)

    # -----------------------------------------------------------------------
    # 6. Compute & save training statistics (from normal training data ONLY)
    # -----------------------------------------------------------------------
    training_stats = compute_training_stats(X_train_normal)

    # Get decision scores on normal training set for percentile normalization
    train_scores = best_pipeline.decision_function(X_train_normal)
    training_stats["score_percentiles"] = {
        "p5":  float(np.percentile(train_scores, 5)),
        "p50": float(np.percentile(train_scores, 50)),
        "p95": float(np.percentile(train_scores, 95)),
        "min": float(train_scores.min()),
        "max": float(train_scores.max()),
    }
    training_stats["selected_contamination"] = best_contamination

    with open(STATS_PATH, "w") as f:
        json.dump(training_stats, f, indent=2)
    print(f"\nTraining stats saved -> {STATS_PATH}")

    # -----------------------------------------------------------------------
    # 7. Save metrics JSON in structured format
    # -----------------------------------------------------------------------
    metrics_output = {
        "model": "Isolation Forest",
        "problem_type": "Unsupervised Anomaly Detection",
        "selected_contamination": best_contamination,
        "data_split": {
            "train_percentage": 70,
            "validation_percentage": 15,
            "test_percentage": 15,
            "random_state": SEED
        },
        "training": {
            "total_train_rows": len(X_train),
            "normal_rows_used_for_fit": len(X_train_normal)
        },
        "validation_results": validation_results,
        "final_test_metrics": test_metrics
    }

    with open(METRICS_PATH, "w") as f:
        json.dump(metrics_output, f, indent=2)
    print(f"Metrics saved        -> {METRICS_PATH}")

    # Save pipeline joblib
    joblib.dump(best_pipeline, MODEL_PATH)
    print(f"Model saved          -> {MODEL_PATH}")

    # -----------------------------------------------------------------------
    # 8. Print final evaluation summary
    # -----------------------------------------------------------------------
    print("\n========== FINAL TEST SET EVALUATION (UNTOUCHED) ==========")
    print(f"Model         : Isolation Forest")
    print(f"Contamination : {best_contamination}")
    print(f"Precision     : {test_metrics['precision']:.4f}")
    print(f"Recall        : {test_metrics['recall']:.4f}")
    print(f"F1 Score      : {test_metrics['f1_score']:.4f}")
    print(f"ROC-AUC       : {test_metrics['roc_auc']:.4f}")
    print(f"PR-AUC        : {test_metrics['pr_auc']:.4f}")
    print(f"Confusion Matrix:")
    cm = test_metrics["confusion_matrix"]
    print(f"  TN={cm[0][0]}  FP={cm[0][1]}")
    print(f"  FN={cm[1][0]}  TP={cm[1][1]}")
    print("===========================================================")


if __name__ == "__main__":
    main()
