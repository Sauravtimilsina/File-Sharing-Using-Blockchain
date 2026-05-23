const crypto = require("crypto");

const hex = (bytes) => crypto.randomBytes(bytes).toString("hex");

console.log("Copy these values into your deployment environment variables:");
console.log("");
console.log(`JWT_SECRET=${hex(48)}`);
console.log(`OTP_SECRET=${hex(48)}`);
console.log(`ENCRYPTION_KEY=${hex(32)}`);
