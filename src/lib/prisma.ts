import { PrismaClient } from "@/generated/prisma";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL or NETLIFY_DATABASE_URL must be set");
  }

  const adapter = new PrismaNeon({ connectionString });
  
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

