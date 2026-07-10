const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const { Readable } = require("stream");
const runtimeConfig = require("../config/runtime");

const uploadDirectory = path.join(__dirname, "../../uploads");

const assertSafeStoredName = (storedName) => {
  if (
    typeof storedName !== "string"
    || !storedName
    || storedName.includes("/")
    || storedName.includes("\\")
    || storedName.includes("..")
    || path.basename(storedName) !== storedName
  ) {
    const error = new Error("Stored file name is not valid.");
    error.code = "INVALID_STORED_NAME";
    throw error;
  }
};

const getLocalPath = (storedName) => {
  assertSafeStoredName(storedName);
  return path.join(uploadDirectory, storedName);
};

const getSupabaseStorage = () => require("../repositories/supabaseClient").storage
  .from(runtimeConfig.storage.bucket);

const saveEncryptedObject = async (storedName, sourcePath) => {
  assertSafeStoredName(storedName);

  if (runtimeConfig.storage.provider === "supabase") {
    const content = await fsPromises.readFile(sourcePath);
    const { error } = await getSupabaseStorage().upload(storedName, content, {
      contentType: "application/octet-stream",
      upsert: false,
    });

    if (error) throw error;
    return;
  }

  await fsPromises.mkdir(uploadDirectory, { recursive: true });
  await fsPromises.copyFile(sourcePath, getLocalPath(storedName));
};

const saveEncryptedBuffer = async (storedName, content) => {
  assertSafeStoredName(storedName);

  if (runtimeConfig.storage.provider !== "supabase") {
    throw new Error("Buffer uploads require FILE_STORAGE_PROVIDER=supabase.");
  }

  const { error } = await getSupabaseStorage().upload(storedName, content, {
    contentType: "application/octet-stream",
    upsert: false,
  });

  if (error) throw error;
};

const deleteEncryptedObject = async (storedName) => {
  assertSafeStoredName(storedName);

  if (runtimeConfig.storage.provider === "supabase") {
    const { error } = await getSupabaseStorage().remove([storedName]);
    if (error) throw error;
    return;
  }

  await fsPromises.rm(getLocalPath(storedName), { force: true });
};

const readEncryptedObject = async (storedName) => {
  assertSafeStoredName(storedName);

  if (runtimeConfig.storage.provider === "supabase") {
    const { data, error } = await getSupabaseStorage().download(storedName);

    if (error) {
      const fileError = new Error(error.message || "Encrypted file not found in storage");
      fileError.code = error.status === 404 ? "FILE_NOT_FOUND" : "STORAGE_READ_FAILED";
      throw fileError;
    }

    return Buffer.from(await data.arrayBuffer());
  }

  try {
    return await fsPromises.readFile(getLocalPath(storedName));
  } catch (error) {
    if (error.code === "ENOENT") error.code = "FILE_NOT_FOUND";
    throw error;
  }
};

const createEncryptedReadStream = async (storedName) => Readable.from(await readEncryptedObject(storedName));

const uploadLocalEncryptedObject = async (storedName) => {
  if (runtimeConfig.storage.provider !== "supabase") return;
  await saveEncryptedObject(storedName, getLocalPath(storedName));
};

module.exports = {
  assertSafeStoredName,
  createEncryptedReadStream,
  deleteEncryptedObject,
  getLocalPath,
  readEncryptedObject,
  saveEncryptedBuffer,
  saveEncryptedObject,
  uploadLocalEncryptedObject,
};
