const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { sendOTP: sendOTPEmail } = require("../utils/email");


const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};


const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};



const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      
      if (!existingUser.isVerified && existingUser.email === email) {
        
        const salt = await bcrypt.genSalt(10);
        existingUser.password = await bcrypt.hash(password, salt);
        existingUser.username = username;
        await existingUser.save();

        
        await OTP.deleteMany({ email });
        const otp = generateOTP();
        await OTP.create({
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

    
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    
    const otp = generateOTP();
    await OTP.create({
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
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Please provide email and OTP" });
    }

    
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteMany({ email });
      return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
    }

    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isVerified = true;
    await user.save();

    
    await OTP.deleteMany({ email });

    
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Please provide email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with that email" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    
    await OTP.deleteMany({ email });
    const otp = generateOTP();
    await OTP.create({
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email });
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
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login, getMe, verifyOTP, resendOTP };
