const MAX_EMAIL_LENGTH = 254;
const MAX_ID_LENGTH = 128;
const MAX_FILENAME_LENGTH = 255;
const MAX_USERNAME_LENGTH = 48;

const cleanEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const cleanUsername = (value) => typeof value === "string" ? value.trim() : "";
const isEmail = (value) => (
  typeof value === "string"
  && value.length <= MAX_EMAIL_LENGTH
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
);
const isUsername = (value) => (
  typeof value === "string"
  && value.length >= 3
  && value.length <= MAX_USERNAME_LENGTH
  && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)
);
const isPassword = (value) => typeof value === "string" && value.length >= 8 && value.length <= 128;
const isRecordId = (value) => (
  typeof value === "string"
  && value.length > 0
  && value.length <= MAX_ID_LENGTH
  && /^[a-zA-Z0-9_-]+$/.test(value)
);
const cleanFilename = (value) => typeof value === "string"
  ? value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "_")
    .trim()
    .slice(0, MAX_FILENAME_LENGTH)
  : "";

module.exports = {
  MAX_FILENAME_LENGTH,
  cleanEmail,
  cleanFilename,
  cleanUsername,
  isEmail,
  isPassword,
  isRecordId,
  isUsername,
};
