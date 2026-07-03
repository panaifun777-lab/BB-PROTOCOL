// ── Prisma Client Singleton ──
// Vercel Serverless 兼容方案：
//   1. production 环境使用 :memory: SQLite（每次冷启动自动 seed）
//   2. 本地开发继续使用 file:./db/dev.db

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ── 判断是否在 Vercel Serverless 环境 ──
const isVercel =
  process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

// ── SQLite 连接 URL ──
function getDatabaseUrl(): string {
  if (isVercel) {
    // Vercel Serverless: 使用内存数据库
    // 注意：每次冷启动数据会重置，适合演示站
    return 'file::memory:?cache=shared'
  }
  // 本地开发：使用文件数据库
  return process.env.DATABASE_URL || 'file:./db/dev.db'
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrl()
  // 动态设置环境变量（仅影响当前进程）
  process.env.DATABASE_URL = databaseUrl

  try {
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    })
    return client
  } catch (error) {
    console.error('[Prisma] Failed to create client:', error)
    // 返回 null 会在后续被捕获，API 返回 500 并附上错误信息
    return null as unknown as PrismaClient
  }
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// ── Vercel 环境：冷启动时自动 seed 内存数据库 ──
// 这样演示站就有初始数据，不会返回空列表
if (isVercel && db) {
  // 使用 self-invoking async IIFE 在模块加载时初始化
  ;(async () => {
    try {
      // 检查是否已有数据
      const avatarCount = await db.avatar.count()
      if (avatarCount === 0) {
        console.log('[Prisma] Seeding in-memory database...')
        // 这里可以调用 seed 脚本，或者硬编码演示数据
        // 为简洁，我们先创建一个基础示例 Avatar
        await db.avatar.create({
          data: {
            soulId: 'demo-soul-001',
            ownerAddress: '0x7a3f...9b2c',
            name: '飘叔.soul',
            cognitionRoot: 'QmX7...6oP8',
            resonanceScore: 72,
          },
        })
        console.log('[Prisma] Seed complete')
      }
    } catch (error) {
      console.error('[Prisma] Seed failed:', error)
    }
  })()
}
