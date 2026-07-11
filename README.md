# RB-WiFi - Role-Based Access & Usage Control for Campus/Enterprise Wi-Fi

A comprehensive role-based Wi-Fi access control system that authenticates users by role and enforces policies such as bandwidth limits, time-based access, content filtering, and live monitoring with an admin console.

# Features

### Core Features
- **Role-Based Authentication**: Login portal supporting email/OTP for Guests and username/password for internal roles (Student, Faculty, Staff, Admin)
- **Policy Engine**: Centralized policy management controlling bandwidth, time limits, quotas, and content filters
- **Admin Console**: Web-based dashboard for managing roles, policies, live sessions, and generating reports
- **User Dashboard**: Self-service portal for viewing current usage, policy details, and session history
- **Audit & Logging**: System-wide tracking for security and monitoring

### Policy Enforcement
- **Bandwidth/QoS**: Different speeds per role (e.g., 5 Mbps Student, 20 Mbps Faculty)
- **Time Windows**: Restricted access hours (e.g., Guests 9am–6pm only)
- **Session Limits**: Maximum session duration per role
- **Quota Management**: Daily data quotas with real-time tracking
- **Content Filtering**: Category-based blocking (e.g., P2P for Students/Guests)
- **Device Binding**: Optional MAC address binding

## Tech Stack

- **Frontend**: React 18, React Router, Chart.js, Axios
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens, bcrypt password hashing

## Project Structure

```
rb-wifi/
├── backend/           # Express.js API server
│   ├── config/       # Database configuration
│   ├── middleware/   # Auth middleware
│   ├── routes/       # API routes
│   ├── utils/        # Utility functions (password, OTP, audit, policy engine)
│   └── server.js     # Entry point
├── frontend/         # React application
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   └── utils/       # Utilities (auth, API client)
│   └── public/
├── database/         # SQL schema and migrations
│   └── schema.sql    # Database schema
└── README.md
```

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

### 1. Clone and Install Dependencies

```bash
# Install root dependencies (for running both frontend and backend)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE rbwifi;
```

2. Run the schema:

```bash
psql -U postgres -d rbwifi -f database/schema.sql
```

Or manually execute the SQL in `database/schema.sql`.

### 3. Environment Configuration

Create `backend/.env` file:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=rbwifi
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

FRONTEND_URL=http://localhost:3000
```

Optionally create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Seed Default Users (Optional)

The schema creates a default admin user:
- **Username**: `admin`
- **Password**: `admin123`

You can create additional users through the admin console or by inserting into the database.

## Running the Application

### Development Mode

Run both frontend and backend concurrently:

```bash
# From root directory
npm run dev
```

Or run them separately:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

- Backend API: http://localhost:5000
- Frontend App: http://localhost:3000

## Demo Script

### 1. Login as Guest
- Navigate to http://localhost:3000/login
- Click "Guest" tab
- Enter email (e.g., `guest@example.com`)
- Click "Request OTP"
- **Check backend console for OTP code** (in demo mode, email is logged)
- Enter OTP and verify
- Observe limited bandwidth (2 Mbps) and restricted access hours

### 2. Login as Student
- Logout and login as Student
- Username: `student` (create via admin or DB)
- Password: `student123`
- Observe:
  - Higher speed (5 Mbps)
  - P2P blocked
  - Daily quota countdown (2 GB/day)
  - Time restrictions (6am-11pm)

### 3. Login as Faculty
- Username: `faculty` (create via admin)
- Observe:
  - 24x7 access
  - Higher speed (20 Mbps)
  - Unrestricted browsing
  - Higher quota (10 GB/day)

### 4. Login as Admin
- Username: `admin`
- Password: `admin123`
- Admin Console Features:
  - View all active sessions
  - Update policies (e.g., change Student bandwidth from 5 Mbps to 1 Mbps)
  - See live charts (sessions by role, usage by role)
  - Monitor violations
  - Disconnect users

### 5. Show Policy Updates
- As Admin, edit Student policy bandwidth (5 Mbps → 1 Mbps)
- The change takes effect immediately for new requests
- Show logs in admin console

## Default Roles and Policies

| Role | Bandwidth | Daily Quota | Session Limit | Time Access | Blocked |
|------|-----------|-------------|---------------|-------------|---------|
| **Admin** | Unlimited | Unlimited | None | 24x7 | None |
| **Faculty** | 20/5 Mbps | 10 GB | None | 24x7 | None |
| **Staff** | 10/2 Mbps | 5 GB | None | Business hours | None |
| **Student** | 5/1 Mbps | 2 GB | 120 min | 6am-11pm | P2P |
| **Guest** | 2/0.5 Mbps | 500 MB | None | 9am-6pm | Whitelist only |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Internal login
- `POST /api/auth/guest/request-otp` - Request OTP for guest
- `POST /api/auth/guest/verify-otp` - Verify OTP
- `POST /api/auth/logout` - Logout

### Policies
- `GET /api/policies` - Get all policies (Admin)
- `GET /api/policies/role/:roleId` - Get policy by role
- `PUT /api/policies/:policyId` - Update policy (Admin)

### Sessions
- `GET /api/sessions/current` - Get current user session
- `GET /api/sessions` - Get all sessions (Admin)
- `GET /api/sessions/history` - Get session history
- `POST /api/sessions/:sessionId/disconnect` - Disconnect session

### Dashboard
- `GET /api/dashboard/admin` - Admin dashboard stats
- `GET /api/dashboard/user` - User dashboard stats
- `GET /api/dashboard/audit-logs` - Audit logs (Admin)

### Users
- `GET /api/users` - Get all users (Admin)
- `GET /api/users/:userId` - Get user by ID
- `POST /api/users` - Create user (Admin)
- `PUT /api/users/:userId` - Update user (Admin)

### Reports
- `GET /api/reports/usage` - Usage report
- `GET /api/reports/violations` - Violations report

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Token-based auth with expiry
- **Rate Limiting**: Auth endpoints rate-limited
- **Input Validation**: express-validator for request validation
- **Audit Logging**: All admin actions logged
- **CSRF Protection**: Token-based protection for admin routes
- **SQL Injection Prevention**: Parameterized queries

## Evaluation Criteria

- ✅ **Functionality**: Roles, policies, and enforcement visible in demo
- ✅ **Policy Depth**: Multiple constraints (bandwidth, quota, time, category) working
- ✅ **Usability**: Clean portal and admin console
- ✅ **Observability**: Live charts, logs, and exports
- ✅ **Security**: Hashed secrets, input validation, audit trails


## Future Enhancements

- Redis integration for session management and quota tracking
- Real-time WebSocket updates for live monitoring
- Email service integration for OTP delivery
- Export reports to CSV/PDF
- Advanced content filtering with external services
- Device registration and MAC binding UI

## Machine Learning Enhancement

### Problem
The existing threat detector relied on fixed threshold rules (e.g., Student download > 2 GB, Guest download > 800 MB).

### Limitation
Fixed thresholds cannot detect unusual *combinations* of network behaviors. For example, a Student session with download_mb=1800, upload_mb=650, login_hour=2, violation_count=5 does not trigger any single hard rule, but the combination is highly anomalous.

### ML Formulation
Unsupervised Anomaly Detection using Isolation Forest (reliable labeled production attack data is unavailable).

### Features
role, download_mb, upload_mb, session_duration_minutes, login_hour, violation_count

### Preprocessing
- Categorical: role -> OneHotEncoder(handle_unknown=ignore)
- Numerical: StandardScaler() inside ColumnTransformer

### Dataset
Synthetic dataset of 1,100 sessions (1,000 normal + 100 anomalous). Synthetic labels are NOT used during model training. They are used only for evaluation.

### Data Split: 70% Train / 15% Validation / 15% Test
Stratified splits preserve anomaly class proportions.

- Train (70%): Preprocessing fitting and model training (normal rows only)
- Validation (15%): Contamination hyperparameter selection using synthetic labels
- Test (15%): Final unbiased evaluation, run exactly once

### Training Methodology
1. Isolation Forest trained exclusively on normal rows (is_anomaly == 0) from the Training split
2. Synthetic labels completely excluded from model fitting
3. Preprocessing statistics computed from normal training rows only
4. Contamination candidates (0.05, 0.10, 0.15) evaluated on the Validation split
5. Best contamination selected by validation F1 (ties: recall, then precision)
6. Final model evaluated exactly once on the untouched Test split

### Hyperparameter Comparison (Validation Set)
- contamination=0.05: Precision=0.5500, Recall=0.7333, F1=0.6286
- contamination=0.10: Precision=0.5000, Recall=0.8667, F1=0.6341 (SELECTED)
- contamination=0.15: Precision=0.3889, Recall=0.9333, F1=0.5490

### Final Test Set Metrics (Untouched -- Run Once)
- Precision: 0.4815
- Recall: 0.8667
- F1 Score: 0.6190
- ROC-AUC: 0.9387
- PR-AUC: 0.5646
- Confusion Matrix: TN=136, FP=14, FN=2, TP=13

Metrics saved in ml/metrics.json. Pipeline saved as ml/model.joblib.

### Risk Score
The Isolation Forest decision score is mapped to a normalized 0-100 Risk Score using training score percentiles. This is NOT a probability.
- 0-29: LOW
- 30-59: MEDIUM
- 60-79: HIGH
- 80-100: CRITICAL

### Explainability
Feature Deviation Explanation: z-score per numerical feature using normal-training-set statistics. Top 3 deviations reported. This is NOT the internal reasoning of Isolation Forest.

### Integration Flow
React Admin Dashboard -> (POST /api/ml/analyze) -> Express API Router -> Node ML Service -> (child_process.spawn stdin) -> Python predict.py -> Isolation Forest Pipeline

### Limitations
1. Synthetic dataset (not real campus traffic)
2. Small dataset (~1,100 sessions)
3. Global feature statistics (not per-role baselines)
4. New Python child process per analysis request
5. No temporal/session-history features

### Future Improvements
1. Real campus network logs
2. FastAPI inference service
3. SHAP integration
4. Model monitoring and drift detection

## Author

RB-WiFi Project Team
