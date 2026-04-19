const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { shareFile } = require("../controllers/shareController");


router.post("/file", auth, shareFile);

module.exports = router;
