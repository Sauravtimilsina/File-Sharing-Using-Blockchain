import { httpServerHandler } from "cloudflare:node";
import app from "./backend/src/app.js";

const port = 3000;
app.listen(port);

export default httpServerHandler({ port });
