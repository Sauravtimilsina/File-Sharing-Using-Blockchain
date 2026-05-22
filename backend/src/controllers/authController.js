const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const repositories = require("../repositories");
const { sendOTP: sendOTPEmail } = require("../utils/email");


const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};


const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const cleanEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const cleanUsername = (value) => typeof value === "string" ? value.trim() : "";
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);


const register = async (req, res) => {
  try {
    const username = cleanUsername(req.body.username);
    const email = cleanEmail(req.body.email);
    const { password } = req.body;

    if (!username || !isEmail(email) || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Please provide all fields" });
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
          otp,
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
      otp,
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


    const otpRecord = await repositories.otps.findByEmailAndCode(email, otp);
    if (!otpRecord) {
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
      return res.status(404).json({ message: "No account found with that email" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }


    await repositories.otps.deleteByEmail(email);
    const otp = generateOTP();
    await repositories.otps.create({
      email,
      otp,
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



const login = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const { password } = req.body;

    if (!isEmail(email) || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await repositories.users.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }


    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

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

    const { password, ...safeUser } = user;
    res.status(200).json({ user: safeUser });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login, getMe, verifyOTP, resendOTP };
