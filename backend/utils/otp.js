const pool = require('../config/database');
const nodemailer = require('nodemailer');
require('dotenv').config();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Premium branded HTML email template
const buildOTPEmailHTML = (otp, email) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>RB-WiFi OTP</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#2563eb 100%);padding:36px 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 14px;">
                      <span style="font-size:20px;margin-right:8px;">📶</span>
                      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">RB‑WiFi</span>
                      <span style="color:rgba(255,255,255,0.7);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-left:8px;border:1px solid rgba(255,255,255,0.3);border-radius:6px;padding:2px 6px;">ENTERPRISE</span>
                    </div>
                    <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:14px 0 0;letter-spacing:0.2px;">Campus Network Access Control System</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Your Guest Access Code</h2>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
                You requested Wi-Fi access for <strong style="color:#334155;">${email}</strong>. 
                Use the one-time code below to connect.
              </p>

              <!-- OTP Box -->
              <div style="background:#f8faff;border:2px dashed #c7d2fe;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 10px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#6366f1;">One-Time Password</p>
                <div style="letter-spacing:14px;font-size:42px;font-weight:800;color:#4f46e5;font-family:'Courier New',monospace;padding-left:14px;">${otp}</div>
                <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;">⏱ Expires in <strong style="color:#ef4444;">10 minutes</strong></p>
              </div>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:12px 16px;background:#f8fafc;border-radius:10px;border-left:3px solid #4f46e5;">
                    <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;">
                      <strong>How to use:</strong><br/>
                      1. Go back to the RB-WiFi Guest Portal<br/>
                      2. Enter the 6-digit code above<br/>
                      3. You'll be connected instantly
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#94a3b8;margin:0 0 4px;">
                ⚠️ If you did not request this, please ignore this email. Do not share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © 2026 RB-WiFi Enterprise · Campus Network Security System<br/>
                <span style="color:#cbd5e1;">This is an automated email, please do not reply.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Create reusable transporter
let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;

  // Force Node.js to resolve via IPv4 to prevent Render IPv6 outbound blocking
  const dns = require('dns');
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }

  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // allow self-signed certs from institutional domains
      },
    });
  }
  return transporter;
};

const sendOTP = async (email, otp) => {
  console.log(`[OTP] Code for ${email}: ${otp}`);

  const t = getTransporter();
  if (!t) {
    console.warn('[OTP] Email not configured — OTP printed to console only.');
    return true;
  }

  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || `"RB-WiFi Enterprise" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Your RB-WiFi Guest Access Code',
      text: `Your RB-WiFi Guest Access OTP is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
      html: buildOTPEmailHTML(otp, email),
    });
    console.log(`[OTP] Email sent to ${email} — MessageId: ${info.messageId}`);
  } catch (err) {
    console.error('[OTP] Failed to send email:', err.message);
    // Don't throw — OTP is still valid, user can check console fallback
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
