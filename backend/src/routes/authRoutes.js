const express = require("express");
const router = express.Router();
const { rateLimit } = require("express-rate-limit");
const {
  register,
  login,
  getMe,
  verifyOTP,
  resendOTP,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/authController");
const auth = require("../middleware/auth");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
});

router.post("/register", authLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", authLimiter, verifyOTP);
router.post("/resend-otp", authLimiter, resendOTP);
router.post("/forgot-password", authLimiter, requestPasswordReset);
router.post("/reset-password", authLimiter, resetPassword);


router.get("/me", auth, getMe);

module.exports = router;
