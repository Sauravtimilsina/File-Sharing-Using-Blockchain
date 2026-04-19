const crypto = require("crypto");
const Block = require("../models/Block");


const generateHash = (fileBuffer) => {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

const getLastBlock = async () => {
  const lastBlock = await Block.findOne().sort({ index: -1 });
  return lastBlock;
};


const createBlock = async (fileId, fileHash) => {
  const lastBlock = await getLastBlock();

  const newBlock = await Block.create({
    index: lastBlock ? lastBlock.index + 1 : 0,
    fileId,
    fileHash,
    previousHash: lastBlock ? lastBlock.fileHash : "0",
    timestamp: new Date(),
  });

  return newBlock;
};

const verifyFileIntegrity = async (fileBuffer, fileId) => {
  const currentHash = generateHash(fileBuffer);

  const block = await Block.findOne({ fileId });
  if (!block) {
    return { isValid: false, error: "No blockchain record found for this file" };
  }

  return {
    isValid: currentHash === block.fileHash,
    storedHash: block.fileHash,
    currentHash,
  };
};

module.exports = { generateHash, getLastBlock, createBlock, verifyFileIntegrity };
