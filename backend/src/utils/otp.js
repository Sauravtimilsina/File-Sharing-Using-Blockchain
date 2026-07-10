const crypto = require("crypto");
const runtimeConfig = require("../config/runtime");

const getOtpPepper = () => {
  return runtimeConfig.requireRuntimeSecret("OTP_SECRET", process.env.OTP_SECRET || process.env.JWT_SECRET);
};

const hashOtp = (email, otp) => crypto
  .createHmac("sha256", getOtpPepper())
  .update(`${email}:${otp}`)
  .digest("hex");

const equalOtpHash = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
};

module.exports = { equalOtpHash, hashOtp };
