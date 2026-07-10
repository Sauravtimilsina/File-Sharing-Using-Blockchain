const crypto = require("crypto");
const fs = require("fs");
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");
const { Transform } = require("stream");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const {
  assertSafeStoredName,
  createEncryptedReadStream,
  readEncryptedObject,
  saveEncryptedObject,
} = require("./storageService");

const LEGACY_ALGORITHM = "aes-256-cbc";
const GCM_ALGORITHM = "aes-256-gcm";
const LEGACY_IV_LENGTH = 16;
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
const GCM_PREFIX = Buffer.from("sft:gcm:v1:");
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

const getLegacyIv = (encryptedBuffer) => {
  if (encryptedBuffer.length < LEGACY_IV_LENGTH) {
    const err = new Error("Encrypted file header is incomplete");
    err.code = "DECRYPTION_FAILED";
    throw err;
  }

  return encryptedBuffer.subarray(0, LEGACY_IV_LENGTH);
};

const createDecryptedReadStream = async (storedName) => {
  assertSafeStoredName(storedName);
  const encryptedBuffer = await readEncryptedObject(storedName);

  if (encryptedBuffer.subarray(0, GCM_PREFIX.length).equals(GCM_PREFIX)) {
    if (encryptedBuffer.length < GCM_PREFIX.length + GCM_IV_LENGTH + GCM_TAG_LENGTH) {
      const err = new Error("Encrypted file header is incomplete");
      err.code = "DECRYPTION_FAILED";
      throw err;
    }

    const ivStart = GCM_PREFIX.length;
    const contentStart = ivStart + GCM_IV_LENGTH;
    const tagStart = encryptedBuffer.length - GCM_TAG_LENGTH;
    const iv = encryptedBuffer.subarray(ivStart, contentStart);
    const tag = encryptedBuffer.subarray(tagStart);
    const encrypted = encryptedBuffer.subarray(contentStart, tagStart);
    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return Readable.from(Buffer.concat([decipher.update(encrypted), decipher.final()]));
  }

  const iv = getLegacyIv(encryptedBuffer);
  const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, getKey(), iv);
  const encryptedStream = await createEncryptedReadStream(storedName);

  let headerBytesLeft = LEGACY_IV_LENGTH;
  const contentStream = encryptedStream.pipe(new Transform({
    transform(chunk, encoding, callback) {
      if (headerBytesLeft > 0) {
        const offset = Math.min(headerBytesLeft, chunk.length);
        headerBytesLeft -= offset;
        callback(null, chunk.subarray(offset));
        return;
      }
      callback(null, chunk);
    },
  }));

  return contentStream.pipe(decipher);
};

const encryptFileFromPath = async (sourcePath, storedName) => {
  assertSafeStoredName(storedName);
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, getKey(), iv);
  const encryptedPath = path.join(os.tmpdir(), `${storedName}.${crypto.randomUUID()}`);
  const output = fs.createWriteStream(encryptedPath);

  output.write(GCM_PREFIX);
  output.write(iv);

  try {
    await pipeline(fs.createReadStream(sourcePath), cipher, output);
    await fsPromises.appendFile(encryptedPath, cipher.getAuthTag());
    await saveEncryptedObject(storedName, encryptedPath);
    return storedName;
  } catch (error) {
    fs.rmSync(encryptedPath, { force: true });
    throw error;
  } finally {
    await fsPromises.rm(encryptedPath, { force: true });
  }
};

const hashDecryptedFile = async (storedName) => {
  assertSafeStoredName(storedName);
  const hash = crypto.createHash("sha256");

  try {
    const stream = await createDecryptedReadStream(storedName);
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    return hash.digest("hex");
  } catch (error) {
    if (error.code === "FILE_NOT_FOUND" || error.code === "DECRYPTION_FAILED") {
      throw error;
    }

    const err = new Error("File decryption failed");
    err.code = "DECRYPTION_FAILED";
    err.originalError = error;
    throw err;
  }
};

module.exports = {
  createDecryptedReadStream,
  encryptFileFromPath,
  hashDecryptedFile,
};
