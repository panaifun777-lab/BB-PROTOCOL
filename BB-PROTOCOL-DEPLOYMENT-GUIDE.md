# BB Protocol DeFi 仪表盘 — 全环境部署指南

> **版本:** 2.2.0
> **最后更新:** 2026-03-05
> **适用项目:** BB Protocol (Cognitive Avatar Protocol) — AI 分身去中心化金融系统
> **运行时:** Bun (非 Node.js)
> **目标链:** Base L2 (Ethereum Layer 2, Chain ID: 8453)

---

## 目录

1. [概述](#1-概述)
2. [环境要求](#2-环境要求)
3. [环境变量配置](#3-环境变量配置)
4. [本地开发环境部署](#4-本地开发环境部署)
5. [测试环境部署](#5-测试环境部署)
6. [生产环境部署](#6-生产环境部署)
7. [数据库部署与迁移](#7-数据库部署与迁移)
8. [智能合约部署](#8-智能合约部署)
9. [WebSocket 服务部署](#9-websocket-服务部署)
10. [监控与日志](#10-监控与日志)
11. [CI/CD 流水线](#11-cicd-流水线)
12. [安全加固](#12-安全加固)
13. [备份与恢复](#13-备份与恢复)
14. [故障排查](#14-故障排查)
15. [性能优化](#15-性能优化)
16. [升级指南](#16-升级指南)
17. [附录](#17-附录)

---

## 1. 概述

### 1.1 项目简介

BB Protocol 是一套基于 Base L2（以太坊二层网络）构建的 AI 分身去中心化金融系统。系统由以下核心模块组成：

| 模块 | 技术栈 | 说明 |
|------|--------|------|
| 前端仪表盘 | Next.js 16.1.3 + React 19 + Tailwind CSS 4 + shadcn/ui | App Router, Turbopack, Framer Motion 动画 |
| Web3 钱包 | ConnectKit + Wagmi + Viem | 支持 Base & Base Sepolia, enableAaveAccount: false |
| 数据库 | Prisma ORM + SQLite | 数据库文件位于 `db/` 目录, Schema 位于 `prisma/` |
| 支付系统 | Stripe SDK + x402 协议 | 法币订阅 + 链上按需付费 |
| 反向代理 | Caddy 2 | 支持 WebSocket, 自动 HTTPS, XTransformPort 路由 |
| WebSocket 服务 | Socket.IO (端口 3003/3004) | 共振模拟 + 监控模拟 |
| 引擎微服务 | IFD/ECE/POUE/MCP (端口 3005-3008) | 流体民主/情感共识/理解证明/MCP路由 |
| 国际化 | next-intl | 8 种语言 (zh/en/ja/ko/es/fr/de/ar) |
| 运行时 | Bun | **非 Node.js**，所有脚本均基于 Bun 执行 |

### 1.2 架构总览

```
                        ┌─────────────────────────┐
                        │    用户浏览器 / 客户端     │
                        └───────────┬─────────────┘
                                    │
                                    ▼
                        ┌─────────────────────────┐
                        │   Caddy 反向代理 (81/443)  │
                        │   XTransformPort 路由分发   │
                        └───────────┬─────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │ Next.js App      │  │ Socket.IO 服务   │  │ 引擎微服务       │
    │ 端口 3000        │  │ 3003/3004       │  │ 3005-3008       │
    │ 21 API 端点      │  │ 共振/监控模拟     │  │ IFD/ECE/POUE/MCP│
    └────────┬────────┘  └─────────────────┘  └─────────────────┘
             │
             ▼
    ┌─────────────────┐  ┌─────────────────┐
    │ SQLite (Prisma)  │  │ Stripe API      │
    │ db/*.db          │  │ x402 协议       │
    └─────────────────┘  └─────────────────┘
```

### 1.3 部署前检查清单

在开始部署之前，请确保以下条件已满足：

- [ ] 已获取 Base L2 RPC 端点 URL
- [ ] 已创建 WalletConnect 项目并获取 Project ID
- [ ] 已注册 Stripe 账户并获取 API 密钥
- [ ] 已安装 Bun 运行时 (>= 1.1.38)
- [ ] 已安装 Git 并配置 SSH 密钥
- [ ] 生产服务器满足最低硬件要求
- [ ] 已准备域名并配置 DNS 解析
- [ ] 已准备 SSL 证书（或使用 Caddy 自动获取）

---

## 2. 环境要求

### 2.1 操作系统

| 环境 | 推荐系统 | 最低版本 |
|------|----------|----------|
| 本地开发 | macOS 14+ / Ubuntu 22.04+ / Windows 11 WSL2 | macOS 12 / Ubuntu 20.04 |
| Docker 部署 | 任意支持 Docker 的 Linux | Docker Engine 24.0+ |
| 生产 VPS | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 20.04 LTS |
| Vercel 部署 | Vercel 托管平台 | 无需操作系统 |

### 2.2 运行时与工具版本

| 工具 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| **Bun** | 1.1.38 | 1.1.38+ | 核心运行时，**不可使用 Node.js 替代** |
| Git | 2.30+ | 2.40+ | 版本控制 |
| Docker | 24.0+ | 25.0+ | 容器化部署 |
| Docker Compose | 2.20+ | 2.24+ | 容器编排 |
| Caddy | 2.7+ | 2.8+ | 反向代理（自托管时） |
| curl | 7.80+ | 最新 | 健康检查 |

> ⚠️ **重要提示：** 本项目使用 Bun 作为运行时，不支持 Node.js。所有 `package.json` 脚本均通过 `bun` 命令执行。Bun 的包管理器 `bun install` 使用 `bun.lock` 而非 `package-lock.json`。

### 2.3 硬件要求

#### 本地开发环境

| 资源 | 最低要求 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核 | 4 核+ |
| 内存 | 4 GB | 8 GB+ |
| 磁盘 | 10 GB 可用空间 | 20 GB+ SSD |
| 网络 | 稳定互联网连接 | 宽带 10 Mbps+ |

#### 生产环境

| 资源 | 最低要求 | 推荐配置 | 说明 |
|------|----------|----------|------|
| CPU | 2 核 | 4 核+ | 需支撑 Next.js SSR + 微服务 |
| 内存 | 4 GB | 8-16 GB | 6 个微服务 + 主应用需充足内存 |
| 磁盘 | 20 GB SSD | 50-100 GB SSD | SQLite 数据库 + 日志 + 静态资源 |
| 网络 | 5 Mbps | 20 Mbps+ | WebSocket 长连接需稳定带宽 |

> 💡 **内存说明：** 完整部署包含主应用 + 6 个微服务 + Caddy，最低内存需求约 4 GB。在生产环境中，建议 8 GB 以上以确保稳定运行。如果内存受限，可通过 Docker Compose profiles 仅启动必要服务。

### 2.4 网络端口规划

| 端口 | 服务 | 协议 | 必需性 |
|------|------|------|--------|
| 80/443 | Caddy 反向代理 | HTTP/HTTPS | 生产必需 |
| 81 | Caddy 开发端口 | HTTP | 开发环境 |
| 3000 | Next.js 主应用 | HTTP | 必需 |
| 3003 | resonance-sim | WebSocket (Socket.IO) | 推荐 |
| 3004 | monitoring-sim | WebSocket (Socket.IO) | 推荐 |
| 3005 | ifd-calculator | HTTP | 可选 (engine profile) |
| 3006 | ece-oracle | HTTP | 可选 (engine profile) |
| 3007 | poue-prover | HTTP | 可选 (engine profile) |
| 3008 | mcp-router | HTTP | 可选 (engine profile) |
| 9229 | Node.js 调试器 | HTTP | 仅开发环境 |

---

## 3. 环境变量配置

### 3.1 环境变量总览

项目依赖以下环境变量，按类别分组说明。所有变量均需在 `.env` 文件或部署平台的环境变量配置中设置。

### 3.2 核心应用变量

```bash
# =============================================================================
# 核心应用配置
# =============================================================================

# Node.js 环境标识
NODE_ENV=production                          # development | production | test

# 应用端口
PORT=3000                                    # Next.js 监听端口

# 应用 URL（用于 Stripe 回调和 SEO）
NEXT_PUBLIC_BASE_URL=https://your-domain.com        # 生产环境域名
NEXT_PUBLIC_APP_URL=https://your-domain.com          # 应用 URL（支付回调等）
```

### 3.3 区块链与 Web3 变量

```bash
# =============================================================================
# 区块链 / Web3 配置
# =============================================================================

# 目标链 ID
# 8453 = Base Mainnet
# 84532 = Base Sepolia (测试网)
NEXT_PUBLIC_CHAIN_ID=8453

# RPC 端点 URL
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org          # Base Mainnet
# NEXT_PUBLIC_RPC_URL=https://sepolia.base.org        # Base Sepolia
# NEXT_PUBLIC_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY  # Alchemy
# NEXT_PUBLIC_RPC_URL=https://base.blockpi.network/v1/rpc/YOUR_API_KEY     # BlockPi

# WalletConnect 项目 ID
# 从 https://cloud.walletconnect.com/ 获取
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# 已部署的智能合约地址
NEXT_PUBLIC_DYNAMIC_SPLITTER_ADDRESS=0x...             # DynamicSplitter.sol 合约地址
NEXT_PUBLIC_TOKEN_VAULT_ADDRESS=0x...                  # TokenVault.sol 合约地址
```

### 3.4 Stripe 支付变量

```bash
# =============================================================================
# Stripe 支付配置
# =============================================================================

# Stripe 密钥（仅服务端使用）
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxx       # 生产环境密钥
# STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxx     # 测试环境密钥

# Stripe 公钥（前端使用）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook 签名密钥
# 从 Stripe Dashboard → Webhooks → 签名密钥 获取
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx

# Stripe 订阅价格 ID
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxxx           # Starter 订阅 $9.99/月
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxx              # Pro 订阅 $29.99/月
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxxx       # Enterprise 订阅 $99.99/月
```

### 3.5 x402 协议变量

```bash
# =============================================================================
# x402 协议配置（链上按需付费）
# =============================================================================

# x402 支付接收地址
X402_RECEIVER_ADDRESS=0x...                            # 链上收款钱包地址

# x402 支付金额（单位：USDC 最小单位）
X402_DEFAULT_AMOUNT=200                                # 默认 $2.00 (200 cents)

# x402 网络配置
X402_NETWORK=base                                      # base | base-sepolia

# x402 Facilitator URL
X402_FACILITATOR_URL=https://facilitator.x402.org
```

### 3.6 数据库变量

```bash
# =============================================================================
# 数据库配置 (Prisma + SQLite)
# =============================================================================

# SQLite 数据库文件路径
# 本地开发
DATABASE_URL=file:./db/dev.db
# 生产环境（Docker 容器内）
DATABASE_URL=file:./db/production.db
# 绝对路径
# DATABASE_URL=file:/home/z/my-project/db/custom.db
```

### 3.7 认证变量

```bash
# =============================================================================
# NextAuth 认证配置
# =============================================================================

# NextAuth 密钥（用于加密 JWT 等）
# 生成方法: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here_at_least_32_chars

# NextAuth URL
NEXTAUTH_URL=https://your-domain.com

# NextAuth 提供商（可选）
# GITHUB_ID=your_github_oauth_id
# GITHUB_SECRET=your_github_oauth_secret
# GOOGLE_ID=your_google_oauth_id
# GOOGLE_SECRET=your_google_oauth_secret
```

### 3.8 微服务变量

```bash
# =============================================================================
# 微服务配置
# =============================================================================

# CORS 允许源
CORS_ORIGIN=https://your-domain.com                     # 生产环境
# CORS_ORIGIN=http://localhost:3000                     # 开发环境

# 引擎 RPC 配置（微服务共用）
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
```

### 3.9 日志与监控变量

```bash
# =============================================================================
# 日志与监控
# =============================================================================

# Next.js 遥测
NEXT_TELEMETRY_DISABLED=1                               # 禁用遥测（推荐生产环境）

# 日志级别
LOG_LEVEL=info                                          # debug | info | warn | error

# Sentry DSN（可选，错误追踪）
# NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 3.10 完整 .env.example

参见 [附录 F: 完整 .env.example](#附录f-完整-envexample)

---

## 4. 本地开发环境部署

### 4.1 安装 Bun 运行时

#### macOS

```bash
# 使用官方安装脚本
curl -fsSL https://bun.sh/install | bash

# 或使用 Homebrew
brew tap oven-sh/bun
brew install oven-sh/bun/bun
```

#### Linux (Ubuntu/Debian)

```bash
# 使用官方安装脚本
curl -fsSL https://bun.sh/install | bash

# 安装完成后重新加载 Shell
source ~/.bashrc
# 或
source ~/.zshrc
```

#### Windows (WSL2)

```bash
# 在 WSL2 Ubuntu 中执行
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

#### 验证安装

```bash
bun --version
# 预期输出: 1.1.38 或更高版本
```

### 4.2 克隆仓库

```bash
# 通过 SSH 克隆
git clone git@github.com:your-org/bb-protocol-dashboard.git
cd bb-protocol-dashboard

# 或通过 HTTPS 克隆
git clone https://github.com/your-org/bb-protocol-dashboard.git
cd bb-protocol-dashboard
```

### 4.3 安装依赖

```bash
# 安装主应用依赖
bun install

# 验证安装
bun --version && echo "依赖安装完成"
```

> ⚠️ **注意：** 请勿使用 `npm install` 或 `yarn install`。本项目使用 Bun 运行时，`bun.lock` 与 `package-lock.json` 不兼容。混用包管理器可能导致依赖版本不一致。

### 4.4 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 文件，填入必要的配置
# 最低开发环境配置：
cat > .env << 'EOF'
NODE_ENV=development
DATABASE_URL=file:./db/dev.db
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_demo_project_id
NEXTAUTH_SECRET=dev-secret-do-not-use-in-production
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
CORS_ORIGIN=http://localhost:3000
NEXT_TELEMETRY_DISABLED=1
EOF
```

> 💡 **开发环境建议：** 使用 Base Sepolia 测试网 (Chain ID: 84532) 进行开发，避免在主网上产生实际交易费用。

### 4.5 初始化数据库

```bash
# 生成 Prisma Client
bun run db:generate

# 推送 Schema 到数据库（开发环境使用 db:push，无需迁移文件）
bun run db:push

# 如果需要使用迁移系统
# bun run db:migrate

# 可选：填充种子数据
bun run db:seed
# 或通过 API
curl http://localhost:3000/api/seed
```

### 4.6 启动开发服务器

```bash
# 启动 Next.js 开发服务器（Turbopack）
bun run dev
```

开发服务器启动后，访问以下地址验证：

| 地址 | 说明 |
|------|------|
| http://localhost:3000 | 主页面 |
| http://localhost:3000/api/health | 健康检查 |
| http://localhost:3000/api/dashboard | 仪表盘数据 API |

### 4.7 启动微服务

本地开发时，微服务需在独立终端中启动：

```bash
# 终端 2: 启动共振模拟服务 (Socket.IO, 端口 3003)
cd mini-services/resonance-sim
bun install
bun run dev

# 终端 3: 启动监控模拟服务 (Socket.IO, 端口 3004)
cd mini-services/monitoring-sim
bun install
bun run dev

# 终端 4: 启动 IFD 计算引擎 (端口 3005)
cd mini-services/ifd-calculator
bun install
bun --hot index.ts

# 终端 5: 启动 ECE 预言机引擎 (端口 3006)
cd mini-services/ece-oracle
bun install
bun --hot index.ts

# 终端 6: 启动 POUE 证明引擎 (端口 3007)
cd mini-services/poue-prover
bun install
bun --hot index.ts

# 终端 7: 启动 MCP 路由引擎 (端口 3008)
cd mini-services/mcp-router
bun install
bun --hot index.ts
```

> 💡 **内存受限环境：** 如果系统内存不足 8 GB，建议仅启动 resonance-sim (3003) 和 monitoring-sim (3004)。前端仪表盘会自动降级到 Mock 数据模式。

### 4.8 启动 Caddy 网关（可选）

```bash
# 安装 Caddy
# macOS
brew install caddy

# Ubuntu
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 启动 Caddy（使用项目根目录的 Caddyfile）
caddy run --config Caddyfile

# 验证
curl http://localhost:81/api/health
```

### 4.9 验证开发环境

```bash
# 验证主应用
curl -s http://localhost:3000/api/health | head -20

# 验证 Socket.IO 服务
curl -s http://localhost:3003/health
curl -s http://localhost:3004/health

# 验证引擎微服务
curl -s http://localhost:3005/health
curl -s http://localhost:3006/health
curl -s http://localhost:3007/health
curl -s http://localhost:3008/health

# 验证 Caddy 网关路由
curl -s http://localhost:81/api/health
curl -s "http://localhost:81/?XTransformPort=3003"
```

---

## 5. 测试环境部署

### 5.1 Docker 开发环境部署

#### 前置条件

```bash
# 安装 Docker
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# macOS
brew install --cask docker

# 验证
docker --version
docker compose version
```

#### 启动开发环境容器

```bash
# 使用 Docker Compose 启动开发环境
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f app
docker compose logs -f resonance-sim
```

#### 开发环境特性

| 特性 | 说明 |
|------|------|
| 热重载 | 通过 `bun --hot` 和 Next.js Turbopack 实现 |
| 源码挂载 | 本地源码挂载到容器，修改即时生效 |
| 调试端口 | 9229-9235 映射到各服务 |
| Mock 数据 | 未启动的服务自动降级到 Mock 数据 |
| CHOKIDAR_USEPOLLING | 启用文件轮询，适配 Docker 文件系统事件 |

### 5.2 Vercel 预览部署

#### 配置步骤

1. **连接 GitHub 仓库：**
   - 登录 [Vercel Dashboard](https://vercel.com/dashboard)
   - 点击 "Add New Project"
   - 选择 GitHub 仓库 `bb-protocol-dashboard`

2. **配置构建设置：**
   - Framework Preset: **Next.js**
   - Build Command: `bun run build`
   - Output Directory: `.next`
   - Install Command: `bun install`

3. **配置环境变量：** 在 Vercel 项目设置 → Environment Variables 中添加所有测试环境变量：

   ```bash
   NODE_ENV=production
   DATABASE_URL=file:./db/preview.db
   NEXT_PUBLIC_CHAIN_ID=84532
   NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_test_project_id
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   NEXTAUTH_SECRET=preview-secret-change-me
   NEXTAUTH_URL=https://preview.your-domain.com
   ```

4. **触发预览部署：**
   ```bash
   # 创建功能分支并推送
   git checkout -b feature/your-feature
   git push origin feature/your-feature
   # Vercel 自动创建预览部署
   ```

#### Vercel 预览部署注意事项

- SQLite 数据库在 Vercel Serverless 环境中为临时存储，每次部署会重置
- WebSocket 微服务需要在独立服务器上运行，Vercel 不支持长连接
- Stripe Webhook 需要使用 Stripe CLI 转发到预览 URL

### 5.3 测试环境 Stripe Webhook 配置

```bash
# 安装 Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --import
wget -O /tmp/stripe_linux_x86_64.tar.gz https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
sudo tar -xzf /tmp/stripe_linux_x86_64.tar.gz -C /usr/local/bin stripe

# 登录 Stripe
stripe login

# 转发 Webhook 到本地/预览环境
stripe listen --forward-to https://preview-xxx.vercel.app/api/stripe/webhook

# 触发测试事件
stripe trigger payment_intent.succeeded
```

---

## 6. 生产环境部署

### 6.1 Vercel 生产部署

#### 部署步骤

1. **创建生产项目：**
   - 在 Vercel 中创建项目，选择生产分支（通常为 `main`）
   - 配置构建命令：`bun run build`
   - 配置安装命令：`bun install`

2. **配置生产环境变量：**
   - 在 Settings → Environment Variables → Production 中添加所有生产变量
   - 确保 `STRIPE_SECRET_KEY` 使用 `sk_live_` 前缀
   - 确保 `NEXT_PUBLIC_CHAIN_ID=8453`（Base Mainnet）

3. **部署：**
   ```bash
   # 合并代码到 main 分支触发自动部署
   git checkout main
   git merge feature/your-feature
   git push origin main
   ```

#### Vercel 生产部署限制

| 限制 | 说明 | 解决方案 |
|------|------|----------|
| SQLite 持久化 | Serverless 环境无持久化存储 | 改用 PlanetScale / Turso / PostgreSQL |
| WebSocket | 不支持长连接 | 微服务部署到独立 VPS |
| 执行时间 | Serverless 函数有超时限制 | 使用 Vercel Pro 或自托管 |
| 包大小 | 50 MB 函数大小限制 | 优化依赖，使用 standalone 输出 |

> ⚠️ **生产环境建议：** 对于需要完整功能（WebSocket、持久化数据库、微服务）的生产部署，推荐使用 Docker + VPS 方案而非 Vercel。

### 6.2 Docker + Docker Compose 生产部署

#### 6.2.1 准备服务器

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose（如果未自带）
sudo apt install -y docker-compose-plugin

# 验证
docker --version
docker compose version
```

#### 6.2.2 准备部署文件

```bash
# 创建部署目录
mkdir -p /opt/bb-protocol
cd /opt/bb-protocol

# 克隆仓库
git clone git@github.com:your-org/bb-protocol-dashboard.git .
# 或使用部署分支
git clone -b production git@github.com:your-org/bb-protocol-dashboard.git .

# 创建生产环境变量文件
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=file:./db/production.db
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_production_project_id
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxxx
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_DYNAMIC_SPLITTER_ADDRESS=0x...
NEXT_PUBLIC_TOKEN_VAULT_ADDRESS=0x...
CORS_ORIGIN=https://your-domain.com
NEXT_TELEMETRY_DISABLED=1
X402_RECEIVER_ADDRESS=0x...
X402_NETWORK=base
EOF

# 设置文件权限
chmod 600 .env
```

#### 6.2.3 构建与启动

```bash
# 构建镜像
docker compose build

# 启动核心服务（不包含引擎微服务）
docker compose up -d

# 如需启动所有服务（包含引擎微服务）
docker compose --profile engine up -d

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f
```

#### 6.2.4 初始化数据库

```bash
# 在应用容器内执行数据库迁移
docker compose exec app bun run db:generate
docker compose exec app bun run db:push

# 可选：填充种子数据
docker compose exec app curl -s http://localhost:3000/api/seed
```

#### 6.2.5 验证部署

```bash
# 检查所有容器健康状态
docker compose ps

# 测试主应用健康检查
curl -s https://your-domain.com/api/health

# 测试 Socket.IO 服务
curl -s https://your-domain.com/health?XTransformPort=3003

# 测试 Caddy 路由
curl -s "https://your-domain.com/?XTransformPort=3003"
```

### 6.3 VPS 自托管部署（Nginx 方案）

#### 6.3.1 安装 Bun 与项目依赖

```bash
# 安装 Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 创建应用目录
sudo mkdir -p /opt/bb-protocol
sudo chown $USER:$USER /opt/bb-protocol
cd /opt/bb-protocol

# 克隆代码
git clone git@github.com:your-org/bb-protocol-dashboard.git .

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入生产配置
```

#### 6.3.2 构建与数据库初始化

```bash
# 生成 Prisma Client
bun run db:generate

# 推送 Schema
bun run db:push

# 构建生产版本
bun run build
```

#### 6.3.3 使用 PM2 管理进程

```bash
# 安装 PM2
bun add -g pm2

# 创建 PM2 生态系统配置
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'bb-protocol-app',
      script: 'bun',
      args: '.next/standalone/server.js',
      cwd: '/opt/bb-protocol',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/bb-protocol/app-error.log',
      out_file: '/var/log/bb-protocol/app-out.log',
      merge_logs: true,
    },
    {
      name: 'bb-resonance-sim',
      script: 'bun',
      args: 'run index.ts',
      cwd: '/opt/bb-protocol/mini-services/resonance-sim',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        CORS_ORIGIN: 'https://your-domain.com',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/log/bb-protocol/resonance-error.log',
      out_file: '/var/log/bb-protocol/resonance-out.log',
    },
    {
      name: 'bb-monitoring-sim',
      script: 'bun',
      args: 'run index.ts',
      cwd: '/opt/bb-protocol/mini-services/monitoring-sim',
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        CORS_ORIGIN: 'https://your-domain.com',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/log/bb-protocol/monitoring-error.log',
      out_file: '/var/log/bb-protocol/monitoring-out.log',
    },
    {
      name: 'bb-ifd-calculator',
      script: 'bun',
      args: 'run index.ts',
      cwd: '/opt/bb-protocol/mini-services/ifd-calculator',
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        RPC_URL: 'https://mainnet.base.org',
        CHAIN_ID: 8453,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/log/bb-protocol/ifd-error.log',
      out_file: '/var/log/bb-protocol/ifd-out.log',
    },
    {
      name: 'bb-ece-oracle',
      script: 'bun',
      args: 'run index.ts',
      cwd: '/opt/bb-protocol/mini-services/ece-oracle',
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        RPC_URL: 'https://mainnet.base.org',
        CHAIN_ID: 8453,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/log/bb-protocol/ece-error.log',
      out_file: '/var/log/bb-protocol/ece-out.log',
    },
    {
      name: 'bb-poue-prover',
      script: 'bun',
      args: 'run index.ts',
      cwd: '/opt/bb-protocol/mini-services/poue-prover',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
        RPC_URL: 'https://mainnet.base.org',
        CHAIN_ID: 8453,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/log/bb-protocol/poue-error.log',
      out_file: '/var/log/bb-protocol/poue-out.log',
    },
    {
      name: 'bb-mcp-router',
      script: 'bun',
      args: 'run index.ts',
      cwd: '/opt/bb-protocol/mini-services/mcp-router',
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
        RPC_URL: 'https://mainnet.base.org',
        CHAIN_ID: 8453,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      error_file: '/var/log/bb-protocol/mcp-error.log',
      out_file: '/var/log/bb-protocol/mcp-out.log',
    },
  ],
};
EOF

# 创建日志目录
sudo mkdir -p /var/log/bb-protocol
sudo chown $USER:$USER /var/log/bb-protocol

# 启动所有服务
pm2 start ecosystem.config.js

# 保存进程列表（开机自启）
pm2 save
pm2 startup
```

#### 6.3.4 配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt install -y nginx

# 创建 Nginx 配置
sudo tee /etc/nginx/sites-available/bb-protocol << 'EOF'
# =============================================================================
# Nginx 配置 — BB Protocol DeFi Dashboard
# =============================================================================

# 限流配置
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=general:10m rate=60r/m;

# 上游服务
upstream nextjs_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream resonance_sim {
    server 127.0.0.1:3003;
}

upstream monitoring_sim {
    server 127.0.0.1:3004;
}

upstream ifd_calculator {
    server 127.0.0.1:3005;
}

upstream ece_oracle {
    server 127.0.0.1:3006;
}

upstream poue_prover {
    server 127.0.0.1:3007;
}

upstream mcp_router {
    server 127.0.0.1:3008;
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS 主服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头部
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://mainnet.base.org https://sepolia.base.org wss: https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com;" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # 客户端请求大小限制
    client_max_body_size 10M;

    # XTransformPort 路由（微服务代理）
    # 共振模拟服务
    location / {
        if ($arg_XTransformPort = "3003") {
            proxy_pass http://resonance_sim;
            break;
        }
        if ($arg_XTransformPort = "3004") {
            proxy_pass http://monitoring_sim;
            break;
        }
        if ($arg_XTransformPort = "3005") {
            proxy_pass http://ifd_calculator;
            break;
        }
        if ($arg_XTransformPort = "3006") {
            proxy_pass http://ece_oracle;
            break;
        }
        if ($arg_XTransformPort = "3007") {
            proxy_pass http://poue_prover;
            break;
        }
        if ($arg_XTransformPort = "3008") {
            proxy_pass http://mcp_router;
            break;
        }

        # 默认路由到 Next.js 应用
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # API 路由限流
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Stripe Webhook（不限流）
    location /api/stripe/webhook {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Stripe-Signature $http_stripe_signature;
    }

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://nextjs_app;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查端点
    location /api/health {
        proxy_pass http://nextjs_app;
        access_log off;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/bb-protocol /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.4 VPS 自托管部署（Caddy 方案，推荐）

Caddy 是推荐的部署方案，支持自动 HTTPS 和更简洁的配置。

```bash
# 安装 Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

创建生产 Caddyfile：

```bash
sudo tee /etc/caddy/Caddyfile << 'EOF'
# =============================================================================
# Caddyfile — BB Protocol 生产环境配置
# =============================================================================

your-domain.com {
    # ── XTransformPort 路由规则 ────────────────────────────────
    # 微服务通过查询参数路由

    @resonance query XTransformPort=3003
    @monitoring query XTransformPort=3004
    @ifd query XTransformPort=3005
    @ece query XTransformPort=3006
    @poue query XTransformPort=3007
    @mcp query XTransformPort=3008

    handle @resonance {
        reverse_proxy localhost:3003
    }
    handle @monitoring {
        reverse_proxy localhost:3004
    }
    handle @ifd {
        reverse_proxy localhost:3005
    }
    handle @ece {
        reverse_proxy localhost:3006
    }
    handle @poue {
        reverse_proxy localhost:3007
    }
    handle @mcp {
        reverse_proxy localhost:3008
    }

    # ── 默认路由：Next.js 应用 ────────────────────────────────
    handle {
        reverse_proxy localhost:3000
    }

    # ── TLS 配置（Caddy 自动获取 Let's Encrypt 证书） ──────────
    # Caddy 会自动管理证书，无需手动配置

    # ── 压缩 ──────────────────────────────────────────────────
    encode gzip zstd

    # ── 安全头部 ──────────────────────────────────────────────
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        X-XSS-Protection "1; mode=block"
        -Server
    }

    # ── 日志 ──────────────────────────────────────────────────
    log {
        output file /var/log/caddy/bb-protocol-access.log {
            roll_size 100mb
            roll_keep 10
        }
        format json
    }

    # ── 速率限制（需 Caddy 速率限制模块） ─────────────────────
    # rate_limit {
    #     zone api_zone {
    #         key    {remote_host}
    #         events 30
    #         window 1m
    #     }
    # }
}
EOF

# 重载 Caddy 配置
sudo systemctl reload caddy

# 验证
curl -s https://your-domain.com/api/health
```

### 6.5 SSL/TLS 配置

#### Caddy 自动 HTTPS（推荐）

Caddy 默认自动获取和续期 Let's Encrypt 证书：

```bash
# 确保域名 DNS 已指向服务器
dig your-domain.com +short

# Caddy 会自动在首次请求时获取证书
# 证书存储在 /var/lib/caddy/.local/share/caddy/certificates/
```

#### Let's Encrypt + Nginx 手动配置

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期（Certbot 默认安装 cron）
sudo certbot renew --dry-run
```

#### 自定义证书

```nginx
# Nginx 使用自定义证书
ssl_certificate /etc/ssl/certs/your-domain.crt;
ssl_certificate_key /etc/ssl/private/your-domain.key;
```

```
# Caddy 使用自定义证书
your-domain.com {
    tls /etc/ssl/certs/your-domain.crt /etc/ssl/private/your-domain.key
    # ...
}
```

### 6.6 域名与 DNS 配置

#### DNS 记录配置

| 记录类型 | 主机 | 值 | TTL |
|----------|------|-----|-----|
| A | @ | 你的服务器 IP | 300 |
| A | www | 你的服务器 IP | 300 |
| CNAME | api | your-domain.com | 300 |

#### DNS 验证

```bash
# 验证 A 记录
dig your-domain.com +short

# 验证 www
dig www.your-domain.com +short

# 验证 SSL 证书
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### 6.7 CDN 配置

#### Cloudflare CDN 配置

1. **添加域名到 Cloudflare**
   - 登录 Cloudflare Dashboard
   - 添加 `your-domain.com`
   - 更新域名注册商的 Nameserver 为 Cloudflare 提供的值

2. **SSL/TLS 设置**
   - SSL/TLS → Overview → 设置为 **Full (Strict)**
   - Edge Certificates → 启用 **Always Use HTTPS**
   - Edge Certificates → 启用 **Automatic HTTPS Rewrites**

3. **缓存规则**
   - Rules → Page Rules:
     - `*your-domain.com/_next/static/*` → Cache Level: Cache Everything, Edge Cache TTL: 1 month
     - `*your-domain.com/api/*` → Cache Level: Bypass
   - Rules → Cache Rules:
     - 静态资源 (`.js`, `.css`, `.woff2`, `.png`, `.jpg`) → Edge TTL: 30d

4. **WebSocket 支持**
   - Cloudflare 默认支持 WebSocket，无需额外配置
   - 确保 Cloudflare 代理状态为已代理（橙色云朵）

5. **安全设置**
   - Security → WAF → 启用 Managed Rules
   - Security → Bot Fight Mode → 启用
   - Security → Rate Limiting → API 路由限流

---

## 7. 数据库部署与迁移

### 7.1 SQLite 数据库架构

BB Protocol 使用 SQLite 作为数据库，通过 Prisma ORM 管理。数据库文件位于 `db/` 目录，Schema 定义在 `prisma/schema.prisma`。

#### 数据模型概览

| 模型分类 | 模型名称 | 说明 |
|----------|----------|------|
| 核心模型 | Avatar, Skill, AvatarSkill | 认知分身与技能 |
| 收益模型 | Revenue | 收益分账记录 |
| 委托模型 | Delegation | 流体民主委托 |
| 时间线模型 | TimelineEvent, ResonanceHistory | 事件与共振历史 |
| 订阅模型 | Subscription, UsageRecord, Invoice | Stripe 订阅与账单 |
| 支付模型 | Payment, CurrencyRate | x402 支付与汇率 |
| 安全模型 | AuditLog, SecurityInvariant | 安全审计 |
| 流动性模型 | LiquidityPool, LpTransaction | LP 池管理 |
| 合规模型 | CompliancePlugin, Jurisdiction | 合规插件与管辖区 |
| 合约模型 | ContractSimulation, ContractDeploymentRecord, MultiSigOperation | 合约模拟与部署 |
| 性能模型 | PerformanceMetric, CacheStrategy | 性能监控与缓存 |
| 灰度模型 | FeatureFlagRecord, ABTestRecord, RollbackLog | 功能开关与 A/B 测试 |
| 多链模型 | SupportedChain, CrossChainBridge, ChainSwitchRecord | 多链部署 |
| SDK 模型 | ApiKeyRecord, SdkPackageRecord, WebhookRecord | API 密钥与 Webhook |
| 治理模型 | GovernanceProposalRecord, DelegationRecord, TreasuryTransactionRecord | DAO 治理 |
| 生态模型 | ProtocolIntegrationRecord, EcosystemNotificationRecord | 协议集成 |

### 7.2 数据库初始化

```bash
# 生成 Prisma Client
bun run db:generate

# 方式一：db:push（推荐开发环境，直接同步 Schema）
bun run db:push

# 方式二：migrate dev（推荐生产环境，生成迁移文件）
bun run db:migrate
```

### 7.3 生产环境迁移策略

```bash
# 创建命名迁移
bunx prisma migrate dev --name init_production_schema

# 在生产环境应用迁移
bunx prisma migrate deploy

# 查看迁移状态
bunx prisma migrate status
```

#### 迁移工作流程

```
1. 开发环境修改 prisma/schema.prisma
2. 运行 prisma migrate dev --name descriptive_name
3. 审查生成的迁移 SQL (prisma/migrations/xxxxxx_descriptive_name/migration.sql)
4. 提交迁移文件到版本控制
5. 在生产环境运行 prisma migrate deploy
```

### 7.4 数据库备份策略

#### 自动备份脚本

```bash
#!/bin/bash
# backup-db.sh — SQLite 数据库备份脚本

# 配置
DB_PATH="/opt/bb-protocol/db/production.db"
BACKUP_DIR="/opt/bb-protocol/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/production_${TIMESTAMP}.db"

# 创建备份目录
mkdir -p "${BACKUP_DIR}"

# 使用 SQLite 内置备份（保证一致性）
sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"

# 压缩备份
gzip "${BACKUP_FILE}"

# 验证备份
if [ -f "${BACKUP_FILE}.gz" ]; then
    echo "[$(date)] 备份成功: ${BACKUP_FILE}.gz ($(du -h ${BACKUP_FILE}.gz | cut -f1))"
else
    echo "[$(date)] 备份失败！" >&2
    exit 1
fi

# 清理过期备份
find "${BACKUP_DIR}" -name "production_*.db.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] 已清理 ${RETENTION_DAYS} 天前的旧备份"
```

#### 设置 Cron 定时备份

```bash
# 编辑 crontab
crontab -e

# 每 6 小时备份一次
0 */6 * * * /opt/bb-protocol/scripts/backup-db.sh >> /var/log/bb-protocol/backup.log 2>&1

# 每天凌晨 2 点完整备份
0 2 * * * /opt/bb-protocol/scripts/backup-db.sh >> /var/log/bb-protocol/backup.log 2>&1
```

#### 远程备份（S3）

```bash
#!/bin/bash
# backup-db-s3.sh — 备份数据库到 S3

DB_PATH="/opt/bb-protocol/db/production.db"
S3_BUCKET="s3://your-backup-bucket/bb-protocol/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 本地备份
sqlite3 "${DB_PATH}" ".backup '/tmp/production_${TIMESTAMP}.db'"
gzip "/tmp/production_${TIMESTAMP}.db"

# 上传到 S3
aws s3 cp "/tmp/production_${TIMESTAMP}.db.gz" "${S3_BUCKET}/production_${TIMESTAMP}.db.gz"

# 清理本地临时文件
rm -f "/tmp/production_${TIMESTAMP}.db.gz"

# 清理 S3 上的旧备份（保留 90 天）
aws s3 ls "${S3_BUCKET}/" | while read -r line; do
    createDate=$(echo "$line" | awk '{print $1" "$2}')
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "-90 days" +%s)
    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo "$line" | awk '{print $4}')
        if [[ "$fileName" != "" ]]; then
            aws s3 rm "${S3_BUCKET}/${fileName}"
        fi
    fi
done
```

### 7.5 数据库恢复

```bash
# 从备份恢复
gunzip -c /opt/bb-protocol/backups/production_20260305_020000.db.gz > /tmp/restored.db

# 验证备份完整性
sqlite3 /tmp/restored.db "PRAGMA integrity_check;"

# 停止应用
pm2 stop all
# 或
docker compose stop app

# 替换数据库文件
cp /opt/bb-protocol/db/production.db /opt/bb-protocol/db/production.db.corrupted
cp /tmp/restored.db /opt/bb-protocol/db/production.db

# 重新生成 Prisma Client
bun run db:generate

# 重启应用
pm2 start all
# 或
docker compose start app
```

---

## 8. 智能合约部署

### 8.1 合约概述

BB Protocol 在 Base L2 上部署两个核心智能合约：

| 合约 | 说明 | 核心功能 |
|------|------|----------|
| **DynamicSplitter.sol** | 动态分账合约 | 根据共振分动态调整收益分配比例 (人类70%/分身20%/协议10%) |
| **TokenVault.sol** | 代币金库合约 | 管理分身金库余额，支持存取款和余额查询 |

### 8.2 部署前准备

#### 8.2.1 安装 Foundry

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup

# 验证
forge --version
cast --version
```

#### 8.2.2 准备部署钱包

```bash
# 从私钥导入部署钱包
cast wallet import deployer --interactive
# 输入私钥和密码

# 验证余额（需 ETH 用于 Gas）
cast balance <deployer_address> --rpc-url https://mainnet.base.org

# 如果余额不足，从交易所或跨链桥转入 ETH 到 Base L2
```

#### 8.2.3 准备部署参数

```bash
# DynamicSplitter 合约参数
# - owner: 多签钱包地址或部署者地址
# - protocolReceiver: 协议收款地址
# - defaultHumanBps: 7000 (70%)
# - defaultAvatarBps: 2000 (20%)
# - defaultProtocolBps: 1000 (10%)

# TokenVault 合约参数
# - owner: 多签钱包地址或部署者地址
# - acceptedToken: USDC 合约地址 (Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
```

### 8.3 部署 DynamicSplitter.sol

```bash
# 进入合约目录
cd contracts/

# 编译合约
forge build

# 部署到 Base Sepolia 测试网
forge create DynamicSplitter \
    --rpc-url https://sepolia.base.org \
    --account deployer \
    --constructor-args <owner_address> <protocol_receiver_address> 7000 2000 1000

# 部署到 Base Mainnet
forge create DynamicSplitter \
    --rpc-url https://mainnet.base.org \
    --account deployer \
    --constructor-args <owner_address> <protocol_receiver_address> 7000 2000 1000

# 记录部署地址！
# DynamicSplitter deployed at: 0x...
```

### 8.4 部署 TokenVault.sol

```bash
# 部署到 Base Sepolia 测试网
forge create TokenVault \
    --rpc-url https://sepolia.base.org \
    --account deployer \
    --constructor-args <owner_address> 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# 部署到 Base Mainnet
forge create TokenVault \
    --rpc-url https://mainnet.base.org \
    --account deployer \
    --constructor-args <owner_address> 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# 记录部署地址！
# TokenVault deployed at: 0x...
```

### 8.5 合约验证

```bash
# 在 Base Sepolia 上验证
forge verify-contract <contract_address> DynamicSplitter \
    --rpc-url https://sepolia.base.org \
    --verifier blockscout \
    --verifier-url https://base-sepolia.blockscout.com/api

forge verify-contract <contract_address> TokenVault \
    --rpc-url https://sepolia.base.org \
    --verifier blockscout \
    --verifier-url https://base-sepolia.blockscout.com/api

# 在 Base Mainnet 上验证
forge verify-contract <contract_address> DynamicSplitter \
    --rpc-url https://mainnet.base.org \
    --verifier etherscan \
    --api-key <basescan_api_key>

forge verify-contract <contract_address> TokenVault \
    --rpc-url https://mainnet.base.org \
    --verifier etherscan \
    --api-key <basescan_api_key>
```

### 8.6 更新应用合约地址

部署完成后，更新环境变量：

```bash
# 更新 .env 文件
NEXT_PUBLIC_DYNAMIC_SPLITTER_ADDRESS=0x...    # DynamicSplitter 部署地址
NEXT_PUBLIC_TOKEN_VAULT_ADDRESS=0x...         # TokenVault 部署地址

# 重启应用
pm2 restart bb-protocol-app
# 或
docker compose restart app
```

### 8.7 合约安全检查清单

- [ ] 合约经过专业审计
- [ ] 使用 OpenZeppelin 标准库
- [ ] Owner 权限转移至多签钱包 (Gnosis Safe)
- [ ] 紧急暂停功能已测试
- [ ] 所有访问控制已正确设置
- [ ] 整数溢出保护（Solidity 0.8+ 内置）
- [ ] 重入攻击防护（ReentrancyGuard）
- [ ] 合约源码已在 Basescan 上验证

---

## 9. WebSocket 服务部署

### 9.1 服务架构

BB Protocol 运行两个 Socket.IO 微服务：

| 服务 | 端口 | 说明 | 依赖 |
|------|------|------|------|
| resonance-sim | 3003 | 情绪共振模拟服务 | socket.io, cors |
| monitoring-sim | 3004 | 监控模拟服务 | socket.io, cors |

### 9.2 Docker 部署

```bash
# 通过 Docker Compose 启动（已包含在 docker-compose.yml 中）
docker compose up -d resonance-sim monitoring-sim

# 查看状态
docker compose ps resonance-sim monitoring-sim

# 查看日志
docker compose logs -f resonance-sim
docker compose logs -f monitoring-sim
```

### 9.3 PM2 部署

```bash
# 单独启动 WebSocket 服务
pm2 start ecosystem.config.js --only bb-resonance-sim,bb-monitoring-sim

# 查看状态
pm2 status
```

### 9.4 连接验证

Socket.IO 客户端必须通过 Caddy 网关连接，**禁止**直连微服务端口：

```javascript
// ✅ 正确：通过网关连接
const socket = io('/?XTransformPort=3003');

// ❌ 错误：直连微服务（CORS 策略禁止）
const socket = io('http://localhost:3003');
```

#### 健康检查

```bash
# 检查 Socket.IO 服务状态
curl -s http://localhost:3003/health
curl -s http://localhost:3004/health

# 通过 Caddy 网关检查
curl -s "http://localhost:81/?XTransformPort=3003"
```

### 9.5 生产环境优化

```bash
# resonance-sim 环境变量
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
PORT=3003

# monitoring-sim 环境变量
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production
PORT=3004
```

---

## 10. 监控与日志

### 10.1 PM2 监控

```bash
# 查看所有进程状态
pm2 status

# 实时监控 CPU 和内存
pm2 monit

# 查看详细进程信息
pm2 describe bb-protocol-app

# 查看实时日志
pm2 logs

# 查看特定服务日志
pm2 logs bb-protocol-app --lines 100
pm2 logs bb-resonance-sim --lines 50
```

### 10.2 Docker 监控

```bash
# 查看容器状态
docker compose ps

# 查看容器资源使用
docker stats

# 查看特定容器日志
docker compose logs -f app --tail 100
docker compose logs -f resonance-sim --tail 50

# 查看容器事件
docker events --filter container=cognitive-avatar-app
```

### 10.3 健康检查

#### 应用健康检查端点

```bash
# 主应用健康检查
curl -s http://localhost:3000/api/health | python3 -m json.tool

# 预期响应
{
  "status": "ok",
  "timestamp": "2026-03-05T12:00:00.000Z",
  "version": "2.2.0"
}
```

#### 外部监控脚本

```bash
#!/bin/bash
# health-check.sh — 外部健康检查脚本

ENDPOINTS=(
    "http://localhost:3000/api/health|主应用"
    "http://localhost:3003/health|共振模拟服务"
    "http://localhost:3004/health|监控模拟服务"
    "http://localhost:3005/health|IFD计算引擎"
    "http://localhost:3006/health|ECE预言机"
    "http://localhost:3007/health|POUE证明引擎"
    "http://localhost:3008/health|MCP路由器"
)

ALERT_WEBHOOK="https://hooks.slack.com/services/xxx"  # Slack Webhook URL

for entry in "${ENDPOINTS[@]}"; do
    IFS='|' read -r url name <<< "$entry"
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url")

    if [ "$status" != "200" ]; then
        echo "[ALERT] $name ($url) 返回 HTTP $status"
        # 发送告警通知
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H 'Content-type: application/json' \
            -d "{\"text\":\"🚨 BB Protocol 告警: $name 返回 HTTP $status\"}"
    else
        echo "[OK] $name 正常 (HTTP 200)"
    fi
done
```

设置定时健康检查：

```bash
# 每 5 分钟检查一次
crontab -e
# 添加：
*/5 * * * * /opt/bb-protocol/scripts/health-check.sh >> /var/log/bb-protocol/health.log 2>&1
```

### 10.4 日志管理

#### 日志轮转配置

```bash
# 创建 logrotate 配置
sudo tee /etc/logrotate.d/bb-protocol << 'EOF'
/var/log/bb-protocol/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endpostrotate
}

/var/log/caddy/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 caddy caddy
}
EOF

# 验证配置
sudo logrotate -d /etc/logrotate.d/bb-protocol
```

### 10.5 Prometheus + Grafana 监控（可选）

```yaml
# docker-compose.monitoring.yml
version: "3.9"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: bb-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    container_name: bb-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your_admin_password
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:
```

---

## 11. CI/CD 流水线

### 11.1 GitHub Actions 配置

创建 `.github/workflows/deploy.yml`：

```yaml
name: BB Protocol CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  BUN_VERSION: "1.1.38"
  NODE_VERSION: "20"

jobs:
  # ── 代码检查 ────────────────────────────────────────────────
  lint:
    name: 代码质量检查
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: 安装依赖
        run: bun install --frozen-lockfile

      - name: 生成 Prisma Client
        run: bun run db:generate

      - name: ESLint 检查
        run: bun run lint

      - name: TypeScript 类型检查
        run: bunx tsc --noEmit

  # ── 构建测试 ────────────────────────────────────────────────
  build:
    name: 构建验证
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: 安装依赖
        run: bun install --frozen-lockfile

      - name: 生成 Prisma Client
        run: bun run db:generate

      - name: 构建项目
        run: bun run build
        env:
          NEXT_PUBLIC_CHAIN_ID: 84532
          NEXT_PUBLIC_RPC_URL: https://sepolia.base.org
          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: demo-project-id
          DATABASE_URL: file:./db/ci.db
          STRIPE_SECRET_KEY: sk_test_placeholder
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_placeholder
          STRIPE_WEBHOOK_SECRET: whsec_placeholder
          NEXTAUTH_SECRET: ci-test-secret
          NEXT_TELEMETRY_DISABLED: 1

  # ── Docker 镜像构建 ──────────────────────────────────────────
  docker:
    name: Docker 镜像
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: 登录 Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 构建并推送主应用镜像
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            your-org/bb-protocol:latest
            your-org/bb-protocol:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── 部署到测试环境 ──────────────────────────────────────────
  deploy-staging:
    name: 部署到测试环境
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: 部署到测试服务器
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/bb-protocol-staging
            docker compose pull
            docker compose up -d
            sleep 30
            curl -f http://localhost:3000/api/health || exit 1

  # ── 部署到生产环境 ──────────────────────────────────────────
  deploy-production:
    name: 部署到生产环境
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - name: 部署到生产服务器
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/bb-protocol
            docker compose pull
            docker compose up -d
            sleep 40
            curl -f http://localhost:3000/api/health || exit 1
            echo "生产环境部署完成！"

  # ── 数据库迁移 ──────────────────────────────────────────────
  migrate:
    name: 数据库迁移
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.ref == 'refs/heads/main'
    steps:
      - name: 执行生产数据库迁移
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/bb-protocol
            docker compose exec app bunx prisma migrate deploy
            echo "数据库迁移完成！"
```

### 11.2 GitHub Secrets 配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

| Secret 名称 | 说明 |
|-------------|------|
| `DOCKER_USERNAME` | Docker Hub 用户名 |
| `DOCKER_PASSWORD` | Docker Hub 访问令牌 |
| `STAGING_HOST` | 测试服务器 IP |
| `STAGING_USER` | 测试服务器 SSH 用户 |
| `STAGING_SSH_KEY` | 测试服务器 SSH 私钥 |
| `PRODUCTION_HOST` | 生产服务器 IP |
| `PRODUCTION_USER` | 生产服务器 SSH 用户 |
| `PRODUCTION_SSH_KEY` | 生产服务器 SSH 私钥 |

### 11.3 分支策略

| 分支 | 部署目标 | 触发条件 |
|------|----------|----------|
| `feature/*` | 无 (仅 CI) | PR 创建 |
| `develop` | 测试环境 | 合并到 develop |
| `main` | 生产环境 | 合并到 main |
| `hotfix/*` | 生产环境 | 紧急修复合并到 main |

---

## 12. 安全加固

### 12.1 防火墙规则

```bash
# 使用 UFW 配置防火墙
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 禁止外部访问内部服务端口
# 以下端口仅允许本地访问（Caddy 反向代理）
# 3000, 3003-3008 不对外开放

# 启用防火墙
sudo ufw enable

# 验证规则
sudo ufw status verbose
```

#### 高级 iptables 规则（可选）

```bash
# 阻止常见攻击
# 防止 SYN Flood
sudo iptables -A INPUT -p tcp --syn -m limit --limit 1/s --limit-burst 3 -j ACCEPT
sudo iptables -A INPUT -p tcp --syn -j DROP

# 防止端口扫描
sudo iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
sudo iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP

# 保存规则
sudo netfilter-persistent save
```

### 12.2 速率限制

#### Nginx 速率限制

```nginx
# 在 http 块中定义
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=webhook:10m rate=10r/m;

# 在 location 块中应用
location /api/ {
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;
}

location /api/stripe/webhook {
    limit_req zone=webhook burst=5 nodelay;
}

location /api/auth/ {
    limit_req zone=auth burst=3 nodelay;
}
```

#### 应用层速率限制

```typescript
// src/middleware.ts — Next.js 中间件速率限制
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!rateLimit(ip, 60, 60000)) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试' },
        { status: 429 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### 12.3 CORS 配置

```typescript
// 微服务 CORS 配置示例 (resonance-sim/index.ts)
import cors from 'cors';

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
  optionsSuccessStatus: 204,
};

// 生产环境：严格限制允许源
// origin: ['https://your-domain.com', 'https://www.your-domain.com']

// 开发环境：允许本地开发
// origin: ['http://localhost:3000', 'http://localhost:81']
```

### 12.4 密钥管理

#### 环境变量安全

```bash
# 1. .env 文件权限
chmod 600 .env
chown $USER:$USER .env

# 2. 确保 .env 在 .gitignore 中
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# 3. 使用 Docker Secrets（生产环境）
docker secret create stripe_secret_key - <<< "sk_live_xxxxx"
docker secret create nextauth_secret - <<< "$(openssl rand -base64 32)"

# 4. 使用云服务商密钥管理（推荐）
# AWS: AWS Secrets Manager / Parameter Store
# GCP: Secret Manager
# Azure: Key Vault
```

#### 密钥轮换策略

| 密钥 | 轮换周期 | 轮换步骤 |
|------|----------|----------|
| STRIPE_SECRET_KEY | 每年 | Stripe Dashboard → API Keys → Roll key → 更新 .env → 重启 |
| STRIPE_WEBHOOK_SECRET | 每年 | Stripe Dashboard → Webhooks → 重新生成 → 更新 .env |
| NEXTAUTH_SECRET | 每年 | 生成新密钥 → 更新 .env → 所有会话失效 |
| NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID | 不需要 | 除非项目重建 |
| 数据库加密密钥 | 不需要 | SQLite 文件级加密 |

### 12.5 智能合约安全

#### 合约部署安全检查

- [ ] 使用 Solidity 0.8.x（内置溢出保护）
- [ ] 继承 OpenZeppelin 的 `ReentrancyGuard`
- [ ] 继承 OpenZeppelin 的 `Ownable` 或 `AccessControl`
- [ ] Owner 转移至多签钱包 (Gnosis Safe, 至少 3/5 签名)
- [ ] 紧急暂停功能 (`Pausable`)
- [ ] 时间锁 (`TimelockController`) 用于关键参数变更
- [ ] 合约已在 Basescan 上验证源码
- [ ] 通过 Slither 静态分析
- [ ] 通过 Echidna 模糊测试

#### 合约监控

```bash
# 监控合约事件
cast watch --rpc-url https://mainnet.base.org \
    --address <DynamicSplitter_address> \
    "event SplitExecuted(address,uint256,uint256,uint256)"
```

### 12.6 应用安全头部

确保在反向代理层配置以下安全头部：

| 头部 | 值 | 说明 |
|------|-----|------|
| `X-Frame-Options` | `DENY` | 防止点击劫持 |
| `X-Content-Type-Options` | `nosniff` | 防止 MIME 嗅探 |
| `X-XSS-Protection` | `1; mode=block` | XSS 过滤 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 限制 Referrer 泄露 |
| `Content-Security-Policy` | (见下方配置) | 内容安全策略 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 限制浏览器 API |

#### Content-Security-Policy 配置

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://mainnet.base.org https://sepolia.base.org wss: https://api.stripe.com;
  frame-src https://js.stripe.com https://hooks.stripe.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
```

---

## 13. 备份与恢复

### 13.1 备份策略总览

| 备份对象 | 备份方式 | 频率 | 保留期限 | 存储位置 |
|----------|----------|------|----------|----------|
| SQLite 数据库 | sqlite3 .backup + gzip | 每 6 小时 | 30 天本地 / 90 天 S3 | 本地 + S3 |
| 环境变量 | 加密备份 | 每次变更 | 永久 | 密码管理器 |
| 应用代码 | Git 仓库 | 实时推送 | 永久 | GitHub |
| Docker 镜像 | Docker Hub / ECR | 每次部署 | 10 个版本 | Registry |
| Caddy 配置 | Git + 文件备份 | 每次变更 | 永久 | 本地 |
| SSL 证书 | 自动续期 | 自动 | - | Let's Encrypt |

### 13.2 灾难恢复计划

#### 场景 1：服务器故障

```bash
# 1. 准备新服务器
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh

# 2. 恢复代码
git clone git@github.com:your-org/bb-protocol-dashboard.git /opt/bb-protocol

# 3. 恢复环境变量
# 从密码管理器中恢复 .env 文件

# 4. 恢复数据库
aws s3 cp s3://your-backup-bucket/bb-protocol/db/latest.db.gz /tmp/
gunzip /tmp/latest.db.gz
cp /tmp/latest.db /opt/bb-protocol/db/production.db

# 5. 启动服务
cd /opt/bb-protocol
docker compose up -d

# 6. 验证
curl -f http://localhost:3000/api/health
```

#### 场景 2：数据库损坏

```bash
# 1. 停止应用
pm2 stop bb-protocol-app

# 2. 备份损坏的数据库
cp /opt/bb-protocol/db/production.db /opt/bb-protocol/db/production.db.corrupted

# 3. 尝试修复
sqlite3 /opt/bb-protocol/db/production.db ".recover" | sqlite3 /tmp/recovered.db

# 4. 如果修复失败，从备份恢复
gunzip -c /opt/bb-protocol/backups/production_latest.db.gz > /opt/bb-protocol/db/production.db

# 5. 重启应用
pm2 start bb-protocol-app
```

#### 场景 3：智能合约漏洞

```bash
# 1. 立即暂停合约（需要多签确认）
cast send <contract_address> "pause()" --rpc-url https://mainnet.base.org --account deployer

# 2. 通知用户
# 通过所有渠道（Twitter, Discord, 邮件）通知用户

# 3. 评估影响
# 检查链上交易记录

# 4. 修复并重新部署
# 修改合约代码 → 审计 → 部署新合约 → 迁移状态

# 5. 更新前端合约地址
# 更新 NEXT_PUBLIC_DYNAMIC_SPLITTER_ADDRESS 等环境变量
```

### 13.3 恢复时间目标

| 场景 | RTO (恢复时间) | RPO (数据丢失) |
|------|----------------|----------------|
| 应用崩溃 | < 5 分钟 | 0 (PM2/Docker 自动重启) |
| 服务器故障 | < 30 分钟 | < 6 小时 (数据库备份间隔) |
| 数据库损坏 | < 15 分钟 | < 6 小时 |
| 合约漏洞 | < 2 小时 | 取决于漏洞性质 |

---

## 14. 故障排查

### 14.1 端口冲突

#### 症状

```
Error: listen EADDRINUSE: address already in use :::3000
```

#### 排查步骤

```bash
# 查看端口占用
sudo lsof -i :3000
# 或
sudo ss -tlnp | grep 3000

# 终止占用进程
kill -9 <PID>

# 或使用 fuser
sudo fuser -k 3000/tcp
```

#### 预防措施

```bash
# 在 .env 中使用不同端口
PORT=3001

# 或在 Docker Compose 中修改映射
ports:
  - "3001:3000"
```

### 14.2 数据库连接问题

#### 症状

```
Error: P1: Can't reach database server
PrismaClientInitializationError: Unable to open the database file
```

#### 排查步骤

```bash
# 1. 检查数据库文件是否存在
ls -la /opt/bb-protocol/db/production.db

# 2. 检查文件权限
chmod 644 /opt/bb-protocol/db/production.db

# 3. 检查 DATABASE_URL 配置
echo $DATABASE_URL

# 4. 验证数据库完整性
sqlite3 /opt/bb-protocol/db/production.db "PRAGMA integrity_check;"

# 5. 检查磁盘空间
df -h /opt/bb-protocol/db/

# 6. Docker 环境下检查卷挂载
docker compose exec app ls -la /app/db/
```

### 14.3 Web3 连接故障

#### 症状

- 钱包连接按钮无响应
- ConnectKit 弹窗无法打开
- Aave Account SDK 错误

#### 排查步骤

```bash
# 1. 检查 WalletConnect Project ID
echo $NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

# 2. 验证 RPC 端点可达性
curl -s -X POST https://mainnet.base.org \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 3. 检查链 ID 配置
echo $NEXT_PUBLIC_CHAIN_ID
# 预期: 8453 (Base Mainnet) 或 84532 (Base Sepolia)

# 4. 浏览器控制台检查
# 打开 DevTools → Console，查看是否有 Aave SDK 错误
# 如果出现 "Aave Account is not connected" 错误：
#   确认 enableAaveAccount: false 已在 web3-provider.tsx 中设置

# 5. 检查 CORS 配置
# 确保 RPC 端点允许跨域请求
```

### 14.4 Stripe Webhook 问题

#### 症状

- 支付成功但订阅状态未更新
- Webhook 事件未到达应用
- 签名验证失败

#### 排查步骤

```bash
# 1. 检查 Webhook 密钥
echo $STRIPE_WEBHOOK_SECRET
# 确保以 whsec_ 开头

# 2. 检查 Stripe Dashboard Webhook 配置
# 确保端点 URL 正确: https://your-domain.com/api/stripe/webhook
# 确保监听的事件包括:
#   - checkout.session.completed
#   - customer.subscription.updated
#   - customer.subscription.deleted
#   - invoice.payment_succeeded
#   - invoice.payment_failed

# 3. 使用 Stripe CLI 测试
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed

# 4. 检查 Webhook 日志
# Stripe Dashboard → Developers → Webhooks → 点击端点 → 查看发送日志

# 5. 检查签名验证
# 确保 raw body 被正确读取
# Next.js App Router 需要使用 request.text() 而非 request.json()
```

### 14.5 WebSocket 连接问题

#### 症状

- 仪表盘无法显示实时数据
- Socket.IO 连接持续断开重连
- "Engine status" 显示离线

#### 排查步骤

```bash
# 1. 检查 Socket.IO 服务是否运行
curl -s http://localhost:3003/health
curl -s http://localhost:3004/health

# 2. 检查 Caddy 路由配置
# 确保 XTransformPort 查询参数路由正确
curl -s "http://localhost:81/?XTransformPort=3003"

# 3. 检查 CORS 配置
# 确保 resonance-sim/monitoring-sim 的 CORS_ORIGIN 设置正确
echo $CORS_ORIGIN

# 4. 检查客户端连接方式
# ✅ 正确: io('/?XTransformPort=3003')
# ❌ 错误: io('http://localhost:3003')

# 5. 检查防火墙
# 确保 Caddy 端口 (80/443) 开放
sudo ufw status

# 6. 检查 WebSocket 升级
# Nginx 需要配置 Upgrade 头部
# proxy_set_header Upgrade $http_upgrade;
# proxy_set_header Connection "upgrade";

# 7. 降级模式验证
# 当 Socket.IO 服务不可用时，前端应自动降级到 Mock 数据
# 检查 useDashboardStore 的 dataLoaded 状态
```

### 14.6 构建失败

#### 症状

```
Error: Build failed
Type error: Cannot find module '...'
```

#### 排查步骤

```bash
# 1. 清理缓存
rm -rf .next node_modules/.cache

# 2. 重新安装依赖
rm -rf node_modules
bun install

# 3. 重新生成 Prisma Client
bun run db:generate

# 4. 检查环境变量
# 构建时需要 NEXT_PUBLIC_* 变量
# 确保所有 NEXT_PUBLIC_ 变量已设置

# 5. 检查 TypeScript 错误
bunx tsc --noEmit

# 6. Docker 构建问题
docker compose build --no-cache app
```

### 14.7 内存不足

#### 症状

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

#### 排查步骤

```bash
# 1. 检查系统内存
free -h

# 2. 检查各服务内存使用
docker stats --no-stream

# 3. 优化方案
# 方案一：减少微服务数量（仅启动核心服务）
docker compose up -d app resonance-sim monitoring-sim caddy

# 方案二：使用 engine profile 按需启动
# engine 微服务仅在需要时启动

# 方案三：增加 Node.js/Bun 内存限制
# 对于 PM2
# max_memory_restart: '512M'

# 方案四：升级服务器内存
```

---

## 15. 性能优化

### 15.1 Next.js 构建优化

#### Standalone 输出模式

项目已配置 `output: 'standalone'`，构建后生成独立服务器：

```javascript
// next.config.ts
const nextConfig = {
  output: 'standalone',
  // ...
};
```

```bash
# 构建时自动复制静态资源
bun run build
# 构建: .next/standalone/ 目录包含独立服务器
# 静态资源: .next/static/ 和 public/ 需手动复制
```

#### 图片优化

```javascript
// next.config.ts
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'mainnet.base.org' },
    ],
  },
};
```

### 15.2 数据库性能优化

```sql
-- 检查 SQLite 性能
PRAGMA journal_mode=WAL;        -- Write-Ahead Logging（推荐）
PRAGMA synchronous=NORMAL;      -- 平衡安全与性能
PRAGMA cache_size=-64000;       -- 64MB 缓存
PRAGMA temp_store=MEMORY;       -- 临时表存内存
PRAGMA mmap_size=268435456;     -- 256MB 内存映射

-- 分析查询性能
EXPLAIN QUERY PLAN SELECT * FROM Avatar WHERE ownerAddress = '0x...';

-- 创建索引（如果查询慢）
CREATE INDEX IF NOT EXISTS idx_avatar_owner ON Avatar(ownerAddress);
CREATE INDEX IF NOT EXISTS idx_revenue_avatar ON Revenue(avatarId, createdAt);
CREATE INDEX IF NOT EXISTS idx_timeline_avatar ON TimelineEvent(avatarId, createdAt DESC);
```

### 15.3 React 性能优化

#### 状态管理优化

```typescript
// 使用 Zustand 细粒度选择器避免不必要渲染
const avatar = useDashboardStore(state => state.avatar);  // ✅ 仅订阅 avatar
const store = useDashboardStore();                        // ❌ 订阅整个 store

// 使用 React Query 缓存策略
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 秒内不重新请求
      gcTime: 5 * 60 * 1000,     // 5 分钟垃圾回收
      refetchOnWindowFocus: false, // 禁用窗口聚焦时刷新
    },
  },
});
```

#### 组件懒加载

```typescript
// 使用动态导入加载大型组件
import dynamic from 'next/dynamic';

const SecurityAudit = dynamic(
  () => import('@/components/dashboard/security-audit'),
  { ssr: false, loading: () => <LoadingSkeleton /> }
);

const AvatarMarketplace = dynamic(
  () => import('@/components/dashboard/avatar-marketplace'),
  { ssr: false }
);
```

### 15.4 缓存策略

#### Next.js 缓存

| 资源类型 | 缓存策略 | TTL |
|----------|----------|-----|
| 静态资源 (`/_next/static/`) | CDN 永久缓存 + 内容哈希 | 1 年 |
| API 路由 (`/api/`) | 不缓存或短缓存 | 0-30 秒 |
| SSR 页面 | ISR (增量静态再生) | 60 秒 |
| 健康检查 (`/api/health`) | 不缓存 | 0 |

#### CDN 缓存

```nginx
# Nginx 静态资源缓存
location /_next/static/ {
    proxy_pass http://nextjs_app;
    expires 365d;
    add_header Cache-Control "public, immutable";
}

# API 路由短缓存
location /api/dashboard {
    proxy_pass http://nextjs_app;
    expires 30s;
    add_header Cache-Control "public, s-maxage=30";
}
```

### 15.5 前端资源优化

```bash
# 分析包大小
ANALYZE=true bun run build

# 检查 bundle 组成
# 安装 @next/bundle-analyzer
bun add -d @next/bundle-analyzer
```

```javascript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
```

### 15.6 WebSocket 性能

```typescript
// Socket.IO 服务端优化配置
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN },
  pingInterval: 25000,    // 心跳间隔（毫秒）
  pingTimeout: 20000,     // 心跳超时
  maxHttpBufferSize: 1e6, // 最大消息大小 1MB
  perMessageDeflate: true, // 启用 WebSocket 压缩
  transports: ['websocket'], // 仅使用 WebSocket（跳过 HTTP 轮询）
});
```

---

## 16. 升级指南

### 16.1 版本升级流程

```bash
# 1. 备份当前版本
cp -r /opt/bb-protocol /opt/bb-protocol-backup-$(date +%Y%m%d)

# 2. 拉取最新代码
cd /opt/bb-protocol
git fetch origin
git stash                    # 保存本地修改（如果有）
git checkout main
git pull origin main

# 3. 更新依赖
bun install

# 4. 检查数据库迁移
bunx prisma migrate status
bunx prisma migrate deploy  # 应用新的迁移

# 5. 重新构建
bun run build

# 6. 重启服务
# PM2 方式
pm2 restart bb-protocol-app

# Docker 方式
docker compose build app
docker compose up -d app

# 7. 验证
curl -f http://localhost:3000/api/health
```

### 16.2 零停机升级（蓝绿部署）

```bash
# 1. 部署新版本到蓝环境
docker compose -f docker-compose.yml -f docker-compose.blue.yml up -d app-blue

# 2. 验证蓝环境
curl -f http://localhost:3001/api/health

# 3. 切换流量到蓝环境
# 修改 Caddy/Nginx 配置指向新端口
sudo systemctl reload caddy

# 4. 观察一段时间后，关闭绿环境
docker compose stop app-green

# 5. 下次升级时角色互换
```

### 16.3 依赖升级

```bash
# 升级所有依赖到最新兼容版本
bun update

# 升级特定依赖
bun add next@latest react@latest react-dom@latest

# 升级 Prisma
bun add prisma@latest @prisma/client@latest
bun run db:generate

# 升级 Wagmi/ConnectKit（注意破坏性变更）
bun add wagmi@latest connectkit@latest viem@latest

# 运行测试验证
bun run lint
bun run build
```

### 16.4 数据库 Schema 变更

```bash
# 1. 修改 prisma/schema.prisma

# 2. 创建迁移
bunx prisma migrate dev --name descriptive_change_name

# 3. 审查迁移 SQL
# 查看 prisma/migrations/xxxxxx_descriptive_change_name/migration.sql

# 4. 在生产环境应用
bunx prisma migrate deploy

# 5. 重新生成 Prisma Client
bun run db:generate
```

### 16.5 回滚

```bash
# 回滚到上一个 Git 版本
git log --oneline -5           # 查看最近提交
git checkout <previous_commit>  # 回滚到指定提交

# 或使用标签
git tag -l                     # 查看所有标签
git checkout v2.1.0            # 回滚到指定版本

# 重新构建和部署
bun install
bun run build
pm2 restart bb-protocol-app

# 数据库回滚（如果需要）
# 警告：数据库回滚可能导致数据丢失！
bunx prisma migrate resolve --rolled-back <migration_name>
```

---

## 17. 附录

### 附录 A: 完整 Dockerfile

```dockerfile
# =============================================================================
# Dockerfile — Cognitive Avatar Protocol (BB System)
# Multi-stage build for Next.js 16 with Bun runtime
# =============================================================================

# ── Stage 1: Install Dependencies ─────────────────────────────────────────────
FROM oven/bun:1.1.38 AS deps

ARG NODE_ENV=production

WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile --production=false

# Generate Prisma Client
RUN bun run db:generate

# ── Stage 2: Build Next.js Application ───────────────────────────────────────
FROM oven/bun:1.1.38 AS builder

ARG NODE_ENV=production
ARG VERSION=2.2.0

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV VERSION=${VERSION}

# Build Next.js application
RUN bun run build

# ── Stage 3: Production Image ────────────────────────────────────────────────
FROM oven/bun:1.1.38-slim AS runner

ARG VERSION=2.2.0

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV VERSION=${VERSION}

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set correct ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["bun", "server.js"]
```

### 附录 B: 完整 docker-compose.yml

```yaml
# =============================================================================
# docker-compose.yml — Cognitive Avatar Protocol (Production)
# =============================================================================
# Usage: docker compose up -d
# =============================================================================

version: "3.9"

services:
  # ── Next.js App ──────────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
        VERSION: "2.2.0"
    container_name: cognitive-avatar-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./db/production.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-me-in-production}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-}
      - NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-8453}
      - NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL:-https://mainnet.base.org}
    volumes:
      - app_data:/app/db
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ── Resonance Simulation Service ─────────────────────────────
  resonance-sim:
    build:
      context: .
      dockerfile: mini-services/resonance-sim/Dockerfile
    container_name: cognitive-avatar-resonance-sim
    restart: unless-stopped
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3000}
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  # ── Monitoring Simulation Service ────────────────────────────
  monitoring-sim:
    build:
      context: .
      dockerfile: mini-services/monitoring-sim/Dockerfile
    container_name: cognitive-avatar-monitoring-sim
    restart: unless-stopped
    ports:
      - "3004:3004"
    environment:
      - NODE_ENV=production
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3000}
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  # ── IFD Calculator Engine ────────────────────────────────────
  ifd-calculator:
    image: cognitive-avatar/ifd-calculator:latest
    container_name: cognitive-avatar-ifd-calculator
    profiles:
      - engine
    restart: unless-stopped
    ports:
      - "3005:3005"
    environment:
      - NODE_ENV=production
      - RPC_URL=${NEXT_PUBLIC_RPC_URL:-https://mainnet.base.org}
      - CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-8453}
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ── ECE Oracle Engine ────────────────────────────────────────
  ece-oracle:
    image: cognitive-avatar/ece-oracle:latest
    container_name: cognitive-avatar-ece-oracle
    profiles:
      - engine
    restart: unless-stopped
    ports:
      - "3006:3006"
    environment:
      - NODE_ENV=production
      - RPC_URL=${NEXT_PUBLIC_RPC_URL:-https://mainnet.base.org}
      - CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-8453}
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3006/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ── POUE Prover Engine ───────────────────────────────────────
  poue-prover:
    image: cognitive-avatar/poue-prover:latest
    container_name: cognitive-avatar-poue-prover
    profiles:
      - engine
    restart: unless-stopped
    ports:
      - "3007:3007"
    environment:
      - NODE_ENV=production
      - RPC_URL=${NEXT_PUBLIC_RPC_URL:-https://mainnet.base.org}
      - CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-8453}
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3007/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ── MCP Router Engine ────────────────────────────────────────
  mcp-router:
    image: cognitive-avatar/mcp-router:latest
    container_name: cognitive-avatar-mcp-router
    profiles:
      - engine
    restart: unless-stopped
    ports:
      - "3008:3008"
    environment:
      - NODE_ENV=production
      - RPC_URL=${NEXT_PUBLIC_RPC_URL:-https://mainnet.base.org}
      - CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-8453}
    networks:
      - internal
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3008/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # ── Caddy Reverse Proxy / Gateway ────────────────────────────
  caddy:
    image: caddy:2-alpine
    container_name: cognitive-avatar-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - internal
    depends_on:
      app:
        condition: service_healthy
      resonance-sim:
        condition: service_healthy
      monitoring-sim:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "caddy", "version"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  app_data:
    driver: local
  db_data:
    driver: local
  caddy_data:
    driver: local
  caddy_config:
    driver: local

networks:
  internal:
    driver: bridge
```

### 附录 C: 完整 nginx.conf

```nginx
# =============================================================================
# nginx.conf — BB Protocol DeFi Dashboard (完整配置)
# =============================================================================

user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log warn;

events {
    worker_connections 2048;
    multi_accept on;
}

http {
    # ── 基础配置 ────────────────────────────────────────────────
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # ── 日志格式 ────────────────────────────────────────────────
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '$request_time';

    access_log /var/log/nginx/access.log main;

    # ── Gzip 压缩 ──────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        application/json
        application/javascript
        application/xml
        application/xml+rss
        text/javascript
        image/svg+xml;

    # ── 速率限制 ────────────────────────────────────────────────
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=60r/m;

    # ── 上游服务 ────────────────────────────────────────────────
    upstream nextjs_app {
        server 127.0.0.1:3000;
        keepalive 64;
    }

    upstream resonance_sim {
        server 127.0.0.1:3003;
    }

    upstream monitoring_sim {
        server 127.0.0.1:3004;
    }

    # ── HTTP → HTTPS 重定向 ────────────────────────────────────
    server {
        listen 80;
        listen [::]:80;
        server_name your-domain.com www.your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # ── HTTPS 主服务器 ──────────────────────────────────────────
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name your-domain.com www.your-domain.com;

        # SSL 证书
        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        # SSL 配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # HSTS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # 安全头部
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy strict-origin-when-cross-origin always;

        # XTransformPort 路由映射
        # 根据查询参数将请求转发到对应微服务

        # 默认路由到 Next.js 应用
        location / {
            proxy_pass http://nextjs_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }

        # API 限流
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;
            proxy_pass http://nextjs_app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Stripe Webhook（不限流）
        location /api/stripe/webhook {
            proxy_pass http://nextjs_app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 静态资源长期缓存
        location /_next/static/ {
            proxy_pass http://nextjs_app;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }

        # 健康检查（不记录日志）
        location /api/health {
            proxy_pass http://nextjs_app;
            access_log off;
        }
    }
}
```

### 附录 D: 完整 Caddyfile

```
# =============================================================================
# Caddyfile — BB Protocol 生产环境配置
# =============================================================================

your-domain.com {
    # ── XTransformPort 路由规则 ────────────────────────────────
    # 微服务通过查询参数路由分发

    @resonance query XTransformPort=3003
    @monitoring query XTransformPort=3004
    @ifd query XTransformPort=3005
    @ece query XTransformPort=3006
    @poue query XTransformPort=3007
    @mcp query XTransformPort=3008

    handle @resonance {
        reverse_proxy localhost:3003
    }
    handle @monitoring {
        reverse_proxy localhost:3004
    }
    handle @ifd {
        reverse_proxy localhost:3005
    }
    handle @ece {
        reverse_proxy localhost:3006
    }
    handle @poue {
        reverse_proxy localhost:3007
    }
    handle @mcp {
        reverse_proxy localhost:3008
    }

    # ── 默认路由：Next.js 应用 ────────────────────────────────
    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # ── TLS 配置（Caddy 自动管理） ───────────────────────────
    # Caddy 会自动获取和续期 Let's Encrypt 证书

    # ── 压缩 ──────────────────────────────────────────────────
    encode gzip zstd

    # ── 安全头部 ──────────────────────────────────────────────
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        X-XSS-Protection "1; mode=block"
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        -Server
    }

    # ── 日志 ──────────────────────────────────────────────────
    log {
        output file /var/log/caddy/bb-protocol-access.log {
            roll_size 100mb
            roll_keep 10
        }
        format json
    }
}

# =============================================================================
# 开发环境配置（本地开发时使用）
# =============================================================================
:81 {
    @transform_port_query {
        query XTransformPort=*
    }

    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort} {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }

    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
```

### 附录 E: 完整 GitHub Actions Workflow

```yaml
# =============================================================================
# .github/workflows/deploy.yml — BB Protocol CI/CD Pipeline
# =============================================================================

name: BB Protocol CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  BUN_VERSION: "1.1.38"
  REGISTRY: docker.io
  IMAGE_NAME: your-org/bb-protocol

jobs:
  # ── 代码质量检查 ────────────────────────────────────────────
  lint:
    name: 代码质量检查
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: 安装依赖
        run: bun install --frozen-lockfile

      - name: 生成 Prisma Client
        run: bun run db:generate

      - name: ESLint 检查
        run: bun run lint

      - name: TypeScript 类型检查
        run: bunx tsc --noEmit

  # ── 构建验证 ────────────────────────────────────────────────
  build:
    name: 构建验证
    runs-on: ubuntu-latest
    needs: lint
    strategy:
      matrix:
        node-env: [production]
    steps:
      - uses: actions/checkout@v4

      - name: 安装 Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: 安装依赖
        run: bun install --frozen-lockfile

      - name: 生成 Prisma Client
        run: bun run db:generate

      - name: 构建项目
        run: bun run build
        env:
          NODE_ENV: ${{ matrix.node-env }}
          NEXT_PUBLIC_CHAIN_ID: 84532
          NEXT_PUBLIC_RPC_URL: https://sepolia.base.org
          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: demo-project-id
          DATABASE_URL: file:./db/ci.db
          STRIPE_SECRET_KEY: sk_test_placeholder
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_placeholder
          STRIPE_WEBHOOK_SECRET: whsec_placeholder
          NEXTAUTH_SECRET: ci-test-secret-do-not-use
          NEXT_TELEMETRY_DISABLED: 1

      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: .next/
          retention-days: 1

  # ── 安全扫描 ────────────────────────────────────────────────
  security:
    name: 安全扫描
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: 运行 Trivy 漏洞扫描
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: 检查依赖漏洞
        run: |
          npm audit --audit-level=high || true
          # Bun 使用 npm 的审计数据库

  # ── Docker 镜像构建与推送 ────────────────────────────────────
  docker:
    name: Docker 镜像
    runs-on: ubuntu-latest
    needs: [build, security]
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: 登录容器仓库
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 提取 Docker 元数据
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=
            type=raw,value=latest,enable={{is_default_branch}}

      - name: 构建并推送 Docker 镜像
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VERSION=${{ github.sha }}

  # ── 部署到测试环境 ──────────────────────────────────────────
  deploy-staging:
    name: 部署到测试环境
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.your-domain.com
    steps:
      - name: 部署到测试服务器
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/bb-protocol-staging
            docker compose pull
            docker compose up -d --remove-orphans
            sleep 30
            curl -f http://localhost:3000/api/health || exit 1
            echo "测试环境部署完成 ✅"

  # ── 部署到生产环境 ──────────────────────────────────────────
  deploy-production:
    name: 部署到生产环境
    runs-on: ubuntu-latest
    needs: docker
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://your-domain.com
    steps:
      - name: 部署前数据库备份
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            /opt/bb-protocol/scripts/backup-db.sh

      - name: 部署到生产服务器
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/bb-protocol
            docker compose pull
            docker compose up -d --remove-orphans
            sleep 40
            curl -f http://localhost:3000/api/health || exit 1
            echo "生产环境部署完成 ✅"

      - name: 执行数据库迁移
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/bb-protocol
            docker compose exec -T app bunx prisma migrate deploy
            echo "数据库迁移完成 ✅"

      - name: 部署后验证
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            # 健康检查
            curl -f https://your-domain.com/api/health
            # Socket.IO 检查
            curl -f "https://your-domain.com/?XTransformPort=3003"
            curl -f "https://your-domain.com/?XTransformPort=3004"
            echo "所有服务验证通过 ✅"

  # ── 部署通知 ────────────────────────────────────────────────
  notify:
    name: 部署通知
    runs-on: ubuntu-latest
    needs: [deploy-staging, deploy-production]
    if: always()
    steps:
      - name: 发送 Slack 通知
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 附录 F: 完整 .env.example

```bash
# =============================================================================
# .env.example — BB Protocol DeFi Dashboard 环境变量模板
# =============================================================================
# 复制此文件为 .env 并填入实际值
# cp .env.example .env
# =============================================================================

# ── 核心应用配置 ──────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ── 应用 URL ─────────────────────────────────────────────────
# 用于 Stripe 回调、SEO、SSR 等
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── 区块链 / Web3 配置 ───────────────────────────────────────
# 目标链 ID: 8453 = Base Mainnet, 84532 = Base Sepolia
NEXT_PUBLIC_CHAIN_ID=84532

# RPC 端点 URL
# Base Sepolia (测试网)
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
# Base Mainnet (生产网)
# NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
# Alchemy
# NEXT_PUBLIC_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
# BlockPi
# NEXT_PUBLIC_RPC_URL=https://base.blockpi.network/v1/rpc/YOUR_API_KEY

# WalletConnect 项目 ID
# 从 https://cloud.walletconnect.com/ 获取
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# 已部署的智能合约地址（部署后填入）
NEXT_PUBLIC_DYNAMIC_SPLITTER_ADDRESS=
NEXT_PUBLIC_TOKEN_VAULT_ADDRESS=

# ── Stripe 支付配置 ──────────────────────────────────────────
# Stripe 密钥（服务端）
# 测试环境使用 sk_test_ 前缀
# 生产环境使用 sk_live_ 前缀
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxx

# Stripe 公钥（前端）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxx

# Stripe Webhook 签名密钥
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx

# Stripe 订阅价格 ID（在 Stripe Dashboard 中创建产品后获取）
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxxx
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxxxxxxxxxxx

# ── x402 协议配置 ───────────────────────────────────────────
# 链上收款钱包地址
X402_RECEIVER_ADDRESS=
# 默认支付金额（USDC cents）
X402_DEFAULT_AMOUNT=200
# 网络: base | base-sepolia
X402_NETWORK=base-sepolia
# Facilitator URL
X402_FACILITATOR_URL=https://facilitator.x402.org

# ── 数据库配置 ───────────────────────────────────────────────
# SQLite 数据库文件路径
DATABASE_URL=file:./db/dev.db

# ── NextAuth 认证配置 ────────────────────────────────────────
# 生成方法: openssl rand -base64 32
NEXTAUTH_SECRET=change-me-to-a-random-secret-at-least-32-chars
NEXTAUTH_URL=http://localhost:3000

# OAuth 提供商（可选）
# GITHUB_ID=
# GITHUB_SECRET=
# GOOGLE_ID=
# GOOGLE_SECRET=

# ── 微服务配置 ───────────────────────────────────────────────
# CORS 允许源
CORS_ORIGIN=http://localhost:3000

# ── 日志与监控 ───────────────────────────────────────────────
# 禁用 Next.js 遥测
NEXT_TELEMETRY_DISABLED=1

# 日志级别: debug | info | warn | error
LOG_LEVEL=debug

# Sentry DSN（可选）
# NEXT_PUBLIC_SENTRY_DSN=
```

### 附录 G: 端口映射速查表

| 端口 | 服务 | 协议 | Docker 映射 | 说明 |
|------|------|------|-------------|------|
| 80 | Caddy | HTTP | 80:80 | 生产 HTTP (重定向到 HTTPS) |
| 443 | Caddy | HTTPS | 443:443 | 生产 HTTPS |
| 81 | Caddy | HTTP | — | 开发环境网关 |
| 3000 | Next.js | HTTP | 3000:3000 | 主应用 |
| 3001 | Grafana | HTTP | 3001:3000 | 监控面板（可选） |
| 3003 | resonance-sim | WS/HTTP | 3003:3003 | Socket.IO 共振模拟 |
| 3004 | monitoring-sim | WS/HTTP | 3004:3004 | Socket.IO 监控模拟 |
| 3005 | ifd-calculator | HTTP | 3005:3005 | IFD 计算引擎 |
| 3006 | ece-oracle | HTTP | 3006:3006 | ECE 预言机 |
| 3007 | poue-prover | HTTP | 3007:3007 | POUE 证明引擎 |
| 3008 | mcp-router | HTTP | 3008:3008 | MCP 路由器 |
| 9090 | Prometheus | HTTP | 9090:9090 | 指标收集（可选） |
| 9229 | 调试器 | HTTP | 9229:9229 | 主应用调试（仅开发） |

### 附录 H: 常用命令速查

```bash
# ── 开发 ─────────────────────────────────────────────────────
bun run dev                  # 启动开发服务器
bun run build                # 构建生产版本
bun run lint                 # 运行代码检查
bun run db:generate          # 生成 Prisma Client
bun run db:push              # 推送 Schema 到数据库
bun run db:migrate           # 创建并应用迁移
bun run db:reset             # 重置数据库

# ── Docker ───────────────────────────────────────────────────
docker compose up -d                    # 启动所有服务
docker compose up -d app caddy          # 仅启动核心服务
docker compose --profile engine up -d   # 启动所有服务（含引擎）
docker compose down                     # 停止所有服务
docker compose logs -f app              # 查看应用日志
docker compose build --no-cache app     # 重新构建应用镜像
docker compose exec app bun run db:push # 在容器内执行数据库操作

# ── PM2 ──────────────────────────────────────────────────────
pm2 start ecosystem.config.js           # 启动所有服务
pm2 restart bb-protocol-app             # 重启主应用
pm2 stop all                            # 停止所有服务
pm2 logs                                # 查看所有日志
pm2 monit                               # 实时监控
pm2 status                              # 查看进程状态

# ── 数据库 ───────────────────────────────────────────────────
bunx prisma studio                      # 打开数据库浏览器
bunx prisma migrate status              # 查看迁移状态
bunx prisma migrate deploy              # 应用生产迁移
sqlite3 db/production.db ".tables"      # 列出所有表
sqlite3 db/production.db ".schema Avatar" # 查看 Avatar 表结构

# ── 健康检查 ─────────────────────────────────────────────────
curl -s http://localhost:3000/api/health    # 主应用
curl -s http://localhost:3003/health        # 共振模拟
curl -s http://localhost:3004/health        # 监控模拟

# ── 合约 ─────────────────────────────────────────────────────
forge build                              # 编译合约
forge test                               # 运行测试
forge create Contract --rpc-url ...      # 部署合约
forge verify-contract ...                # 验证合约
cast balance <addr> --rpc-url ...        # 查询余额
```

---

> **文档维护：** 本文档应随项目版本更新同步维护。如发现文档与实际不符，请提交 Issue 或 PR。
>
> **技术支持：** 如遇部署问题，请在 GitHub Issues 中提交，附上错误日志和环境信息。
