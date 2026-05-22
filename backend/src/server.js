const app = require("./app");
const runtimeConfig = require("./config/runtime");

if (!process.env.VERCEL) {
  app.listen(runtimeConfig.port, () => {
    console.log(`Server is running on port ${runtimeConfig.port}`);
  });
}

module.exports = app;