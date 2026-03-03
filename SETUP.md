# Quick Setup Guide

## 1. Prerequisites
- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- npm or yarn

## 2. Database Setup

```bash
# Create database
createdb rbwifi

# Or using psql spatial
psql -U postgres
CREATE DATABASE rbwifi;
\q
```

## 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 4. Configure Environment

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rbwifi
DB_USER=postgres
DB_PASSWORD=your_db_password
JWT_SECRET=change-this-to-a-random-secret-key
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:3000
```

## 5. Initialize Database

```bash
cd backend
npm run setup-db
npm run seed-users
```

This will:
- Create all tables and default roles
- Create default policies
- Create sample users

## 6. Run the Application

From root directory:
```bash
npm run dev
```

Or separately:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start
```

## 7. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000


## 8. Test Login

**Admin:**
- Username: `admin`
- Password: `admin123`

**Student:**
- Username: `student`
- Password: `student123`

**Faculty:**
- Username: `faculty`
- Password: `faculty123`

**Staff:**
- Username: `staff`
- Password: `staff123`

**Guest:**
- Use the Guest login tab
- Enter any email
- Check backend console for OTP code

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Verify DB credentials in `.env`
- Check if database `rbwifi` exists

### Port Already in Use
- Change PORT in backend/.env
- Update FRONTEND_URL if backend port changed

### Module Not Found Errors
- Run `npm install` in both backend and frontend directories
- Delete `node_modules` and reinstall if issues persist

