const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, default: "email_verification" },
  otp: String,
  otpHash: String,
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
});

otpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model("OTP", otpSchema);
