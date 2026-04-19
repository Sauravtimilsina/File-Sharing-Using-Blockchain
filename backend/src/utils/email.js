const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "SecureTransfer — Verify Your Email",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fafafa; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #111; padding: 12px; border-radius: 12px;">
            <span style="color: #fff; font-size: 20px; font-weight: bold;">🛡️</span>
          </div>
          <h2 style="margin: 12px 0 4px; color: #111; font-size: 20px;">SecureTransfer</h2>
          <p style="color: #666; font-size: 14px; margin: 0;">Email Verification</p>
        </div>
        <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #333; font-size: 14px; margin: 0 0 16px;">Your one-time verification code is:</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; letter-spacing: 8px; font-size: 32px; font-weight: bold; color: #111; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #999; font-size: 12px; margin: 16px 0 0;">This code expires in <strong>5 minutes</strong>. Do not share it with anyone.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

const sendShareNotification = async (recipientEmail, ownerName, filename) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipientEmail,
    subject: `SecureTransfer — ${ownerName} shared a file with you`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fafafa; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #111; padding: 12px; border-radius: 12px;">
            <span style="color: #fff; font-size: 20px; font-weight: bold;">🛡️</span>
          </div>
          <h2 style="margin: 12px 0 4px; color: #111; font-size: 20px;">SecureTransfer</h2>
          <p style="color: #666; font-size: 14px; margin: 0;">File Sharing Notification</p>
        </div>
        <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px;">
          <p style="color: #333; font-size: 14px; margin: 0 0 12px;">
            <strong>${ownerName}</strong> has shared a file with you:
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">📄</span>
            <div>
              <p style="margin: 0; font-weight: 600; color: #111; font-size: 14px;">${filename}</p>
              <p style="margin: 2px 0 0; color: #999; font-size: 12px;">End-to-end encrypted · Blockchain verified</p>
            </div>
          </div>
          <p style="color: #666; font-size: 13px; margin: 16px 0 0;">Log in to SecureTransfer to download and verify this file.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOTP, sendShareNotification };
