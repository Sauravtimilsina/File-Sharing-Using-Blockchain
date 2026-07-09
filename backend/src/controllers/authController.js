const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const repositories = require("../repositories");
const { sendOTP: sendOTPEmail, sendPasswordResetOTP } = require("../utils/email");
const { recordLoginAudit } = require("../utils/audit");
const { equalOtpHash, hashOtp } = require("../utils/otp");
const {
  cleanEmail,
  cleanUsername,
  isEmail,
  isPassword,
  isUsername,
} = require("../utils/validation");

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKED_ACCOUNT_MESSAGE = "Your account is locked due to multiple failed login attempts. Please contact admin.";
const DUMMY_PASSWORD_HASH = "$2b$10$u1W6mXXzT6vquTTVj33Y8OJL9knczxtWtS68CX/F4lYfEHgIH5wry";
const LOCK_DURATIONS_MS = [
  10 * 60 * 1000,
  30 * 60 * 1000,
  60 * 60 * 1000,
  2 * 60 * 60 * 1000,
  4 * 60 * 60 * 1000,
  8 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
];
const PROFILE_TEXT_LIMITS = {
  fullName: 80,
  jobTitle: 80,
  department: 80,
  phone: 30,
  bio: 240,
};
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
    issuer: "secure-transfer-api",
    audience: "secure-transfer-web",
  });
};


const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const userPayload = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  fullName: user.fullName || "",
  jobTitle: user.jobTitle || "",
  department: user.department || "",
  phone: user.phone || "",
  bio: user.bio || "",
  avatarDataUrl: user.avatarDataUrl || "",
});

const cleanProfileText = (value, maxLength) => (
  typeof value === "string"
    ? value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maxLength)
    : ""
);

const todayKey = () => new Date().toISOString().slice(0, 10);

const nextLock = (user) => {
  const today = todayKey();
  const sameDay = user.lockCountDate
    && new Date(user.lockCountDate).toISOString().slice(0, 10) === today;
  const dailyLockCount = sameDay ? Number(user.dailyLockCount || 0) + 1 : 1;
  const duration = LOCK_DURATIONS_MS[Math.min(dailyLockCount - 1, LOCK_DURATIONS_MS.length - 1)];

  return {
    dailyLockCount,
    lockCountDate: today,
    lockedUntil: new Date(Date.now() + duration),
  };
};

const canExposeDevOtp = () => process.env.NODE_ENV !== "production" && process.env.DEV_SHOW_OTP === "true";
const devOtpPayload = (otp) => (canExposeDevOtp() ? { devOtp: otp } : {});

const smtpFailureMessage = (error) => {
  if (error?.publicMessage) {
    return `Failed to send verification email. ${error.publicMessage}`;
  }

  const detail = error?.code || error?.responseCode || error?.command || "SMTP_ERROR";
  return `Failed to send verification email. Check email settings. (${detail})`;
};

const register = async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);
    const email = cleanEmail(req.body.email);
    const { password } = req.body;

    if (!isUsername(username) || !isEmail(email) || !isPassword(password)) {
      return res.status(400).json({
        message: "Use a valid email, a 3-48 character username, and a password of 8-128 characters.",
      });
    }


    const existingUser = await repositories.users.findExisting({ email, username });

    if (existingUser) {

      if (!existingUser.isVerified && existingUser.email === email) {

        const salt = await bcrypt.genSalt(10);
        await repositories.users.updateUnverifiedCredentials(existingUser._id, {
          username,
          password: await bcrypt.hash(password, salt),
        });


        await repositories.otps.deleteByEmail(email);
        const otp = generateOTP();
        await repositories.otps.create({
          email,
          otpHash: hashOtp(email, otp),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        try {
          await sendOTPEmail(email, otp);
        } catch (emailErr) {
          console.error(`Verification OTP email failed for ${email}:`, emailErr.message);
          return res.status(502).json({ message: smtpFailureMessage(emailErr) });
        }

        return res.status(200).json({
          message: "Verification code sent to your email",
          email,
          requiresVerification: true,
          ...devOtpPayload(otp),
        });
      }
      return res.status(400).json({ message: "User already exists with that email or username" });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    const user = await repositories.users.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
    });


    const otp = generateOTP();
    await repositories.otps.create({
      email,
      otpHash: hashOtp(email, otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.error(`Verification OTP email failed for ${email}:`, emailErr.message);
      return res.status(502).json({ message: smtpFailureMessage(emailErr) });
    }

    res.status(201).json({
      message: "Verification code sent to your email",
      email,
      requiresVerification: true,
      ...devOtpPayload(otp),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const verifyOTP = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";

    if (!isEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Please provide email and OTP" });
    }


    const otpRecord = await repositories.otps.findLatestByEmail(email);
    const otpMatches = otpRecord?.otpHash
      ? equalOtpHash(otpRecord.otpHash, hashOtp(email, otp))
      : otpRecord?.otp === otp;

    if (!otpRecord || !otpMatches) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }


    if (new Date(otpRecord.expiresAt) < new Date()) {
      await repositories.otps.deleteByEmail(email);
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }


    const user = await repositories.users.findByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(423).json({ message: LOCKED_ACCOUNT_MESSAGE });
    }

    await repositories.users.markVerified(user._id);


    await repositories.otps.deleteByEmail(email);


    const token = generateToken(user._id);

    res.status(200).json({
      message: "Email verified successfully",
      token,
      user: userPayload(user),
    });
  } catch (error) {
    console.error("VerifyOTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const resendOTP = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);

    if (!isEmail(email)) {
      return res.status(400).json({ message: "Please provide email" });
    }

    const user = await repositories.users.findByEmail(email);
    if (!user) {
      return res.status(200).json({ message: "If that account needs a new code, it will be sent." });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: "If that account needs a new code, it will be sent." });
    }


    await repositories.otps.deleteByEmail(email);
    const otp = generateOTP();
    await repositories.otps.create({
      email,
      otpHash: hashOtp(email, otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.error(`Verification OTP resend failed for ${email}:`, emailErr.message);
      return res.status(500).json({ message: smtpFailureMessage(emailErr) });
    }

    res.status(200).json({
      message: "New verification code sent to your email",
      ...devOtpPayload(otp),
    });
  } catch (error) {
    console.error("ResendOTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const safeMessage = "If an account exists for that email, a reset code has been sent.";

    if (!isEmail(email)) {
      return res.status(200).json({ message: safeMessage });
    }

    const user = await repositories.users.findByEmail(email);
    if (!user || !user.isVerified) {
      return res.status(200).json({ message: safeMessage });
    }

    await repositories.otps.deleteByEmail(email, "password_reset");
    const otp = generateOTP();
    await repositories.otps.create({
      email,
      purpose: "password_reset",
      otpHash: hashOtp(email, otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    try {
      await sendPasswordResetOTP(email, otp);
    } catch (emailErr) {
      console.error("Password reset email error:", emailErr.message);
    }

    return res.status(200).json({ message: safeMessage });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
    const { password } = req.body;

    if (!isEmail(email) || !/^\d{6}$/.test(otp) || !isPassword(password)) {
      return res.status(400).json({ message: "Use the reset code and a password of 8-128 characters." });
    }

    const [user, otpRecord] = await Promise.all([
      repositories.users.findByEmail(email),
      repositories.otps.findLatestByEmail(email, "password_reset"),
    ]);
    const otpMatches = otpRecord?.otpHash
      ? equalOtpHash(otpRecord.otpHash, hashOtp(email, otp))
      : false;

    if (!user || !otpRecord || !otpMatches || new Date(otpRecord.expiresAt) < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset code." });
    }

    const salt = await bcrypt.genSalt(10);
    await repositories.users.updatePassword(user._id, await bcrypt.hash(password, salt), { resetLock: false });
    await repositories.otps.deleteByEmail(email, "password_reset");
    await recordLoginAudit(req, {
      userId: user._id,
      identifier: email,
      eventType: "success",
      reason: "password_reset",
    });

    return res.status(200).json({ message: "Password updated. Sign in with your new password." });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};



const login = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const { password } = req.body;

    if (!isEmail(email) || typeof password !== "string" || !password || password.length > 128) {
      return res.status(400).json({ message: "Invalid login credentials." });
    }

    const user = await repositories.users.findByEmail(email);
    const locked = user?.lockedUntil && new Date(user.lockedUntil) > new Date();
    if (locked) {
      await recordLoginAudit(req, {
        userId: user._id,
        identifier: email,
        eventType: "locked",
        reason: "account_locked",
      });
      return res.status(423).json({ message: LOCKED_ACCOUNT_MESSAGE });
    }

    const isMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      if (user) {
        const shouldLock = Number(user.failedLoginAttempts || 0) + 1 >= MAX_FAILED_LOGIN_ATTEMPTS;
        await repositories.users.recordLoginFailure(user._id, shouldLock ? nextLock(user) : {});
      }
      await recordLoginAudit(req, {
        userId: user?._id,
        identifier: email,
        eventType: "failure",
        reason: user ? "invalid_password" : "unknown_account",
      });
      return res.status(400).json({ message: "Invalid login credentials." });
    }

    if (!user.isVerified) {
      await recordLoginAudit(req, {
        userId: user._id,
        identifier: email,
        eventType: "failure",
        reason: "unverified_account",
      });
      return res.status(403).json({
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    await repositories.users.recordLoginSuccess(user._id, req.ip);
    await recordLoginAudit(req, {
      userId: user._id,
      identifier: email,
      eventType: "success",
      reason: "login",
    });
    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: userPayload(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const getMe = async (req, res) => {
  try {
    const user = await repositories.users.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: userPayload(user),
    });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getMyActivity = async (req, res) => {
  try {
    const activity = await repositories.activityAuditLogs.findRecentByActor(req.user.id, 40);
    return res.status(200).json({ activity });
  } catch (error) {
    console.error("Get activity error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);
    const fullName = cleanProfileText(req.body.fullName, PROFILE_TEXT_LIMITS.fullName);
    const jobTitle = cleanProfileText(req.body.jobTitle, PROFILE_TEXT_LIMITS.jobTitle);
    const department = cleanProfileText(req.body.department, PROFILE_TEXT_LIMITS.department);
    const phone = cleanProfileText(req.body.phone, PROFILE_TEXT_LIMITS.phone);
    const bio = cleanProfileText(req.body.bio, PROFILE_TEXT_LIMITS.bio);

    if (!isUsername(username)) {
      return res.status(400).json({ message: "Use a 3-48 character username with letters, numbers, dots, dashes, or underscores." });
    }

    if (phone && !/^[0-9+() .-]{7,30}$/.test(phone)) {
      return res.status(400).json({ message: "Use a valid phone number." });
    }

    const existingUser = await repositories.users.findByUsername(username);
    if (existingUser && existingUser._id !== req.user.id) {
      return res.status(400).json({ message: "That username is already in use." });
    }

    const user = await repositories.users.updateProfile(req.user.id, {
      username,
      fullName,
      jobTitle,
      department,
      phone,
      bio,
    });

    return res.status(200).json({
      message: "Profile updated.",
      user: userPayload(user),
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Choose a profile image." });
    }

    if (!ALLOWED_AVATAR_TYPES.has(req.file.mimetype)) {
      return res.status(400).json({ message: "Use a JPG, PNG, or WEBP profile image." });
    }

    const avatarDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const user = await repositories.users.updateAvatar(req.user.id, avatarDataUrl);
    await recordLoginAudit(req, {
      userId: user._id,
      identifier: user.email,
      eventType: "success",
      reason: "avatar_update",
    });

    return res.status(200).json({
      message: "Profile picture updated.",
      user: userPayload(user),
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (
      typeof currentPassword !== "string"
      || !currentPassword
      || currentPassword.length > 128
      || !isPassword(newPassword)
    ) {
      return res.status(400).json({ message: "Use your current password and a new password of 8-128 characters." });
    }

    const user = await repositories.users.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user?.password || DUMMY_PASSWORD_HASH);

    if (!user || !isMatch) {
      await recordLoginAudit(req, {
        userId: req.user.id,
        identifier: req.user.email,
        eventType: "failure",
        reason: "password_change_invalid_current",
      });
      return res.status(400).json({ message: "Current password is not valid." });
    }

    const salt = await bcrypt.genSalt(10);
    await repositories.users.updatePassword(user._id, await bcrypt.hash(newPassword, salt), { resetLock: false });
    await recordLoginAudit(req, {
      userId: user._id,
      identifier: user.email,
      eventType: "success",
      reason: "password_change",
    });

    return res.status(200).json({ message: "Password updated." });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getMyActivity,
  updateProfile,
  updateAvatar,
  changePassword,
  verifyOTP,
  resendOTP,
  requestPasswordReset,
  resetPassword,
};
