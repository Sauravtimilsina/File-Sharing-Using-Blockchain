require("dotenv").config({ quiet: true });

const { verifyEmailTransport } = require("../src/utils/email");

verifyEmailTransport()
  .then(() => {
    console.log("SMTP check passed.");
  })
  .catch((error) => {
    console.error("SMTP check failed.");
    console.error(`Code: ${error.code || "UNKNOWN"}`);
    console.error(`Command: ${error.command || "UNKNOWN"}`);
    console.error(`Message: ${error.response || error.message}`);
    process.exitCode = 1;
  });
