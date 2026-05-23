require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config({ path: ".env", quiet: true });

const crypto = require("crypto");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const runtimeConfig = require("../src/config/runtime");
const { encryptFileFromPath, hashDecryptedFile } = require("../src/services/fileService");
const { readEncryptedObject, getLocalPath, assertSafeStoredName } = require("../src/services/storageService");

const removeStoredObject = async (storedName) => {
  if (runtimeConfig.storage.provider === "supabase") {
    const supabase = require("../src/repositories/supabaseClient");
    const { error } = await supabase.storage
      .from(runtimeConfig.storage.bucket)
      .remove([storedName]);
    if (error) throw error;
    return;
  }

  await fs.rm(getLocalPath(storedName), { force: true });
};

const main = async () => {
  const plainText = `secure-file-transfer-service-check:${crypto.randomUUID()}`;
  const expectedHash = crypto.createHash("sha256").update(plainText).digest("hex");
  const sourcePath = path.join(os.tmpdir(), `sft-check-${crypto.randomUUID()}.txt`);
  const storedName = `service-check-${crypto.randomUUID()}.txt.enc`;

  assertSafeStoredName(storedName);
  await fs.writeFile(sourcePath, plainText);

  try {
    await encryptFileFromPath(sourcePath, storedName);
    const encryptedBuffer = await readEncryptedObject(storedName);
    const decryptedHash = await hashDecryptedFile(storedName);

    if (encryptedBuffer.includes(Buffer.from(plainText))) {
      throw new Error("Encrypted object unexpectedly contains plaintext.");
    }

    if (decryptedHash !== expectedHash) {
      throw new Error("Decrypted hash did not match source file hash.");
    }

    console.log(`storage_provider=${runtimeConfig.storage.provider}`);
    console.log(`storage_bucket=${runtimeConfig.storage.bucket}`);
    console.log(`encrypted_bytes=${encryptedBuffer.length}`);
    console.log("file_storage_services_ok=1");
  } finally {
    await fs.rm(sourcePath, { force: true });
    await removeStoredObject(storedName).catch((error) => {
      console.warn(`cleanup_warning=${error.message}`);
    });
  }
};

main().catch((error) => {
  console.error(`file_storage_services_error=${error.message}`);
  process.exitCode = 1;
});
