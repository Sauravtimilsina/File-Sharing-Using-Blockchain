require("dotenv").config({ quiet: true });

const { verifyEmailTransport, getEmailTransportStatus } = require("../src/utils/email");

verifyEmailTransport()
  .then(() => {
    console.log(`Email provider check passed (${getEmailTransportStatus().provider}).`);
  })
  .catch((error) => {
    console.error("Email provider check failed.");
    console.error(`Code: ${error.code || "UNKNOWN"}`);
    console.error(`Command: ${error.command || "UNKNOWN"}`);
    console.error(`Message: ${error.response || error.message}`);
    process.exitCode = 1;
  });
