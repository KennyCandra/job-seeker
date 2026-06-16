import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/src/db/schema.ts",
  out: "./app/src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://cv_autopilot:cv_autopilot@localhost:5432/cv_autopilot",
  },
});
