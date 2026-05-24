const { v4: uuidv4 } = require("uuid");
const fs = require("fs/promises");
const path = require("path");
const repositories = require("../repositories");
const { createDecryptedReadStream, encryptFileFromPath, hashDecryptedFile } = require("../services/fileService");
const { deleteEncryptedObject } = require("../services/storageService");
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
const canPreview = (mimeType = "") => (
  mimeType.startsWith("image/")
  || mimeType === "application/pdf"
  || mimeType.startsWith("text/")
);

const quarantineUnsafeFile = async (req, file, reason) => {
  const deletedFile = await repositories.files.markDeleted(file._id, file.owner);
  try {
    await deleteEncryptedObject(file.storedName);
  } catch (storageError) {
    if (storageError.code !== "FILE_NOT_FOUND") {
      console.error("Unsafe encrypted object delete failed:", storageError.message);
    }
  }

  await recordActivityAudit(req, {
    action: "file_quarantine",
    targetType: "file",
    targetId: file._id,
  });

  return {
    deletedFile,
    response: {
      message: reason,
      tampered: true,
      removed: true,
      filename: file.filename,
    },
  };
};

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
        const result = await quarantineUnsafeFile(req, file, "This file failed its safety check and was removed.");
        return res.status(410).json(result.response);
      }
      if (error.code === "FILE_NOT_FOUND") {
        const result = await quarantineUnsafeFile(req, file, "The stored file was missing and its record was removed.");
        return res.status(410).json(result.response);
      }
      throw error;
    }

    const verification = await verifyHashIntegrity(currentHash, file._id);
    if (!verification.isValid) {
      const result = await quarantineUnsafeFile(req, file, "This file failed its safety check and was removed.");
      return res.status(410).json(result.response);
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
        const result = await quarantineUnsafeFile(req, file, "This file failed its safety check and was removed.");
        return res.status(200).json({ ...result.response, isValid: false });
      }
      if (error.code === "FILE_NOT_FOUND") {
        const result = await quarantineUnsafeFile(req, file, "The stored file was missing and its record was removed.");
        return res.status(200).json({ ...result.response, isValid: false });
      }
      throw error;
    }

    const verification = await verifyHashIntegrity(currentHash, file._id);
    if (!verification.isValid) {
      const result = await quarantineUnsafeFile(req, file, "This file failed its safety check and was removed.");
      return res.status(200).json({ ...result.response, isValid: false });
    }

    await recordActivityAudit(req, {
      action: "file_verify",
      targetType: "file",
      targetId: file._id,
    });
    return res.status(200).json({
      filename: file.filename,
      isValid: true,
      tampered: false,
      removed: false,
      message: "File check passed.",
    });
  } catch (error) {
    console.error("Verify error:", error);
    return res.status(500).json({ message: "Server error during verification" });
  }
};

const previewFile = async (req, res) => {
  try {
    if (!isRecordId(req.params.id)) return res.status(404).json({ message: "File not found" });

    const file = await repositories.files.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });
    if (!(await canAccessFile(file, req.user.id))) return res.status(403).json({ message: "Access denied" });
    if (!canPreview(file.mimeType)) return res.status(415).json({ message: "Preview is not available for this file type." });

    let currentHash;
    try {
      currentHash = await hashDecryptedFile(file.storedName);
    } catch (error) {
      if (error.code === "DECRYPTION_FAILED") {
        const result = await quarantineUnsafeFile(req, file, "This file failed its safety check and was removed.");
        return res.status(410).json(result.response);
      }
      if (error.code === "FILE_NOT_FOUND") {
        const result = await quarantineUnsafeFile(req, file, "The stored file was missing and its record was removed.");
        return res.status(410).json(result.response);
      }
      throw error;
    }
    const verification = await verifyHashIntegrity(currentHash, file._id);
    if (!verification.isValid) {
      const result = await quarantineUnsafeFile(req, file, "This file failed its safety check and was removed.");
      return res.status(410).json(result.response);
    }

    res.set({
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${downloadName(file.filename)}"`,
      "X-File-Check": "passed",
    });

    await recordActivityAudit(req, {
      action: "file_preview",
      targetType: "file",
      targetId: file._id,
    });

    const decryptedStream = await createDecryptedReadStream(file.storedName);
    decryptedStream.on("error", (streamError) => res.destroy(streamError));
    return decryptedStream.pipe(res);
  } catch (error) {
    console.error("Preview file error:", error);
    return res.status(500).json({ message: "Server error during preview" });
  }
};

const renameFile = async (req, res) => {
  try {
    if (!isRecordId(req.params.id)) return res.status(404).json({ message: "File not found" });
    const filename = cleanFilename(req.body.filename);
    if (!filename) return res.status(400).json({ message: "Use a valid filename." });

    const file = await repositories.files.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });
    if (file.owner.toString() !== req.user.id) return res.status(403).json({ message: "Access denied" });

    const updatedFile = await repositories.files.updateFilename(file._id, filename);
    await recordActivityAudit(req, {
      action: "file_rename",
      targetType: "file",
      targetId: file._id,
    });

    return res.status(200).json({ message: "File renamed.", file: clientFile(updatedFile) });
  } catch (error) {
    console.error("Rename file error:", error);
    return res.status(500).json({ message: "Server error while renaming file" });
  }
};

const deleteFile = async (req, res) => {
  try {
    if (!isRecordId(req.params.id)) return res.status(404).json({ message: "File not found" });

    const file = await repositories.files.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });
    if (file.owner.toString() !== req.user.id) return res.status(403).json({ message: "Access denied" });

    const deletedFile = await repositories.files.markDeleted(file._id, req.user.id);
    try {
      await deleteEncryptedObject(file.storedName);
    } catch (storageError) {
      console.error("Encrypted object delete failed:", storageError.message);
    }

    await recordActivityAudit(req, {
      action: "file_delete",
      targetType: "file",
      targetId: file._id,
    });

    return res.status(200).json({ message: "File archived and storage object removed.", file: clientFile(deletedFile) });
  } catch (error) {
    console.error("Delete file error:", error);
    return res.status(500).json({ message: "Server error while deleting file" });
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
      isValid: audit.isValid,
      checkedBlocks: audit.checkedBlocks,
      latestBlock: audit.latestBlock && {
        index: audit.latestBlock.index,
        timestamp: audit.latestBlock.timestamp,
      },
      issues: audit.issues,
    });
  } catch (error) {
    console.error("Blockchain status error:", error);
    return res.status(500).json({ message: "Server error during blockchain audit" });
  }
};

module.exports = { uploadFile, getMyFiles, getSharedFiles, renameFile, deleteFile, downloadFile, previewFile, verifyFile, getBlockchainStatus };
