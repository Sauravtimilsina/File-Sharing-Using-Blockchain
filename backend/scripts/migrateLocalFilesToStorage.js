require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const runtimeConfig = require("../src/config/runtime");
const { uploadLocalEncryptedObject } = require("../src/services/storageService");

const uploadDirectory = path.join(__dirname, "../uploads");

const migrate = async () => {
  if (runtimeConfig.storage.provider !== "supabase") {
    throw new Error("Set FILE_STORAGE_PROVIDER=supabase before migrating stored files.");
  }

  const entries = await fs.readdir(uploadDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".enc"))
    .map((entry) => entry.name);

  for (const storedName of files) {
    await uploadLocalEncryptedObject(storedName);
    console.log(`Uploaded ${storedName}`);
  }

  console.log(`Migrated ${files.length} encrypted file objects.`);
};

migrate().catch((error) => {
  console.error("Storage migration failed:", error.message);
  process.exitCode = 1;
});
