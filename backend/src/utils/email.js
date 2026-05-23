const nodemailer = require("nodemailer");

const EMAIL_PROVIDER = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const requestedPort = parseInt(process.env.SMTP_PORT, 10) || 587;
const isGmailSmtp = SMTP_HOST === "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_EFFECTIVE_PORT, 10) || (isGmailSmtp ? 465 : requestedPort);
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS) || 5000;
const SMTP_SECURE = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE === "true"
  : SMTP_PORT === 465;

const createTransport = ({ port, secure }) => nodemailer.createTransport({
  host: SMTP_HOST,
  port,
  secure,
  pool: true,
  maxConnections: 2,
  maxMessages: 100,
  connectionTimeout: SMTP_TIMEOUT_MS,
  greetingTimeout: SMTP_TIMEOUT_MS,
  socketTimeout: SMTP_TIMEOUT_MS,
  tls: {
    servername: SMTP_HOST,
  },
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const transporter = createTransport({ port: SMTP_PORT, secure: SMTP_SECURE });
const fallbackTransporter = isGmailSmtp
  ? createTransport({ port: SMTP_PORT === 465 ? 587 : 465, secure: SMTP_PORT !== 465 })
  : null;

const ensureEmailConfigured = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const error = new Error("SMTP_USER and SMTP_PASS must be configured to send email.");
    error.code = "SMTP_NOT_CONFIGURED";
    throw error;
  }
};

const sendWithResend = async (mailOptions) => {
  if (!RESEND_API_KEY) {
    const error = new Error("RESEND_API_KEY must be configured to send email with Resend.");
    error.code = "RESEND_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [mailOptions.to],
      subject: mailOptions.subject,
      html: mailOptions.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    let message = body || `Resend API failed with ${response.status}`;
    try {
      message = JSON.parse(body).message || message;
    } catch {
      // Keep the raw provider response when it is not JSON.
    }

    const error = new Error(message);
    error.code = "RESEND_API_ERROR";
    error.responseCode = response.status;
    error.publicMessage = message;
    throw error;
  }

  return response.json();
};

const sendWithSmtp = async (mailOptions) => {
  ensureEmailConfigured();

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    if (!fallbackTransporter) throw error;

    try {
      return await fallbackTransporter.sendMail(mailOptions);
    } catch (fallbackError) {
      fallbackError.primaryCode = error.code;
      fallbackError.primaryCommand = error.command;
      throw fallbackError;
    }
  }
};

const sendMail = async (mailOptions) => {
  if (EMAIL_PROVIDER === "resend") {
    return sendWithResend(mailOptions);
  }

  return sendWithSmtp(mailOptions);
};

const verifyEmailTransport = async () => {
  if (EMAIL_PROVIDER === "resend") {
    if (!RESEND_API_KEY) {
      const error = new Error("RESEND_API_KEY must be configured to send email with Resend.");
      error.code = "RESEND_NOT_CONFIGURED";
      throw error;
    }
    return;
  }

  ensureEmailConfigured();
  try {
    await transporter.verify();
  } catch (error) {
    if (!fallbackTransporter) throw error;
    await fallbackTransporter.verify();
  }
};

const getEmailTransportStatus = () => ({
  provider: EMAIL_PROVIDER,
  resendConfigured: Boolean(RESEND_API_KEY && RESEND_FROM),
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  fallbackPort: fallbackTransporter ? (SMTP_PORT === 465 ? 587 : 465) : null,
  timeoutMs: SMTP_TIMEOUT_MS,
  emailConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
});

const escapeHtml = (value) => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const emailFrame = ({ eyebrow, title, intro, content }) => `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0; background: #eaf7fb;">
      <span style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
        ${escapeHtml(intro)}
      </span>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background: #eaf7fb; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 36px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 560px; border-collapse: separate; border-spacing: 0; background: #ffffff; border: 1px solid #cfe5ec; border-radius: 28px; overflow: hidden; box-shadow: 0 24px 68px rgba(2, 24, 39, 0.16);">
              <tr>
                <td style="padding: 0; background: #06131d;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #06131d 0%, #073344 54%, #075b49 100%);">
                    <tr>
                      <td style="padding: 30px 34px 26px; font-family: 'Segoe UI', Arial, sans-serif;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                          <tr>
                            <td style="width: 58px; height: 58px; border-radius: 18px; background: #ffffff; color: #06131d; font-size: 19px; line-height: 58px; text-align: center; font-weight: 800; letter-spacing: 0;">ST</td>
                            <td style="padding-left: 15px;">
                              <p style="margin: 0 0 4px; color: #9ee8dc; font-size: 12px; line-height: 16px; font-weight: 700; letter-spacing: 0; text-transform: uppercase;">${escapeHtml(eyebrow)}</p>
                              <p style="margin: 0; color: #ffffff; font-size: 25px; line-height: 31px; font-weight: 800; letter-spacing: 0;">SecureTransfer</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 34px; font-family: 'Segoe UI', Arial, sans-serif;">
                  <h1 style="margin: 0 0 10px; color: #071827; font-size: 28px; line-height: 35px; font-weight: 800; letter-spacing: 0;">${escapeHtml(title)}</h1>
                  <p style="margin: 0 0 24px; color: #436174; font-size: 15px; line-height: 24px; letter-spacing: 0;">${escapeHtml(intro)}</p>
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="padding: 0 34px 30px; font-family: 'Segoe UI', Arial, sans-serif;">
                  <div style="height: 1px; background: #e3eef2; line-height: 1px;">&nbsp;</div>
                  <p style="margin: 18px 0 0; color: #6b8796; font-size: 12px; line-height: 19px; letter-spacing: 0;">
                    This message was sent for your SecureTransfer account activity.
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

const sendOTP = async (email, otp) => sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: email,
  subject: "SecureTransfer - Verify your email",
  html: emailFrame({
    eyebrow: "Account verification",
    title: "Verify your email",
    intro: "Enter this one-time code to finish setting up your account.",
    content: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background: #f3fbfc; border: 1px solid #d6ebef; border-radius: 22px;">
        <tr>
          <td align="center" style="padding: 25px 24px 10px; color: #456476; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 18px; font-weight: 700; letter-spacing: 0; text-transform: uppercase;">Verification code</td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px;">
            <div style="background: #071827; border-radius: 18px; padding: 22px 12px; color: #ffffff; font-family: Consolas, 'Courier New', monospace; font-size: 38px; line-height: 44px; font-weight: 800; letter-spacing: 10px; text-indent: 10px;">${escapeHtml(otp)}</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 18px 24px 25px; color: #527184; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 20px; letter-spacing: 0;">
            It expires in 5 minutes. Keep it private.
          </td>
        </tr>
      </table>
    `,
  }),
});

const sendPasswordResetOTP = async (email, otp) => sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: email,
  subject: "SecureTransfer - Reset your password",
  html: emailFrame({
    eyebrow: "Password recovery",
    title: "Reset your password",
    intro: "Use this one-time code to choose a new password for your account.",
    content: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background: #f3fbfc; border: 1px solid #d6ebef; border-radius: 22px;">
        <tr>
          <td align="center" style="padding: 25px 24px 10px; color: #456476; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 18px; font-weight: 700; letter-spacing: 0; text-transform: uppercase;">Reset code</td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px;">
            <div style="background: #071827; border-radius: 18px; padding: 22px 12px; color: #ffffff; font-family: Consolas, 'Courier New', monospace; font-size: 38px; line-height: 44px; font-weight: 800; letter-spacing: 10px; text-indent: 10px;">${escapeHtml(otp)}</div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 18px 24px 25px; color: #527184; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; line-height: 20px; letter-spacing: 0;">
            It expires in 5 minutes. Ignore this email if you did not request it.
          </td>
        </tr>
      </table>
    `,
  }),
});

const sendShareNotification = async (recipientEmail, ownerName, filename) => sendMail({
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
  to: recipientEmail,
  subject: `SecureTransfer - ${ownerName} shared a file with you`,
  html: emailFrame({
    eyebrow: "Shared file",
    title: "A file is ready for you",
    intro: `${ownerName} shared a file in your workspace.`,
    content: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background: #f3fbfc; border: 1px solid #d6ebef; border-radius: 22px;">
        <tr>
          <td style="padding: 22px 24px; font-family: 'Segoe UI', Arial, sans-serif;">
            <p style="margin: 0 0 8px; color: #527184; font-size: 12px; line-height: 18px; font-weight: 700; letter-spacing: 0; text-transform: uppercase;">Shared item</p>
            <p style="margin: 0; color: #071827; font-size: 18px; line-height: 25px; font-weight: 800; letter-spacing: 0;">${escapeHtml(filename)}</p>
            <p style="margin: 12px 0 0; color: #456476; font-size: 14px; line-height: 22px; letter-spacing: 0;">Sign in to review and download it from your shared files.</p>
          </td>
        </tr>
      </table>
    `,
  }),
});

module.exports = {
  sendOTP,
  sendPasswordResetOTP,
  sendShareNotification,
  verifyEmailTransport,
  getEmailTransportStatus,
};
