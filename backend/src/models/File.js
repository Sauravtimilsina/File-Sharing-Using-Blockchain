const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  filename: String,
  storedName: String,
  hash: String
}, { timestamps: true });

module.exports = mongoose.model("File", fileSchema);