const express = require("express");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/auth");
const { uploadFile, getMyFiles, getSharedFiles, downloadFile, verifyFile } = require("../controllers/fileController");


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, 
  },
});


router.post("/upload", auth, upload.single("file"), uploadFile);
router.get("/my-files", auth, getMyFiles);
router.get("/shared", auth, getSharedFiles);
router.get("/download/:id", auth, downloadFile);
router.get("/verify/:id", auth, verifyFile);

module.exports = router;
