require("dotenv").config();
require("dns").setDefaultResultOrder("ipv4first");

const app = require("./app");
const runtimeConfig = require("./config/runtime");

app.listen(runtimeConfig.port, () => {
  console.log(`Server is running on port ${runtimeConfig.port}`);
});
