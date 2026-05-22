const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const card = (content) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #0f172a; padding: 12px; border-radius: 12px; color: #fff; font-weight: 700;">ST</div>
      <h2 style="margin: 12px 0 4px; color: #0f172a; font-size: 20px;">SecureTransfer</h2>
    </div>
    ${content}
  </div>
`;

const sendOTP = async (email, otp) => transporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: email,
  subject: "SecureTransfer - Verify your email",
  html: card(`
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
      <p style="color: #334155; font-size: 14px; margin: 0 0 16px;">Your verification code is:</p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #0f172a; font-family: monospace;">
        ${escapeHtml(otp)}
      </div>
      <p style="color: #64748b; font-size: 12px; margin: 16px 0 0;">This code expires in 5 minutes. Do not share it.</p>
    </div>
  `),
});

const sendShareNotification = async (recipientEmail, ownerName, filename) => transporter.sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: recipientEmail,
  subject: `SecureTransfer - ${ownerName} shared a file with you`,
  html: card(`
    <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
      <p style="color: #334155; font-size: 14px; margin: 0 0 12px;">
        <strong>${escapeHtml(ownerName)}</strong> shared a file with you:
      </p>
      <div style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px;">
        <p style="margin: 0; font-weight: 600; color: #0f172a; font-size: 14px;">${escapeHtml(filename)}</p>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Ready in your shared files area</p>
      </div>
      <p style="color: #475569; font-size: 13px; margin: 16px 0 0;">Sign in to review and download it.</p>
    </div>
  `),
});

module.exports = { sendOTP, sendShareNotification };
