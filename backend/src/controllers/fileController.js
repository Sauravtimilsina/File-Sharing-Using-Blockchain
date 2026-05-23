const { v4: uuidv4 } = require("uuid");
const fs = require("fs/promises");
const path = require("path");
const repositories = require("../repositories");
const { createDecryptedReadStream, encryptFileFromPath, hashDecryptedFile } = require("../services/fileService");
const { auditBlockchain, createBlock, generateHashFromPath, verifyHashIntegrity } = require("../services/blockchainService");
const { recordActivityAudit } = require("../utils/audit");
const { cleanFilename, isRecordId } = require("../utils/validation");

const clientFile = (file) => ({
  _id: file._id,
  filename: file.filename,
  fileSize: file.fileSize,
  mimeType: file.mimeType,
  createdAt: file.createdAt,
  updatedAt: file.updatedAt,
});

const canAccessFile = async (file, userId) => {
  if (file.owner.toString() === userId) return true;
  return Boolean(await repositories.shares.findByFileAndRecipient(file._id, userId));
};

const downloadName = (filename) => filename.replace(/[\r\n"]/g, "_");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const originalName = cleanFilename(req.file.originalname);
    if (!originalName || req.file.size <= 0) {
      return res.status(400).json({ message: "Upload a non-empty file with a valid name." });
    }

    const ext = path.extname(originalName);
    const storedName = `${uuidv4()}${ext}.enc`;
    const fileHash = await generateHashFromPath(req.file.path);

    await encryptFileFromPath(req.file.path, storedName);

    const file = await repositories.files.create({
      owner: req.user.id,
      filename: originalName,
      storedName,
      hash: fileHash,
      fileSize: req.file.size,
      mimeType: req.file.mimetype || "application/octet-stream",
    });
    const block = await createBlock(file._id, fileHash);
    await recordActivityAudit(req, {
      action: "file_upload",
      targetType: "file",
      targetId: file._id,
    });

    return res.status(201).json({
      message: "File uploaded successfully",
      file: {
        id: file._id,
        filename: file.filename,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        createdAt: file.createdAt,
      },
      receipt: {
        index: block.index,
        timestamp: block.timestamp,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Server error during file upload" });
  } finally {
    if (req.file?.path) {
      await fs.rm(req.file.path, { force: true });
    }
  }
};

const getMyFiles = async (req, res) => {
  try {
    const files = await repositories.files.findByOwner(req.user.id);
    return res.status(200).json({ files: files.map(clientFile) });
  } catch (error) {
    console.error("GetMyFiles error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getSharedFiles = async (req, res) => {
  try {
    const sharedFiles = await repositories.shares.findReceivedByUser(req.user.id);
    return res.status(200).json({ files: sharedFiles });
  } catch (error) {
    console.error("GetSharedFiles error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const downloadFile = async (req, res) => {
  try {
    if (!isRecordId(req.params.id)) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = await repositories.files.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (!(await canAccessFile(file, req.user.id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    let currentHash;
    try {
      currentHash = await hashDecryptedFile(file.storedName);
    } catch (error) {
      if (error.code === "DECRYPTION_FAILED") {
        return res.status(422).json({
          message: "This file cannot be opened because its stored copy failed a safety check.",
          tampered: true,
          filename: file.filename,
        });
      }
      if (error.code === "FILE_NOT_FOUND") {
        return res.status(404).json({ message: "The stored file could not be found." });
      }
      throw error;
    }

    const verification = await verifyHashIntegrity(currentHash, file._id);
    if (!verification.isValid) {
      return res.status(422).json({
        message: "This file failed its safety check and cannot be downloaded.",
        tampered: true,
        filename: file.filename,
      });
    }

    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${downloadName(file.filename)}"`,
      "X-File-Check": "passed",
    });

    await recordActivityAudit(req, {
      action: "file_download",
      targetType: "file",
      targetId: file._id,
    });
    const decryptedStream = await createDecryptedReadStream(file.storedName);
    decryptedStream.on("error", (streamError) => {
      console.error("Download stream error:", streamError);
      res.destroy(streamError);
    });
    return decryptedStream.pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Server error during file download" });
  }
};

const verifyFile = async (req, res) => {
  try {
    if (!isRecordId(req.params.id)) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = await repositories.files.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    if (!(await canAccessFile(file, req.user.id))) {
      return res.status(403).json({ message: "Access denied" });
    }

    let currentHash;
    try {
      currentHash = await hashDecryptedFile(file.storedName);
    } catch (error) {
      if (error.code === "DECRYPTION_FAILED") {
        return res.status(200).json({
          filename: file.filename,
          isValid: false,
          tampered: true,
          message: "This file failed its safety check.",
        });
      }
      if (error.code === "FILE_NOT_FOUND") {
        return res.status(404).json({ message: "The stored file could not be found." });
      }
      throw error;
    }

    const verification = await verifyHashIntegrity(currentHash, file._id);
    await recordActivityAudit(req, {
      action: "file_verify",
      targetType: "file",
      targetId: file._id,
    });
    return res.status(200).json({
      filename: file.filename,
      isValid: verification.isValid,
      tampered: !verification.isValid,
      message: verification.isValid
        ? "File check passed."
        : "This file failed its safety check.",
    });
  } catch (error) {
    console.error("Verify error:", error);
    return res.status(500).json({ message: "Server error during verification" });
  }
};

const getBlockchainStatus = async (req, res) => {
  try {
    const audit = await auditBlockchain();
    await recordActivityAudit(req, {
      action: "blockchain_audit",
      targetType: "blockchain",
      targetId: audit.latestBlock?.fileId || null,
    });

    return res.status(200).json({
      status: audit.isValid ? "valid" : "needs_review",
      ...audit,
    });
  } catch (error) {
    console.error("Blockchain status error:", error);
    return res.status(500).json({ message: "Server error during blockchain audit" });
  }
};

module.exports = { uploadFile, getMyFiles, getSharedFiles, downloadFile, verifyFile, getBlockchainStatus };
