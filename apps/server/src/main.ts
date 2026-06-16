import { createServer } from "./server.js";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const host = process.env.HOST ?? "0.0.0.0";
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim());

const { app } = createServer(
  corsOrigin === undefined ? {} : { corsOrigin },
);

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
