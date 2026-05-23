require("dotenv").config({ quiet: true });

const { verifyEmailTransport, getEmailTransportStatus } = require("../src/utils/email");

verifyEmailTransport()
  .then(() => {
    const status = getEmailTransportStatus();
    console.log(`Email provider check passed (${status.provider}).`);
  })
  .catch((error) => {
    console.error("Email provider check failed.");
    console.error(`Code: ${error.code || "UNKNOWN"}`);
    console.error(`Status: ${error.responseCode || "UNKNOWN"}`);
    console.error(`Message: ${error.message}`);
    process.exitCode = 1;
  });
