import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/src/db/schema.ts",
  out: "./app/src/db/migrations",
  dialect: "sqlite",
  dbCredentials: { url: "./data/cv-autopilot.db" },
});
