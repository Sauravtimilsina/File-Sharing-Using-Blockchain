const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; 


const getKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not set in environment variables");
  }
  return Buffer.from(key, "hex");
};

const encryptFile = (fileBuffer, storedName) => {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

  
  const encryptedWithIv = Buffer.concat([iv, encrypted]);

  const filePath = path.join(__dirname, "../../uploads", storedName);
  fs.writeFileSync(filePath, encryptedWithIv);

  return filePath;
};

const decryptFile = (storedName) => {
  const key = getKey();
  const filePath = path.join(__dirname, "../../uploads", storedName);

  if (!fs.existsSync(filePath)) {
    const err = new Error("Encrypted file not found on disk");
    err.code = "FILE_NOT_FOUND";
    throw err;
  }

  const encryptedWithIv = fs.readFileSync(filePath);

  
  const iv = encryptedWithIv.subarray(0, IV_LENGTH);
  const encryptedData = encryptedWithIv.subarray(IV_LENGTH);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted;
  } catch (cryptoError) {
    
    const err = new Error("File decryption failed — the encrypted file may have been tampered with or corrupted");
    err.code = "DECRYPTION_FAILED";
    err.originalError = cryptoError;
    throw err;
  }
};

module.exports = { encryptFile, decryptFile };
