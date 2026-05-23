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

const LOGIN_LOCK_HOURS = 4;
const MAX_FAILED_LOGIN_ATTEMPTS = 3;
const DUMMY_PASSWORD_HASH = "$2b$10$u1W6mXXzT6vquTTVj33Y8OJL9knczxtWtS68CX/F4lYfEHgIH5wry";

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
          console.error("Email send error:", emailErr);
          return res.status(500).json({ message: "Failed to send verification email. Check SMTP settings." });
        }

        return res.status(200).json({
          message: "Verification code sent to your email",
          email,
          requiresVerification: true,
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
      console.error("Email send error:", emailErr);
      return res.status(500).json({ message: "Account created but failed to send verification email. Check SMTP settings." });
    }

    res.status(201).json({
      message: "Verification code sent to your email",
      email,
      requiresVerification: true,
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

    await repositories.users.markVerified(user._id);


    await repositories.otps.deleteByEmail(email);


    const token = generateToken(user._id);

    res.status(200).json({
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
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
      console.error("Email send error:", emailErr);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.status(200).json({ message: "New verification code sent to your email" });
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
    await repositories.users.updatePassword(user._id, await bcrypt.hash(password, salt));
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
      return res.status(423).json({ message: "Too many failed login attempts. Please try again later." });
    }

    const isMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      if (user) {
        const shouldLock = Number(user.failedLoginAttempts || 0) + 1 >= MAX_FAILED_LOGIN_ATTEMPTS;
        await repositories.users.recordLoginFailure(
          user._id,
          shouldLock ? new Date(Date.now() + LOGIN_LOCK_HOURS * 60 * 60 * 1000) : null,
        );
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
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
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
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getMe,
  verifyOTP,
  resendOTP,
  requestPasswordReset,
  resetPassword,
};
