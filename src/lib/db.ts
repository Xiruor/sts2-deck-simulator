import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Prisma 7 需要显式传入驱动适配器（mariadb 驱动可直接接收连接字符串）
// Serverless（Vercel）环境优先使用 DATABASE_POOL_URL（带连接池的地址，
// 如 PlanetScale / Aiven / TiDB Cloud 提供的 pool URL），否则回退 DATABASE_URL。
function createPrismaClient() {
  const url =
    process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL;
  const adapter = new PrismaMariaDb(url!);
  return new PrismaClient({ adapter });
}

// 全局单例：开发环境避免热重载重复建池，生产环境（Serverless）让
// 同一函数实例复用连接，防止冷启动/连接数耗尽。
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
