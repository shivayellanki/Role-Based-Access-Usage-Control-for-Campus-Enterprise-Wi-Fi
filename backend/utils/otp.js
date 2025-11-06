const pool = require('../config/database');
const nodemailer = require('nodemailer');
require('dotenv').config();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (email, otp) => {
  // Always log OTP for debugging/demo
  console.log(`OTP for ${email}: ${otp}`);

  // If mail environment is configured, send email too
  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: Number(process.env.EMAIL_PORT) === 465, // common heuristic
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: 'RB-WiFi Guest Access OTP',
        text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
      });
    } catch (err) {
      console.error('Error sending OTP email:', err.message);
    }
  }

  return true;
};

const createOTPToken = async (email) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await pool.query(
    'INSERT INTO otp_tokens (email, otp_code, expires_at) VALUES ($1, $2, $3)',
    [email, otp, expiresAt]
  );

  await sendOTP(email, otp);
  return otp;
};

const verifyOTP = async (email, otp) => {
  const result = await pool.query(
    `SELECT * FROM otp_tokens 
     WHERE email = $1 AND otp_code = $2 AND expires_at > NOW() AND used = false
     ORDER BY created_at DESC LIMIT 1`,
    [email, otp]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: 'Invalid or expired OTP' };
  }

  // Mark OTP as used
  await pool.query(
    'UPDATE otp_tokens SET used = true WHERE id = $1',
    [result.rows[0].id]
  );

  return { valid: true };
};

module.exports = { createOTPToken, verifyOTP };

