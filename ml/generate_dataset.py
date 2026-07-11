"""
generate_dataset.py
-------------------
Generates a synthetic network-session dataset for RB-WiFi ML anomaly detection.

- 1000 normal sessions based on realistic per-role behavior
- 100 anomalous sessions with injected unusual patterns
- is_anomaly column is for evaluation ONLY — never used in model training
- Random seed = 42 for full reproducibility

Run:
    python ml/generate_dataset.py
"""

import numpy as np
import pandas as pd
import os

SEED = 42
rng = np.random.default_rng(SEED)

# ---------------------------------------------------------------------------
# Per-role normal behavior distributions
# ---------------------------------------------------------------------------
ROLE_PROFILES = {
    "Student": dict(
        download_mean=400,  download_std=200,   download_clip=(10, 1800),
        upload_mean=80,     upload_std=40,      upload_clip=(1,  400),
        duration_mean=90,   duration_std=40,    duration_clip=(5, 300),
        login_hours=list(range(7, 23)),         # 7 AM – 10 PM
        violation_lambda=0.5,                   # Poisson λ
    ),
    "Faculty": dict(
        download_mean=700,  download_std=300,   download_clip=(50, 2500),
        upload_mean=150,    upload_std=80,      upload_clip=(5,  600),
        duration_mean=180,  duration_std=60,    duration_clip=(30, 480),
        login_hours=list(range(7, 20)),         # 7 AM – 7 PM
        violation_lambda=0.2,
    ),
    "Staff": dict(
        download_mean=300,  download_std=120,   download_clip=(20, 900),
        upload_mean=60,     upload_std=30,      upload_clip=(2,  250),
        duration_mean=120,  duration_std=40,    duration_clip=(10, 300),
        login_hours=list(range(8, 18)),         # 8 AM – 5 PM  (office hours)
        violation_lambda=0.15,
    ),
    "Guest": dict(
        download_mean=100,  download_std=60,    download_clip=(5, 500),
        upload_mean=20,     upload_std=15,      upload_clip=(1,  100),
        duration_mean=30,   duration_std=20,    duration_clip=(5, 120),
        login_hours=list(range(9, 21)),         # 9 AM – 8 PM
        violation_lambda=0.3,
    ),
    "Admin": dict(
        download_mean=500,  download_std=300,   download_clip=(10, 2000),
        upload_mean=200,    upload_std=150,     upload_clip=(5,  800),
        duration_mean=200,  duration_std=80,    duration_clip=(10, 600),
        login_hours=list(range(6, 24)),         # wide window
        violation_lambda=0.1,
    ),
}

ROLES = list(ROLE_PROFILES.keys())
NORMAL_COUNT = 1000
ANOMALY_COUNT = 100


def generate_normal_sessions(n: int) -> pd.DataFrame:
    """Generate n normal sessions drawn from per-role distributions."""
    rows = []
    role_weights = [0.40, 0.25, 0.15, 0.12, 0.08]   # realistic campus proportions

    chosen_roles = rng.choice(ROLES, size=n, p=role_weights)

    for role in chosen_roles:
        p = ROLE_PROFILES[role]

        download = float(np.clip(
            rng.normal(p["download_mean"], p["download_std"]), *p["download_clip"]
        ))
        upload = float(np.clip(
            rng.normal(p["upload_mean"],   p["upload_std"]),   *p["upload_clip"]
        ))
        duration = float(np.clip(
            rng.normal(p["duration_mean"], p["duration_std"]), *p["duration_clip"]
        ))
        login_hour = int(rng.choice(p["login_hours"]))
        violations = int(rng.poisson(p["violation_lambda"]))

        rows.append({
            "role": role,
            "download_mb": round(download, 2),
            "upload_mb": round(upload, 2),
            "session_duration_minutes": round(duration, 1),
            "login_hour": login_hour,
            "violation_count": violations,
            "is_anomaly": 0,
        })

    return pd.DataFrame(rows)


def generate_anomalous_sessions(n: int) -> pd.DataFrame:
    """Inject n anomalous sessions covering various unusual patterns."""
    rows = []

    anomaly_types = [
        "extreme_download",
        "extreme_upload",
        "very_long_session",
        "unusual_login_time",
        "high_violations",
        "combined_behavioral",
    ]

    for i in range(n):
        role = rng.choice(ROLES)
        atype = anomaly_types[i % len(anomaly_types)]

        # Base reasonable values
        download = float(rng.uniform(100, 500))
        upload = float(rng.uniform(20, 100))
        duration = float(rng.uniform(30, 120))
        login_hour = int(rng.integers(8, 20))
        violations = 0

        if atype == "extreme_download":
            download = float(rng.uniform(3000, 8000))    # massive download
        elif atype == "extreme_upload":
            upload = float(rng.uniform(1000, 4000))      # massive upload
        elif atype == "very_long_session":
            duration = float(rng.uniform(600, 1440))     # 10–24 hours
        elif atype == "unusual_login_time":
            login_hour = int(rng.choice([0, 1, 2, 3, 4, 5]))   # wee hours
            download = float(rng.uniform(400, 1500))
        elif atype == "high_violations":
            violations = int(rng.integers(8, 20))        # many violations
            download = float(rng.uniform(300, 1000))
        elif atype == "combined_behavioral":
            # Multiple mild-but-combined anomalies
            download = float(rng.uniform(1500, 3500))
            upload = float(rng.uniform(500, 1500))
            duration = float(rng.uniform(300, 600))
            login_hour = int(rng.choice([2, 3, 4, 23]))
            violations = int(rng.integers(4, 10))

        rows.append({
            "role": role,
            "download_mb": round(download, 2),
            "upload_mb": round(upload, 2),
            "session_duration_minutes": round(duration, 1),
            "login_hour": login_hour,
            "violation_count": violations,
            "is_anomaly": 1,
        })

    return pd.DataFrame(rows)


def main():
    normal_df = generate_normal_sessions(NORMAL_COUNT)
    anomaly_df = generate_anomalous_sessions(ANOMALY_COUNT)

    # Combine and shuffle
    dataset = pd.concat([normal_df, anomaly_df], ignore_index=True)
    dataset = dataset.sample(frac=1, random_state=SEED).reset_index(drop=True)

    output_path = os.path.join(os.path.dirname(__file__), "network_sessions.csv")
    dataset.to_csv(output_path, index=False)

    print(f"Dataset saved to: {output_path}")
    print(f"Total rows      : {len(dataset)}")
    print(f"Normal sessions : {(dataset.is_anomaly == 0).sum()}")
    print(f"Anomalous       : {(dataset.is_anomaly == 1).sum()}")
    print(f"\nSample preview:\n{dataset.head()}")
    print(f"\nFeature stats:\n{dataset.drop(columns=['is_anomaly']).describe().round(2)}")


if __name__ == "__main__":
    main()
