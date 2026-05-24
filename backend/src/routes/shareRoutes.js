const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { getMyShares, revokeShare, shareFile } = require("../controllers/shareController");

router.get("/my-shares", auth, getMyShares);

router.post("/file", auth, shareFile);
router.delete("/:id", auth, revokeShare);

module.exports = router;
