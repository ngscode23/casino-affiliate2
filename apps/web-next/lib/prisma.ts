import { PrismaClient } from "@generated/prisma/client";

declare global {
  // using var is required for Node global augmentation
  // (rule disabled project-wide by config)
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
