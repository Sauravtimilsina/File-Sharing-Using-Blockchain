const crypto = require("crypto");

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const getKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables");
  }

  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes of hex key material");
  }

  return keyBuffer;
};

const encryptField = (value) => {
  if (!value) return "";
  if (typeof value !== "string") return "";
  if (value.startsWith(PREFIX)) return value;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
};

const decryptField = (value) => {
  if (!value || typeof value !== "string") return "";
  if (!value.startsWith(PREFIX)) return value;

  try {
    const payload = Buffer.from(value.slice(PREFIX.length), "base64url");
    const iv = payload.subarray(0, IV_LENGTH);
    const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch (error) {
    const err = new Error("Profile field decryption failed");
    err.code = "PROFILE_DECRYPTION_FAILED";
    err.originalError = error;
    throw err;
  }
};

module.exports = {
  decryptField,
  encryptField,
};
