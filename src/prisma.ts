// lib/prisma.ts

import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  // Declare only the global type as possibly undefined
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Assign a definitely-defined constant
const prisma = globalThis.prisma ?? prismaClientSingleton()

// Set the global value only in non-prod
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export default prisma // ✅ This exported `prisma` is always defined
