const { v4: uuidv4 } = require("uuid");
const path = require("path");
const File = require("../models/File");
const { encryptFile, decryptFile } = require("../services/fileService");
const { generateHash, createBlock, verifyFileIntegrity } = require("../services/blockchainService");



const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const originalBuffer = req.file.buffer;
    const originalName = req.file.originalname;
    const ext = path.extname(originalName);
    const storedName = `${uuidv4()}${ext}.enc`;

    
    const fileHash = generateHash(originalBuffer);

    
    encryptFile(originalBuffer, storedName);

    
    const file = await File.create({
      owner: req.user.id,
      filename: originalName,
      storedName,
      hash: fileHash,
    });

    
    const block = await createBlock(file._id, fileHash);

    res.status(201).json({
      message: "File uploaded successfully",
      file: {
        id: file._id,
        filename: file.filename,
        hash: file.hash,
        createdAt: file.createdAt,
      },
      block: {
        index: block.index,
        fileHash: block.fileHash,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Server error during file upload" });
  }
};



const getMyFiles = async (req, res) => {
  try {
    const files = await File.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ files });
  } catch (error) {
    console.error("GetMyFiles error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const getSharedFiles = async (req, res) => {
  try {
    const Share = require("../models/Share");
    const sharedFiles = await Share.find({ sharedWith: req.user.id })
      .populate("fileId", "filename hash")
      .populate("owner", "username")
      .sort({ createdAt: -1 });
      
    res.status(200).json({ files: sharedFiles });
  } catch (error) {
    console.error("GetSharedFiles error:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    
    if (file.owner.toString() !== req.user.id) {
      const Share = require("../models/Share");
      const shared = await Share.findOne({
        fileId: file._id,
        sharedWith: req.user.id,
      });
      if (!shared) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptFile(file.storedName);
    } catch (decryptError) {
      if (decryptError.code === "DECRYPTION_FAILED") {
        return res.status(422).json({
          message: "File tampering detected! The encrypted file has been modified or corrupted and cannot be decrypted.",
          tampered: true,
          filename: file.filename,
        });
      }
      if (decryptError.code === "FILE_NOT_FOUND") {
        return res.status(404).json({
          message: "The encrypted file is missing from storage.",
        });
      }
      throw decryptError;
    }

    
    const verification = await verifyFileIntegrity(decryptedBuffer, file._id);

    if (!verification.isValid) {
      return res.status(422).json({
        message: "File tampering detected! The file hash does not match the blockchain record.",
        tampered: true,
        filename: file.filename,
        storedHash: verification.storedHash,
        currentHash: verification.currentHash,
      });
    }

    
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "X-File-Hash": verification.currentHash,
      "X-Integrity-Verified": "true",
    });

    res.send(decryptedBuffer);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ message: "Server error during file download" });
  }
};



const verifyFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    
    let decryptedBuffer;
    try {
      decryptedBuffer = decryptFile(file.storedName);
    } catch (decryptError) {
      if (decryptError.code === "DECRYPTION_FAILED") {
        return res.status(200).json({
          filename: file.filename,
          isValid: false,
          tampered: true,
          storedHash: file.hash,
          currentHash: null,
          message: "File tampering detected! The encrypted file has been modified or corrupted — decryption failed.",
        });
      }
      if (decryptError.code === "FILE_NOT_FOUND") {
        return res.status(404).json({
          message: "The encrypted file is missing from storage.",
        });
      }
      throw decryptError;
    }

    const verification = await verifyFileIntegrity(decryptedBuffer, file._id);

    res.status(200).json({
      filename: file.filename,
      isValid: verification.isValid,
      tampered: !verification.isValid,
      storedHash: verification.storedHash,
      currentHash: verification.currentHash,
      message: verification.isValid
        ? "File integrity verified — no tampering detected"
        : "File tampering detected! Hash mismatch",
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
};

module.exports = { uploadFile, getMyFiles, getSharedFiles, downloadFile, verifyFile };
