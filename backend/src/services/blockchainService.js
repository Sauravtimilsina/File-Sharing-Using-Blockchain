const crypto = require("crypto");
const fs = require("fs");
const repositories = require("../repositories");


const generateHash = (fileBuffer) => {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

const generateHashFromPath = async (filePath) => {
  const hash = crypto.createHash("sha256");

  for await (const chunk of fs.createReadStream(filePath)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
};

const getLastBlock = async () => {
  const lastBlock = await repositories.blocks.findLast();
  return lastBlock;
};


const createBlock = async (fileId, fileHash) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const lastBlock = await getLastBlock();

    try {
      return await repositories.blocks.create({
        index: lastBlock ? lastBlock.index + 1 : 0,
        fileId,
        fileHash,
        previousHash: lastBlock ? lastBlock.fileHash : "0",
        timestamp: new Date(),
      });
    } catch (error) {
      const duplicateIndex = error.code === "23505" || error.code === 11000 || error.status === 409;
      if (!duplicateIndex || attempt === 2) throw error;
    }
  }

  throw new Error("Unable to create file history entry.");
};

const verifyFileIntegrity = async (fileBuffer, fileId) => {
  const currentHash = generateHash(fileBuffer);
  return verifyHashIntegrity(currentHash, fileId);
};

const verifyHashIntegrity = async (currentHash, fileId) => {
  const block = await repositories.blocks.findByFileId(fileId);
  if (!block) {
    return { isValid: false, error: "No blockchain record found for this file" };
  }

  return {
    isValid: currentHash === block.fileHash,
    storedHash: block.fileHash,
    currentHash,
  };
};

module.exports = {
  generateHash,
  generateHashFromPath,
  getLastBlock,
  createBlock,
  verifyFileIntegrity,
  verifyHashIntegrity,
};
