import { PrismaClient } from "@/generated/prisma";
import { neon } from "@netlify/neon";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: new PrismaNeon(neon(process.env.NETLIFY_DATABASE_URL!)),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { prisma };

