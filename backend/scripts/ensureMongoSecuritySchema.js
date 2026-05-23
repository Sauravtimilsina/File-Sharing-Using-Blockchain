require("dotenv").config();

const mongoose = require("mongoose");
const ActivityAuditLog = require("../src/models/ActivityAuditLog");
const LoginAuditLog = require("../src/models/LoginAuditLog");
const OTP = require("../src/models/OTP");
const User = require("../src/models/User");

const mongoUrl = process.env.MONGO_MIGRATION_URL || process.env.MONGO_URI || process.env.DATABASE_URL;

if (!mongoUrl || !mongoUrl.startsWith("mongodb")) {
  throw new Error("Set MONGO_MIGRATION_URL or MONGO_URI to a MongoDB connection URL.");
}

const ensureCollection = async (model) => {
  await model.createCollection();
  await model.createIndexes();
};

const run = async () => {
  await mongoose.connect(mongoUrl);

  await Promise.all([
    ensureCollection(User),
    ensureCollection(OTP),
    ensureCollection(LoginAuditLog),
    ensureCollection(ActivityAuditLog),
  ]);

  const [users, otps] = await Promise.all([
    User.updateMany(
      { failedLoginAttempts: { $exists: false } },
      { $set: { failedLoginAttempts: 0 } },
    ),
    OTP.updateMany(
      { purpose: { $exists: false } },
      { $set: { purpose: "email_verification" } },
    ),
  ]);

  console.log(JSON.stringify({
    mongoSecuritySchemaReady: true,
    userDefaultsApplied: users.modifiedCount,
    otpDefaultsApplied: otps.modifiedCount,
  }));
};

run()
  .catch((error) => {
    console.error("Mongo security schema setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
