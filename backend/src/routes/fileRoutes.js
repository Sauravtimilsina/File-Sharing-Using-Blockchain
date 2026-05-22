const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const auth = require("../middleware/auth");
const runtimeConfig = require("../config/runtime");
const { uploadFile, getMyFiles, getSharedFiles, downloadFile, verifyFile } = require("../controllers/fileController");

const tempUploadDirectory = path.join(__dirname, "../../uploads/.tmp");
fs.mkdirSync(tempUploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: tempUploadDirectory,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.upload`),
  }),
  limits: {
    fileSize: runtimeConfig.maxUploadBytes,
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

    next(error);
  });
};

router.post("/upload", auth, handleUpload, uploadFile);
router.get("/my-files", auth, getMyFiles);
router.get("/shared", auth, getSharedFiles);
router.get("/download/:id", auth, downloadFile);
router.get("/verify/:id", auth, verifyFile);

module.exports = router;
