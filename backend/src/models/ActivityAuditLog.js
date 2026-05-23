const mongoose = require("mongoose");

const activityAuditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: String,
  ipAddress: String,
  userAgent: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

activityAuditLogSchema.index({ createdAt: -1 });
activityAuditLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityAuditLog", activityAuditLogSchema);
