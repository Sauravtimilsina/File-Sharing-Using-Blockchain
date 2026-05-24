const express = require("express");
const multer = require("multer");
const fs = require("fs");
const os = require("os");
const path = require("path");
const router = express.Router();
const auth = require("../middleware/auth");
const runtimeConfig = require("../config/runtime");
const { uploadFile, getMyFiles, getSharedFiles, renameFile, deleteFile, downloadFile, previewFile, verifyFile, getBlockchainStatus } = require("../controllers/fileController");

const tempUploadDirectory = runtimeConfig.uploadTmpDir
  || path.join(os.tmpdir(), "secure-file-transfer", "uploads");
fs.mkdirSync(tempUploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: tempUploadDirectory,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.upload`),
  }),
  limits: {
    fileSize: runtimeConfig.maxUploadBytes,
    files: 1,
    fields: 4,
    parts: 5,
  },
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "File exceeds the upload size limit." });
      return;
    }

    if (error instanceof multer.MulterError) {
      res.status(400).json({ message: "Upload request is not valid." });
      return;
    }

    next(error);
  });
};

router.post("/upload", auth, handleUpload, uploadFile);
router.get("/my-files", auth, getMyFiles);
router.get("/shared", auth, getSharedFiles);
router.get("/blockchain/status", auth, getBlockchainStatus);
router.put("/:id/rename", auth, renameFile);
router.delete("/:id", auth, deleteFile);
router.get("/preview/:id", auth, previewFile);
router.get("/download/:id", auth, downloadFile);
router.get("/verify/:id", auth, verifyFile);

module.exports = router;
