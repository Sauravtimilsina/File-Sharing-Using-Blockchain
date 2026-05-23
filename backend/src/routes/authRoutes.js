const express = require("express");
const router = express.Router();
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const {
  register,
  login,
  getMe,
  verifyOTP,
  resendOTP,
  requestPasswordReset,
  resetPassword,
  updateProfile,
  updateAvatar,
  changePassword,
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

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 750 * 1024,
    files: 1,
    fields: 0,
    parts: 1,
  },
});

const handleAvatarUpload = (req, res, next) => {
  avatarUpload.single("avatar")(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Profile image must be under 750 KB." });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: "Profile image upload is not valid." });
    }
    return next(error);
  });
};

router.post("/register", authLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/verify-otp", authLimiter, verifyOTP);
router.post("/resend-otp", authLimiter, resendOTP);
router.post("/forgot-password", authLimiter, requestPasswordReset);
router.post("/reset-password", authLimiter, resetPassword);


router.get("/me", auth, getMe);
router.put("/profile", auth, updateProfile);
router.put("/profile/avatar", auth, handleAvatarUpload, updateAvatar);
router.put("/change-password", auth, changePassword);

module.exports = router;
