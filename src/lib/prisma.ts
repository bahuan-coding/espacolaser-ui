import { PrismaClient } from "@/generated/prisma";
import { neon } from "@netlify/neon";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // @netlify/neon automatically uses NETLIFY_DATABASE_URL
  const sql = neon();
  const adapter = new PrismaNeonHTTP(sql);
  
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

