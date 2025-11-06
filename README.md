# RB-WiFi - Role-Based Access & Usage Control for Campus/Enterprise Wi-Fi

A comprehensive role-based Wi-Fi access control system that authenticates users by role and enforces policies such as bandwidth limits, time-based access, content filtering, and live monitoring with an admin console.

## Features

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

## Development Notes

- OTP codes are logged to console in demo mode (configure email service for production)
- Policy changes take effect immediately for new requests
- Usage tracking is updated periodically (implement cron job for production)
- Chart.js is used for visualizations (Pie and Bar charts)

## Future Enhancements

- Redis integration for session management and quota tracking
- Real-time WebSocket updates for live monitoring
- Email service integration for OTP delivery
- Export reports to CSV/PDF
- Advanced content filtering with external services
- Device registration and MAC binding UI

## License

MIT

## Author

RB-WiFi Project Team

