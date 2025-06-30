"use strict";
// lib/prisma.ts
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prismaClientSingleton = () => {
    return new client_1.PrismaClient();
};
// Assign a definitely-defined constant
const prisma = (_a = globalThis.prisma) !== null && _a !== void 0 ? _a : prismaClientSingleton();
// Set the global value only in non-prod
if (process.env.NODE_ENV !== 'production')
    globalThis.prisma = prisma;
exports.default = prisma; // ✅ This exported `prisma` is always defined
