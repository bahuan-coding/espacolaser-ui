// Prisma configuration for Netlify Neon PostgreSQL
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasources: {
    db: {
      url: process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL ?? '',
    },
  },
});
