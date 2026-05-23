const crypto = require("crypto");

const getOtpPepper = () => {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("OTP_SECRET or JWT_SECRET must be configured.");
  }
  return secret;
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
