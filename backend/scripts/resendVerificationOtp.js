require("dotenv").config({ quiet: true });

const crypto = require("crypto");
const repositories = require("../src/repositories");
const { sendOTP } = require("../src/utils/email");
const { hashOtp } = require("../src/utils/otp");
const { cleanEmail, isEmail } = require("../src/utils/validation");

const email = cleanEmail(process.argv[2]);

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const main = async () => {
  if (!isEmail(email)) {
    throw new Error("Usage: npm run resend:otp -- user@example.com");
  }

  const user = await repositories.users.findByEmail(email);
  if (!user) {
    throw new Error("No account exists for that email.");
  }

  if (user.isVerified) {
    console.log("Account is already verified; no OTP was sent.");
    return;
  }

  await repositories.otps.deleteByEmail(email);
  const otp = generateOTP();
  await repositories.otps.create({
    email,
    otpHash: hashOtp(email, otp),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });
  await sendOTP(email, otp);

  console.log(`Verification OTP sent to ${email}.`);
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
