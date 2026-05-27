# BB Protocol 认知分身协议 — 全环境部署指南

> **版本**: v5.0.0  
> **最后更新**: 2025-01-15  
> **维护团队**: BB Protocol Core Team  
> **适用范围**: 开发环境 / 预发布 / 生产环境

---

## 目录

1. [部署概述](#1-部署概述)
2. [环境要求](#2-环境要求)
3. [环境变量配置](#3-环境变量配置)
4. [本地开发部署](#4-本地开发部署)
5. [Docker 部署](#5-docker-部署)
6. [Vercel 部署](#6-vercel-部署)
7. [VPS/云服务器部署](#7-vps云服务器部署)
8. [微服务部署](#8-微服务部署)
9. [数据库管理](#9-数据库管理)
10. [Stripe 配置](#10-stripe-配置)
11. [Web3 配置](#11-web3-配置)
12. [监控与日志](#12-监控与日志)
13. [安全加固](#13-安全加固)
14. [备份与灾难恢复](#14-备份与灾难恢复)
15. [更新与维护](#15-更新与维护)
16. [常见问题 (FAQ)](#16-常见问题-faq)

---

## 1. 部署概述

### 1.1 系统架构概述

BB Protocol 认知分身协议是一个基于 Next.js 16 的全栈 Web3 应用，采用微服务架构，包含主应用和多个独立计算引擎服务。系统整体架构如下：

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器 (Client)                      │
│            React 19 + Zustand + TanStack Query              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Caddy 反向代理网关 (:81)                    │
│              XTransformPort 路由 → 后端微服务                  │
└──────┬───────┬───────┬───────┬───────┬───────┬───────┬─────┘
       │       │       │       │       │       │       │
       ▼       ▼       ▼       ▼       ▼       ▼       ▼
  ┌────────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
  │App     ││Reson ││Monit ││IFD   ││ECE   ││PoUE  ││MCP   │
  │:3000   ││:3003 ││:3004 ││:3005 ││:3006 ││:3007 ││:3008 │
  │Next.js ││Sim   ││Sim   ││Calc  ││Oracle││Prover││Router│
  └───┬────┘└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘
      │
      ▼
  ┌────────┐
  │SQLite  │
  │Prisma  │
  └────────┘
```

### 1.2 最低硬件要求

| 环境 | CPU | 内存 | 磁盘 | 网络 |
|------|-----|------|------|------|
| 开发环境 | 2 核 | 4 GB | 10 GB SSD | 5 Mbps |
| 预发布 | 2 核 | 4 GB | 20 GB SSD | 10 Mbps |
| 生产环境 | 4 核 | 8 GB | 50 GB SSD | 50 Mbps |

### 1.3 服务依赖关系图

| 端口 | 服务名称 | 说明 | 技术栈 | 协议 |
|------|---------|------|--------|------|
| 3000 | App (主应用) | Next.js 16 前端 + API | Next.js / Bun | HTTP |
| 3003 | Resonance-Sim | 情绪共振模拟引擎 | Socket.IO / Bun | WebSocket |
| 3004 | Monitoring-Sim | 系统监控模拟服务 | Socket.IO / Bun | WebSocket |
| 3005 | IFD-Calculator | 流体民主权重计算引擎 | Socket.IO / Bun | WebSocket |
| 3006 | ECE-Oracle | 情绪共识预言机 | Socket.IO / Bun | WebSocket |
| 3007 | POUE-Prover | 认知理解证明引擎 | Socket.IO / Bun | WebSocket |
| 3008 | MCP-Router | 模型上下文协议路由 | Socket.IO / Bun | WebSocket |
| 81 | Caddy Gateway | 反向代理网关 | Caddy | HTTP/WS |

**服务依赖关系**：

```
Caddy Gateway (81)
  ├── App (3000) ──── 必须
  ├── Resonance-Sim (3003) ──── 推荐（实时共振数据）
  ├── Monitoring-Sim (3004) ──── 推荐（系统监控）
  ├── IFD-Calculator (3005) ──── 可选（流体民主功能）
  ├── ECE-Oracle (3006) ──── 可选（预言机功能）
  ├── POUE-Prover (3007) ──── 可选（ZK证明功能）
  └── MCP-Router (3008) ──── 可选（MCP路由功能）
```

> **注意**: 仅 App (3000) 为必须服务，其余微服务可根据功能需求按需启动。缺少微服务仅影响对应功能模块，不会导致主应用崩溃。

---

## 2. 环境要求

### 2.1 硬件要求

#### 开发环境

| 资源 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 4 GB RAM | 8 GB RAM |
| 磁盘 | 10 GB 可用空间 | 20 GB SSD |
| 网络 | 稳定互联网连接 | 10 Mbps+ |

#### 生产环境

| 资源 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 4 核 | 8 核 |
| 内存 | 8 GB RAM | 16 GB RAM |
| 磁盘 | 50 GB SSD | 100 GB NVMe SSD |
| 网络 | 50 Mbps | 100 Mbps+ |

> **提示**: 生产环境建议使用 NVMe SSD 以获得最佳数据库 I/O 性能。SQLite 在 SSD 上读写性能可达 HDD 的 10 倍以上。

### 2.2 软件要求

| 软件 | 版本要求 | 用途 | 安装方式 |
|------|---------|------|---------|
| Node.js | 20+ | JavaScript 运行时 | [nvm](https://github.com/nvm-sh/nvm) / [fnm](https://github.com/Schniz/fnm) |
| Bun | 1.0+ | 高性能运行时（推荐） | `curl -fsSL https://bun.sh/install \| bash` |
| Git | 2.30+ | 版本控制 | 系统包管理器 |
| Docker | 24+ | 容器化部署 | [官方文档](https://docs.docker.com/get-docker/) |
| Docker Compose | 2.20+ | 容器编排 | 随 Docker Desktop 安装 |
| SQLite3 | 3.39+ | 嵌入式数据库（Prisma 内置） | 随 Prisma 安装 |

**操作系统支持**：

- macOS 12+ (Monterey 及以上)
- Ubuntu 22.04 LTS (推荐)
- Debian 12+
- CentOS Stream 9+
- Windows 10/11 (通过 WSL2)

---

## 3. 环境变量配置

### 3.1 完整环境变量表

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | `file:./db/custom.db` | Prisma SQLite 数据库连接字符串 |
| `NEXTAUTH_SECRET` | ✅ | - | NextAuth.js 密钥，生产环境必须修改 |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | NextAuth.js 回调 URL |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ✅ | - | WalletConnect 项目 ID |
| `NEXT_PUBLIC_CHAIN_ID` | ❌ | `8453` | 区块链 Chain ID (8453=Base主网, 84532=Sepolia测试网) |
| `NEXT_PUBLIC_RPC_URL` | ❌ | `https://mainnet.base.org` | RPC 节点 URL |
| `STRIPE_SECRET_KEY` | ❌ | `sk_test_placeholder` | Stripe 密钥 |
| `STRIPE_WEBHOOK_SECRET` | ❌ | - | Stripe Webhook 签名密钥 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ❌ | `pk_test_placeholder` | Stripe 公钥 |
| `STRIPE_STARTER_PRICE_ID` | ❌ | `price_starter_placeholder` | Starter 订阅价格 ID |
| `STRIPE_PRO_PRICE_ID` | ❌ | `price_pro_placeholder` | Pro 订阅价格 ID |
| `STRIPE_ENTERPRISE_PRICE_ID` | ❌ | `price_enterprise_placeholder` | Enterprise 订阅价格 ID |
| `CORS_ORIGIN` | ❌ | `http://localhost:3000` | CORS 允许源 |
| `NODE_ENV` | ✅ | `development` | 运行环境 (development/production) |
| `NEXT_TELEMETRY_DISABLED` | ❌ | `0` | 禁用 Next.js 遥测 |
| `VERSION` | ❌ | `5.0.0` | 应用版本号 |
| `PORT` | ❌ | `3000` | 主应用端口 |

### 3.2 .env.example 模板

```bash
# =============================================================================
# BB Protocol 认知分身协议 — 环境变量配置模板
# =============================================================================
# 复制此文件为 .env 并填写实际值：
#   cp .env.example .env
# =============================================================================

# ── 数据库 ──────────────────────────────────────────────────
DATABASE_URL="file:./db/custom.db"

# ── 认证 ────────────────────────────────────────────────────
NEXTAUTH_SECRET="change-me-to-a-secure-random-string-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# ── Web3 / WalletConnect ───────────────────────────────────
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-walletconnect-project-id"
NEXT_PUBLIC_CHAIN_ID="8453"
NEXT_PUBLIC_RPC_URL="https://mainnet.base.org"

# ── Stripe 支付 ─────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_STARTER_PRICE_ID="price_starter_id"
STRIPE_PRO_PRICE_ID="price_pro_id"
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise_id"

# ── CORS ────────────────────────────────────────────────────
CORS_ORIGIN="http://localhost:3000"

# ── 运行环境 ────────────────────────────────────────────────
NODE_ENV="development"
NEXT_TELEMETRY_DISABLED="1"
VERSION="5.0.0"
PORT="3000"
```

### 3.3 生成 NEXTAUTH_SECRET

```bash
# 使用 OpenSSL 生成随机密钥
openssl rand -base64 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 或使用 Bun
bun -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"
```

---

## 4. 本地开发部署

### 4.1 克隆仓库

```bash
# 通过 HTTPS
git clone https://github.com/your-org/bb-protocol.git
cd bb-protocol

# 或通过 SSH
git clone git@github.com:your-org/bb-protocol.git
cd bb-protocol
```

### 4.2 安装依赖

```bash
# 使用 Bun（推荐，速度更快）
bun install

# 或使用 npm
npm install

# 或使用 pnpm
pnpm install
```

> **提示**: Bun 安装速度约为 npm 的 30 倍，强烈推荐使用 Bun 作为开发运行时。

### 4.3 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填写实际值
# 必须修改: NEXTAUTH_SECRET, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
nano .env
```

### 4.4 初始化数据库

```bash
# 推送 Prisma Schema 到数据库
bun run db:push

# 生成 Prisma Client
bun run db:generate
```

> **注意**: `db:push` 命令会直接将 schema 推送到数据库，不会创建迁移文件。开发阶段推荐使用 `db:push`，生产环境请使用 `db:migrate`。

### 4.5 种子数据初始化

```bash
# 通过 API 端点初始化种子数据
curl -X POST http://localhost:3000/api/seed
```

种子数据包含：
- 3 个示例认知分身 (Avatar)
- 5 个技能包 (Skill)
- 示例收益记录、委托记录、时间线事件
- LP 流动性池初始数据
- 合规模型默认配置
- 多链部署初始数据

### 4.6 启动开发服务器

```bash
# 启动 Next.js 主应用（端口 3000）
bun run dev
```

服务器启动后，访问 http://localhost:3000 即可看到应用。

### 4.7 启动微服务

每个微服务需要单独启动，请在新的终端窗口中执行：

```bash
# 情绪共振模拟服务（端口 3003）
cd mini-services/resonance-sim && bun run dev

# 系统监控模拟服务（端口 3004）
cd mini-services/monitoring-sim && bun run dev

# IFD 权重计算引擎（端口 3005）
cd mini-services/ifd-calculator && bun run dev

# ECE 预言机（端口 3006）
cd mini-services/ece-oracle && bun run dev

# POUE 证明引擎（端口 3007）
cd mini-services/poue-prover && bun run dev

# MCP 路由引擎（端口 3008）
cd mini-services/mcp-router && bun run dev
```

**一键启动所有微服务**（使用项目自带脚本）：

```bash
# 使用 start-services.sh（启动核心微服务）
bash start-services.sh
```

> **注意**: `start-services.sh` 仅启动 IFD-Calculator、ECE-Oracle 和 POUE-Prover 三个核心计算引擎。Resonance-Sim 和 Monitoring-Sim 需要手动启动。

### 4.8 验证服务状态

```bash
# 检查主应用健康状态
curl http://localhost:3000/api/health

# 检查各微服务健康状态
curl http://localhost:3003/health   # Resonance-Sim
curl http://localhost:3004/health   # Monitoring-Sim
curl http://localhost:3005/health   # IFD-Calculator
curl http://localhost:3006/health   # ECE-Oracle
curl http://localhost:3007/health   # POUE-Prover
curl http://localhost:3008/health   # MCP-Router
```

### 4.9 常见开发环境问题排查

#### 问题 1: 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :3003

# 终止占用进程
kill -9 <PID>

# 或使用 killport（需安装）
npx killport 3000
```

#### 问题 2: Prisma Client 未生成

```bash
# 重新生成 Prisma Client
bun run db:generate

# 如果仍然有问题，清除缓存后重新生成
rm -rf node_modules/.prisma
bun run db:generate
```

#### 问题 3: 数据库文件损坏

```bash
# 删除现有数据库
rm -f db/custom.db

# 重新推送 schema
bun run db:push

# 重新初始化种子数据
curl -X POST http://localhost:3000/api/seed
```

#### 问题 4: Bun 安装失败

```bash
# 清除缓存
rm -rf node_modules bun.lock

# 重新安装
bun install
```

#### 问题 5: WebSocket 连接失败

- 确认微服务已启动
- 检查 Caddy 网关是否运行
- 前端必须使用 `io("/?XTransformPort=3003")` 而非 `io("http://localhost:3003")`

---

## 5. Docker 部署

### 5.1 Dockerfile 说明

项目使用多阶段构建 Dockerfile，包含三个阶段：

```dockerfile
# Stage 1: deps — 安装依赖
# 基于 oven/bun:1.1.38
# 安装所有 npm 包并生成 Prisma Client

# Stage 2: builder — 构建应用
# 复制依赖和源码
# 执行 next build 生成 standalone 输出

# Stage 3: runner — 生产镜像
# 基于 oven/bun:1.1.38-slim（更小体积）
# 创建非 root 用户 (nextjs:nodejs)
# 仅复制必要文件：public, .next/standalone, .next/static, prisma, db
# 内置健康检查：curl -f http://localhost:3000/api/health
```

**镜像优化要点**：
- 多阶段构建减小最终镜像体积
- 非 root 用户运行，增强安全性
- 使用 `output: "standalone"` 减少部署文件
- 内置 HEALTHCHECK 指令

### 5.2 docker-compose.yml 配置

项目提供两套 Docker Compose 配置：

- `docker-compose.yml` — 生产环境配置
- `docker-compose.dev.yml` — 开发环境覆盖配置

**服务组成**：

| 服务 | 镜像 | 端口 | Profile | 说明 |
|------|------|------|---------|------|
| app | 自定义 Dockerfile | 3000 | 默认 | Next.js 主应用 |
| resonance-sim | 自定义 Dockerfile | 3003 | 默认 | 共振模拟 |
| monitoring-sim | 自定义 Dockerfile | 3004 | 默认 | 监控模拟 |
| ifd-calculator | 预构建镜像 | 3005 | engine | IFD 计算 |
| ece-oracle | 预构建镜像 | 3006 | engine | ECE 预言机 |
| poue-prover | 预构建镜像 | 3007 | engine | PoUE 证明 |
| mcp-router | 预构建镜像 | 3008 | engine | MCP 路由 |
| caddy | caddy:2-alpine | 80/443 | 默认 | 反向代理 |

> **注意**: IFD-Calculator、ECE-Oracle、POUE-Prover、MCP-Router 使用 `engine` profile，需要显式启用。

### 5.3 构建与启动

#### 生产环境

```bash
# 构建并启动基础服务（App + Resonance + Monitoring + Caddy）
docker compose up -d

# 启动包含所有引擎服务的完整部署
docker compose --profile engine up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f app
```

#### 开发环境

```bash
# 使用开发配置启动
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# 仅启动主应用开发环境
docker compose -f docker-compose.yml -f docker-compose.dev.yml up app
```

### 5.4 数据持久化

Docker Compose 配置以下持久卷：

```yaml
volumes:
  app_data:       # 主应用数据库 /app/db
    driver: local
  db_data:        # 数据库备份
    driver: local
  caddy_data:     # Caddy TLS 证书
    driver: local
  caddy_config:   # Caddy 配置
    driver: local
```

**数据库备份**：

```bash
# 从容器中复制数据库文件
docker compose cp app:/app/db/production.db ./backups/production-$(date +%Y%m%d).db

# 或使用卷挂载直接访问
# 在 docker-compose.yml 中将 app_data 挂载到宿主机
```

### 5.5 日志查看

```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志
docker compose logs app
docker compose logs resonance-sim

# 实时跟踪日志
docker compose logs -f app

# 查看最近 100 行日志
docker compose logs --tail 100 app

# 查看特定时间段的日志
docker compose logs --since "2025-01-15T10:00:00" app
```

---

## 6. Vercel 部署

### 6.1 Vercel 项目创建

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New Project"**
3. 选择 Git 仓库并导入
4. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (默认)
   - **Build Command**: `bun run build`
   - **Output Directory**: `.next` (默认)

### 6.2 环境变量配置

在 Vercel 项目设置 → Environment Variables 中添加所有必需变量：

| 变量名 | 值 | 环境 |
|--------|---|------|
| `DATABASE_URL` | `file:./db/production.db` 或 Turso URL | Production |
| `NEXTAUTH_SECRET` | 随机生成的密钥 | Production |
| `NEXTAUTH_URL` | `https://your-domain.com` | Production |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect 项目 ID | All |
| `NEXT_PUBLIC_CHAIN_ID` | `8453` | Production |
| `NEXT_PUBLIC_RPC_URL` | `https://mainnet.base.org` | Production |
| `STRIPE_SECRET_KEY` | Stripe 生产密钥 | Production |
| `STRIPE_WEBHOOK_SECRET` | Webhook 签名密钥 | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 公钥 | All |

### 6.3 Build Settings

在 Vercel 项目设置中配置：

```yaml
Build & Development Settings:
  Framework Preset: Next.js
  Build Command: bun run build
  Output Directory: .next
  Install Command: bun install

Node.js Version:
  Node.js Version: 20.x

Environment:
  Node.js Options: --max-old-space-size=4096
```

### 6.4 数据库处理

#### 方案 A: External SQLite (推荐 Turso)

[Vercel 不支持持久化文件系统](https://vercel.com/guides/using-serverless-databases)，因此需要使用外部数据库服务：

**使用 Turso (libSQL)**：

1. 安装 Turso CLI：
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

2. 创建数据库：
```bash
turso db create bb-protocol-prod
```

3. 获取连接信息：
```bash
turso db show bb-protocol-prod --url
turso db tokens create bb-protocol-prod
```

4. 更新 Prisma Schema：
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

5. 设置环境变量：
```
DATABASE_URL="libsql://bb-protocol-prod-xxx.turso.io?authToken=xxx"
```

#### 方案 B: PlanetScale (MySQL)

```bash
# 安装 PlanetScale CLI
pscale auth login

# 创建数据库
pscale database create bb-protocol-prod --region ap-southeast

# 获取连接字符串
pscale connect bb-protocol-prod main --port 3306
```

### 6.5 自定义域名

1. 在 Vercel Dashboard → Settings → Domains 中添加域名
2. 配置 DNS 记录：

| 类型 | 名称 | 值 |
|------|------|---|
| CNAME | @ | cname.vercel-dns.com |
| CNAME | www | cname.vercel-dns.com |

3. 等待 SSL 证书自动签发（通常几分钟）

> **重要**: Vercel 部署不支持微服务架构，WebSocket 服务需要单独部署到 VPS 或云服务器。建议仅将 Next.js 主应用部署到 Vercel，微服务部署到其他基础设施。

---

## 7. VPS/云服务器部署

### 7.1 服务器准备 (Ubuntu 22.04 LTS)

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础工具
sudo apt install -y curl git build-essential

# 安装 Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Nginx
sudo apt install -y nginx

# 安装 Certbot (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# 安装 PM2
sudo npm install -g pm2
```

### 7.2 Nginx 反向代理配置

创建 Nginx 配置文件：

```nginx
# /etc/nginx/sites-available/bb-protocol

# 上游服务定义
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

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 301 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头部
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https:;" always;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
    gzip_comp_level 6;

    # 文件上传限制
    client_max_body_size 10M;

    # 主应用代理
    location / {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # 微服务 WebSocket 代理
    location /ws/resonance/ {
        proxy_pass http://resonance_sim/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /ws/monitoring/ {
        proxy_pass http://monitoring_sim/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /ws/ifd/ {
        proxy_pass http://ifd_calculator/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /ws/ece/ {
        proxy_pass http://ece_oracle/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /ws/poue/ {
        proxy_pass http://poue_prover/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /ws/mcp/ {
        proxy_pass http://mcp_router/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    # 健康检查端点（无需认证）
    location /api/health {
        proxy_pass http://nextjs_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    # 静态资源缓存
    location /_next/static/ {
        proxy_pass http://nextjs_app;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 日志配置
    access_log /var/log/nginx/bb-protocol-access.log;
    error_log /var/log/nginx/bb-protocol-error.log;
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/bb-protocol /etc/nginx/sites-enabled/

# 删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

### 7.3 SSL 证书 (Let's Encrypt / Certbot)

```bash
# 获取证书（Nginx 插件自动配置）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run

# 证书自动续期已内置于 systemd timer
# 查看续期定时器状态
sudo systemctl status certbot.timer
```

**手动续期**：

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### 7.4 PM2 进程管理

创建 PM2 生态系统配置文件：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'bb-protocol-app',
      script: 'bun',
      args: 'server.js',
      cwd: '/home/deploy/bb-protocol',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'file:./db/production.db',
      },
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-app-error.log',
      out_file: '/var/log/pm2/bb-app-out.log',
      merge_logs: true,
    },
    {
      name: 'bb-resonance-sim',
      script: 'bun',
      args: 'index.ts',
      cwd: '/home/deploy/bb-protocol/mini-services/resonance-sim',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-resonance-error.log',
      out_file: '/var/log/pm2/bb-resonance-out.log',
    },
    {
      name: 'bb-monitoring-sim',
      script: 'bun',
      args: 'index.ts',
      cwd: '/home/deploy/bb-protocol/mini-services/monitoring-sim',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-monitoring-error.log',
      out_file: '/var/log/pm2/bb-monitoring-out.log',
    },
    {
      name: 'bb-ifd-calculator',
      script: 'bun',
      args: 'index.ts',
      cwd: '/home/deploy/bb-protocol/mini-services/ifd-calculator',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-ifd-error.log',
      out_file: '/var/log/pm2/bb-ifd-out.log',
    },
    {
      name: 'bb-ece-oracle',
      script: 'bun',
      args: 'index.ts',
      cwd: '/home/deploy/bb-protocol/mini-services/ece-oracle',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-ece-error.log',
      out_file: '/var/log/pm2/bb-ece-out.log',
    },
    {
      name: 'bb-poue-prover',
      script: 'bun',
      args: 'index.ts',
      cwd: '/home/deploy/bb-protocol/mini-services/poue-prover',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-poue-error.log',
      out_file: '/var/log/pm2/bb-poue-out.log',
    },
    {
      name: 'bb-mcp-router',
      script: 'bun',
      args: 'index.ts',
      cwd: '/home/deploy/bb-protocol/mini-services/mcp-router',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
      },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-mcp-error.log',
      out_file: '/var/log/pm2/bb-mcp-out.log',
    },
  ],
};
```

**PM2 常用命令**：

```bash
# 启动所有服务
pm2 start ecosystem.config.js

# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 重启单个服务
pm2 restart bb-protocol-app

# 重启所有服务
pm2 restart all

# 停止所有服务
pm2 stop all

# 删除所有服务
pm2 delete all

# 设置开机自启
pm2 startup
pm2 save

# 监控面板
pm2 monit
```

### 7.5 防火墙配置 (ufw)

```bash
# 启用防火墙
sudo ufw enable

# 允许 SSH
sudo ufw allow 22/tcp

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 拒绝直接访问内部端口
# 以下端口仅允许本地访问，由 Nginx 代理
sudo ufw deny 3000/tcp
sudo ufw deny 3003/tcp
sudo ufw deny 3004/tcp
sudo ufw deny 3005/tcp
sudo ufw deny 3006/tcp
sudo ufw deny 3007/tcp
sudo ufw deny 3008/tcp

# 查看防火墙状态
sudo ufw status verbose

# 如果需要限制 SSH 访问来源 IP
sudo ufw allow from YOUR_IP_ADDRESS to any port 22
```

### 7.6 自动化部署脚本

创建自动化部署脚本：

```bash
#!/bin/bash
# deploy.sh — BB Protocol 自动化部署脚本

set -e

# ── 配置 ──────────────────────────────────────────────────
PROJECT_DIR="/home/deploy/bb-protocol"
BRANCH="main"
BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ── 颜色输出 ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 步骤 1: 备份数据库 ────────────────────────────────────
log_info "备份数据库..."
mkdir -p $BACKUP_DIR
cp $PROJECT_DIR/db/production.db $BACKUP_DIR/production-$TIMESTAMP.db
log_info "数据库已备份到 $BACKUP_DIR/production-$TIMESTAMP.db"

# ── 步骤 2: 拉取最新代码 ──────────────────────────────────
log_info "拉取最新代码..."
cd $PROJECT_DIR
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# ── 步骤 3: 安装依赖 ──────────────────────────────────────
log_info "安装依赖..."
bun install

# ── 步骤 4: 数据库迁移 ────────────────────────────────────
log_info "推送数据库 Schema..."
bun run db:push

# ── 步骤 5: 构建应用 ──────────────────────────────────────
log_info "构建 Next.js 应用..."
bun run build

# ── 步骤 6: 重启服务 ──────────────────────────────────────
log_info "重启 PM2 服务..."
pm2 restart bb-protocol-app

# ── 步骤 7: 健康检查 ──────────────────────────────────────
log_info "执行健康检查..."
sleep 10

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HTTP_STATUS" == "200" ]; then
    log_info "✅ 部署成功！服务健康状态正常"
else
    log_error "❌ 健康检查失败 (HTTP $HTTP_STATUS)，正在回滚..."
    pm2 restart bb-protocol-app
    log_warn "请检查日志: pm2 logs bb-protocol-app"
fi

# ── 步骤 8: 清理旧备份 ────────────────────────────────────
log_info "清理 30 天前的备份..."
find $BACKUP_DIR -name "production-*.db" -mtime +30 -delete

log_info "部署流程完成！"
```

赋予执行权限：

```bash
chmod +x deploy.sh
```

---

## 8. 微服务部署

### 8.1 各微服务启动命令

| 微服务 | 端口 | 启动命令 | 广播间隔 |
|--------|------|---------|---------|
| Resonance-Sim | 3003 | `cd mini-services/resonance-sim && bun --hot index.ts` | 6s (共振更新) / 15-30s (收益事件) |
| Monitoring-Sim | 3004 | `cd mini-services/monitoring-sim && bun --hot index.ts` | 3s (指标) / 10s (链上事件) |
| IFD-Calculator | 3005 | `cd mini-services/ifd-calculator && bun --hot index.ts` | 5s (权重更新) |
| ECE-Oracle | 3006 | `cd mini-services/ece-oracle && bun --hot index.ts` | 3s (价格更新) |
| POUE-Prover | 3007 | `cd mini-services/poue-prover && bun --hot index.ts` | 8s (证明提交) |
| MCP-Router | 3008 | `cd mini-services/mcp-router && bun --hot index.ts` | 7s (请求路由) |

**使用 `bun --hot` 参数**：支持文件变更时自动重启，开发环境推荐使用。

**生产环境启动**（不带 `--hot`）：

```bash
cd mini-services/resonance-sim && NODE_ENV=production bun index.ts &
cd mini-services/monitoring-sim && NODE_ENV=production bun index.ts &
cd mini-services/ifd-calculator && NODE_ENV=production bun index.ts &
cd mini-services/ece-oracle && NODE_ENV=production bun index.ts &
cd mini-services/poue-prover && NODE_ENV=production bun index.ts &
cd mini-services/mcp-router && NODE_ENV=production bun index.ts &
```

### 8.2 微服务健康检查

每个微服务均提供 `/health` 端点：

```bash
# 批量健康检查脚本
#!/bin/bash
services=("3000:App" "3003:Resonance-Sim" "3004:Monitoring-Sim" \
          "3005:IFD-Calculator" "3006:ECE-Oracle" "3007:POUE-Prover" "3008:MCP-Router")

for service in "${services[@]}"; do
    IFS=':' read -r port name <<< "$service"
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health 2>/dev/null || echo "000")
    if [ "$status" == "200" ]; then
        echo "✅ $name (:$port) — 在线"
    else
        echo "❌ $name (:$port) — 离线 (HTTP $status)"
    fi
done
```

**预期输出**：

```
✅ App (:3000) — 在线
✅ Resonance-Sim (:3003) — 在线
✅ Monitoring-Sim (:3004) — 在线
✅ IFD-Calculator (:3005) — 在线
✅ ECE-Oracle (:3006) — 在线
✅ POUE-Prover (:3007) — 在线
✅ MCP-Router (:3008) — 在线
```

### 8.3 Caddy 网关配置 (XTransformPort)

Caddy 网关使用 `XTransformPort` 查询参数将请求路由到对应的微服务。

**路由规则**：

```
请求 URL                                    → 路由目标
─────────────────────────────────────────────────────────
/                                           → localhost:3000 (App)
/?XTransformPort=3003                       → localhost:3003 (Resonance-Sim)
/?XTransformPort=3004                       → localhost:3004 (Monitoring-Sim)
/api/test?XTransformPort=3005               → localhost:3005 (IFD-Calculator)
/api/data?XTransformPort=3006               → localhost:3006 (ECE-Oracle)
/ws/connect?XTransformPort=3007             → localhost:3007 (POUE-Prover)
/ws/route?XTransformPort=3008               → localhost:3008 (MCP-Router)
```

**前端连接示例**：

```typescript
// ✅ 正确：通过 Caddy 网关连接微服务
import { io } from 'socket.io-client';

// 连接共振模拟服务
const resonanceSocket = io('/?XTransformPort=3003');

// 连接监控服务
const monitoringSocket = io('/?XTransformPort=3004');

// ❌ 错误：直接连接微服务（绕过网关，CORS 问题）
const badSocket = io('http://localhost:3003');  // 禁止使用！
```

**Caddy 配置详解**：

```caddyfile
:81 {
    # 带有 XTransformPort 参数的请求 → 路由到指定端口
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

    # 默认请求 → 主应用
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

---

## 9. 数据库管理

### 9.1 Prisma Migrate vs db:push

| 特性 | `db:push` | `migrate dev` / `migrate deploy` |
|------|-----------|----------------------------------|
| 创建迁移文件 | ❌ 否 | ✅ 是 |
| 适用于开发 | ✅ 推荐 | ⚠️ 可用 |
| 适用于生产 | ❌ 不推荐 | ✅ 推荐 |
| 数据丢失风险 | ⚠️ 可能 | ✅ 安全（可回滚） |
| 速度 | ⚡ 快 | 🐢 较慢 |
| 版本追踪 | ❌ 无 | ✅ 有 |

**推荐使用场景**：

- **开发阶段**：使用 `db:push`，快速迭代 Schema
- **生产环境**：使用 `migrate deploy`，确保安全迁移

### 9.2 数据备份

#### 自动备份脚本

```bash
#!/bin/bash
# backup-db.sh — 数据库自动备份脚本

DB_PATH="/home/deploy/bb-protocol/db/production.db"
BACKUP_DIR="/home/deploy/backups/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# 使用 SQLite 内置备份命令
sqlite3 $DB_PATH ".backup '$BACKUP_DIR/production-$TIMESTAMP.db'"

# 压缩备份
gzip $BACKUP_DIR/production-$TIMESTAMP.db

echo "[$(date)] 备份完成: production-$TIMESTAMP.db.gz"

# 清理过期备份
find $BACKUP_DIR -name "production-*.db.gz" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] 已清理 $RETENTION_DAYS 天前的备份"
```

#### 设置定时备份

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点执行备份
0 2 * * * /home/deploy/scripts/backup-db.sh >> /var/log/bb-protocol-backup.log 2>&1

# 每 6 小时备份一次
0 */6 * * * /home/deploy/scripts/backup-db.sh >> /var/log/bb-protocol-backup.log 2>&1
```

### 9.3 数据恢复

```bash
# 停止应用
pm2 stop bb-protocol-app

# 解压备份文件
gunzip /home/deploy/backups/db/production-20250115_020000.db.gz

# 替换数据库文件
cp /home/deploy/backups/db/production-20250115_020000.db /home/deploy/bb-protocol/db/production.db

# 重新生成 Prisma Client
cd /home/deploy/bb-protocol
bun run db:generate

# 重启应用
pm2 start bb-protocol-app
```

### 9.4 数据库迁移流程

#### 开发环境

```bash
# 1. 修改 prisma/schema.prisma

# 2. 推送变更到数据库
bun run db:push

# 3. 生成 Prisma Client
bun run db:generate
```

#### 生产环境

```bash
# 1. 在开发环境创建迁移
bun run db:migrate
# 这会在 prisma/migrations/ 目录下创建新的迁移文件

# 2. 提交迁移文件到 Git
git add prisma/migrations/
git commit -m "feat: add new migration for XXX"
git push

# 3. 在生产环境应用迁移
bunx prisma migrate deploy
```

**迁移回滚**（如果需要）：

```bash
# Prisma 不原生支持回滚
# 建议通过恢复数据库备份来"回滚"
# 或创建新的"反向迁移"
```

---

## 10. Stripe 配置

### 10.1 Stripe 账户创建

1. 访问 [Stripe 官网](https://stripe.com/) 注册账户
2. 完成邮箱验证
3. 填写商家信息（公司名称、地址、税务信息等）
4. 完成身份验证（KYC）

### 10.2 API 密钥获取

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/)
2. 进入 **Developers → API Keys**
3. 获取以下密钥：

| 密钥 | 名称 | 用途 |
|------|------|------|
| `pk_test_xxx` | 测试公钥 | 前端测试环境 |
| `sk_test_xxx` | 测试密钥 | 后端测试环境 |
| `pk_live_xxx` | 生产公钥 | 前端生产环境 |
| `sk_live_xxx` | 生产密钥 | 后端生产环境 |

> **安全提醒**: 密钥永远不要提交到 Git 仓库。生产密钥仅存储在服务器环境变量中。

### 10.3 Webhook 配置

1. 进入 **Developers → Webhooks**
2. 点击 **"Add endpoint"**
3. 配置端点 URL：`https://your-domain.com/api/stripe/webhook`
4. 选择监听事件：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

5. 获取 Webhook 签名密钥：
   - 点击创建的 Webhook 端点
   - 点击 **"Reveal"** 获取签名密钥
   - 设置环境变量：`STRIPE_WEBHOOK_SECRET=whsec_xxx`

**本地测试 Webhook**：

```bash
# 安装 Stripe CLI
stripe login

# 转发 Webhook 到本地
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 触发测试事件
stripe trigger checkout.session.completed
```

### 10.4 产品与价格创建

BB Protocol 提供三个订阅层级：

| 层级 | 价格 | Stripe Price ID 变量 | 功能 |
|------|------|---------------------|------|
| Starter | $9.99/月 | `STRIPE_STARTER_PRICE_ID` | 5 Avatar calls/天, 基础技能包, 邮件支持 |
| Pro | $29.99/月 | `STRIPE_PRO_PRICE_ID` | 无限 Avatar calls, 高级技能包, 优先支持, 收益分析 |
| Enterprise | $99.99/月 | `STRIPE_ENTERPRISE_PRICE_ID` | 无限一切, 自定义技能包, 专属支持, 链上分账, SLA 保障 |

**创建产品和价格**：

1. 进入 **Products → Add product**
2. 创建 Starter 产品：
   - 名称：`BB Protocol Starter`
   - 价格：`$9.99` / Monthly recurring
   - 复制 Price ID 并设置到 `STRIPE_STARTER_PRICE_ID`

3. 重复以上步骤创建 Pro 和 Enterprise 产品

**使用 Stripe CLI 创建**：

```bash
# 创建 Starter 产品
stripe products create --name "BB Protocol Starter" --description "5 Avatar calls/day, Basic skill pack, Email support"

# 创建 Starter 价格
stripe prices create --product prod_xxx --unit-amount 999 --currency usd --recurring[interval]=month

# 创建 Pro 产品和价格
stripe products create --name "BB Protocol Pro" --description "Unlimited Avatar calls, Advanced skill pack, Priority support, Revenue analytics"
stripe prices create --product prod_xxx --unit-amount 2999 --currency usd --recurring[interval]=month

# 创建 Enterprise 产品和价格
stripe products create --name "BB Protocol Enterprise" --description "Unlimited everything, Custom skill packs, Dedicated support, On-chain revenue split, SLA guarantee"
stripe prices create --product prod_xxx --unit-amount 9999 --currency usd --recurring[interval]=month
```

### 10.5 测试模式 vs 生产模式

| 特性 | 测试模式 | 生产模式 |
|------|---------|---------|
| 密钥前缀 | `sk_test_` / `pk_test_` | `sk_live_` / `pk_live_` |
| 交易 | 模拟，不产生真实扣款 | 真实扣款 |
| Webhook | 需要本地转发 | 直接接收 |
| 卡号 | `4242 4242 4242 4242` | 真实卡号 |
| 切换 | Dashboard 左上角开关 | Dashboard 左上角开关 |

**测试信用卡号**：

| 卡号 | 场景 |
|------|------|
| `4242 4242 4242 4242` | 成功支付 |
| `4000 0025 0000 3155` | 需要 3D 验证 |
| `4000 0000 0000 0002` | 卡被拒绝 |
| `4000 0000 0000 9995` | 余额不足 |

> **上线前检查清单**：
> - [ ] 切换到生产密钥
> - [ ] 配置生产 Webhook 端点
> - [ ] 完成 Stripe 账户激活
> - [ ] 测试完整支付流程
> - [ ] 设置纠纷和退款处理流程

---

## 11. Web3 配置

### 11.1 WalletConnect Project ID

WalletConnect 用于连接 Web3 钱包（如 MetaMask、WalletCore 等）。

**获取 Project ID**：

1. 访问 [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. 注册/登录账户
3. 点击 **"Create Project"**
4. 填写项目名称：`BB Protocol`
5. 选择项目类型：**"App"**
6. 复制 Project ID
7. 设置环境变量：`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx`

> **注意**: `NEXT_PUBLIC_` 前缀表示此变量可在浏览器端访问，是 WalletConnect SDK 所必需的。

### 11.2 合约地址配置

合约地址定义在 `src/lib/web3-config.ts` 中：

```typescript
export const CONTRACT_ADDRESSES = {
  avatarCore:      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  dynamicSplitter: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  circuitGuard:    '0x9fE46736679d2D9a65F0992F2272De9f3c7fa6e0',
  skillVault:      '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  ifdRouter:       '0xDc64a140Aa8C5D5AeB9F8a7E0F1C9b9B9b9b9b9b',
  tokenVault:      '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  eceOracle:       '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  afcToken:        '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  governance:      '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  proxyAdmin:      '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
};
```

**生产环境部署合约后**，需要更新以上地址为实际部署地址。

**使用 Foundry 部署合约**：

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 部署合约到 Base 主网
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_RPC_URL --broadcast --verify

# 记录部署地址并更新 web3-config.ts
```

### 11.3 网络切换 (Base Mainnet vs Sepolia)

| 网络 | Chain ID | RPC URL | 区块浏览器 | 用途 |
|------|----------|---------|-----------|------|
| Base Mainnet | 8453 | `https://mainnet.base.org` | basescan.org | 生产环境 |
| Base Sepolia | 84532 | `https://sepolia.base.org` | sepolia.basescan.org | 测试环境 |

**切换到测试网**：

```bash
# 设置环境变量
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
```

**切换到主网**：

```bash
# 设置环境变量
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

**代码中的链配置**：

```typescript
// src/lib/web3-config.ts
export const CHAIN_CONFIG = {
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
};
```

**Gas 常量配置**：

```typescript
export const GAS_CONSTANTS = {
  baseL2GasPrice: 0.0000000025,        // 每单位 Gas 的 USD 价格
  maxPriorityFeePerGas: 1000000000n,    // 1 Gwei
  maxFeePerGas: 3000000000n,            // 3 Gwei
};
```

---

## 12. 监控与日志

### 12.1 健康检查端点

主应用提供 `/api/health` 端点，返回以下信息：

```json
{
  "status": "ok",
  "version": "5.0.0",
  "uptime": "2h 30m 15s",
  "uptimeSeconds": 9015,
  "timestamp": "2025-01-15T10:30:15.000Z",
  "services": {
    "app":            { "status": "online", "port": 3000 },
    "resonanceSim":   { "status": "online", "port": 3003 },
    "monitoringSim":  { "status": "online", "port": 3004 },
    "ifdCalculator":  { "status": "online", "port": 3005 },
    "eceOracle":      { "status": "online", "port": 3006 },
    "poueProver":     { "status": "online", "port": 3007 },
    "mcpRouter":      { "status": "online", "port": 3008 }
  },
  "contracts": {
    "count": 10,
    "network": "Base L2",
    "chainId": 8453,
    "solidityVersion": "0.8.24"
  },
  "infrastructure": {
    "i18n": { "supported": 8, "locales": ["zh","en","ja","ko","es","fr","de","ar"] },
    "stateManagement": "Zustand + TanStack Query",
    "testing": "Playwright E2E",
    "cicd": "GitHub Actions",
    "containerization": "Docker Compose"
  }
}
```

**外部健康检查脚本**：

```bash
#!/bin/bash
# health-check.sh

DOMAIN=${1:-"localhost:3000"}
ALERT_WEBHOOK=${SLACK_WEBHOOK_URL:-""}

response=$(curl -s -f http://$DOMAIN/api/health 2>/dev/null)
status=$?

if [ $status -ne 0 ]; then
    echo "❌ 健康检查失败: $DOMAIN"
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -s -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🚨 BB Protocol 健康检查失败: $DOMAIN\"}"
    fi
    exit 1
else
    echo "✅ 健康检查通过: $DOMAIN"
    echo "$response" | jq '.status, .version, .uptime'
fi
```

### 12.2 日志配置

#### 应用日志

```bash
# PM2 日志
pm2 logs bb-protocol-app

# Nginx 访问日志
tail -f /var/log/nginx/bb-protocol-access.log

# Nginx 错误日志
tail -f /var/log/nginx/bb-protocol-error.log
```

#### 日志轮转

创建 logrotate 配置：

```bash
# /etc/logrotate.d/bb-protocol

/var/log/pm2/bb-*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}

/var/log/nginx/bb-protocol-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endpostrotate
}
```

### 12.3 告警规则

**推荐告警配置**：

| 告警项 | 阈值 | 级别 | 通知方式 |
|--------|------|------|---------|
| 主应用不可用 | HTTP 5xx 连续 3 次 | Critical | Slack + SMS |
| 响应时间 > 3s | P95 > 3000ms | Warning | Slack |
| CPU 使用率 | > 85% 持续 5 分钟 | Warning | Slack |
| 内存使用率 | > 90% 持续 5 分钟 | Critical | Slack + SMS |
| 磁盘空间 | < 10% 可用 | Critical | Slack + SMS |
| 数据库连接失败 | 任意 1 次 | Critical | Slack + SMS |
| SSL 证书过期 | < 7 天 | Warning | Slack + Email |
| 微服务离线 | 任意 1 个服务 | Warning | Slack |

**使用 Uptime Robot 监控**：

1. 注册 [Uptime Robot](https://uptimerobot.com/)
2. 添加监控：
   - URL: `https://your-domain.com/api/health`
   - 监控类型: HTTP(s)
   - 检查间隔: 5 分钟
   - 告警联系方式: Email + Slack

### 12.4 性能监控

**Web Vitals 目标**：

| 指标 | 目标值 | 当前值 | 状态 |
|------|--------|--------|------|
| FCP (First Contentful Paint) | < 1.8s | - | 待测量 |
| LCP (Largest Contentful Paint) | < 2.5s | - | 待测量 |
| INP (Interaction to Next Paint) | < 200ms | - | 待测量 |
| CLS (Cumulative Layout Shift) | < 0.1 | - | 待测量 |
| TTFB (Time to First Byte) | < 800ms | - | 待测量 |

**缓存策略**：

| 缓存类型 | TTL | SWR 间隔 | 适用场景 |
|----------|-----|---------|---------|
| SSR Page | 60s | 300s | 动态页面 |
| API Response | 30s | 120s | API 数据 |
| Static Asset | 365d | - | `_next/static/` |
| ISR | 300s | 600s | 增量静态生成 |
| CDN Edge | 60s | 300s | 边缘缓存 |

---

## 13. 安全加固

### 13.1 环境变量安全

```bash
# 1. 确保 .env 文件权限正确
chmod 600 .env
chown deploy:deploy .env

# 2. 确保 .env 在 .gitignore 中
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore

# 3. 验证 .env 不在版本控制中
git status .env
# 应显示: "nothing to commit"

# 4. 使用 secrets 管理工具（推荐）
# - Docker Secrets
# - HashiCorp Vault
# - AWS Secrets Manager
# - GitHub Secrets (CI/CD)
```

### 13.2 API Rate Limiting

在 Nginx 层实现速率限制：

```nginx
# /etc/nginx/conf.d/rate-limit.conf

# 限制区域定义
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=5r/m;

server {
    # API 通用限制
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://nextjs_app;
    }

    # 认证接口限制
    location /api/auth/ {
        limit_req zone=auth_limit burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://nextjs_app;
    }

    # Webhook 限制
    location /api/stripe/webhook {
        limit_req zone=webhook_limit burst=3 nodelay;
        limit_req_status 429;
        proxy_pass http://nextjs_app;
    }
}
```

### 13.3 CORS 配置

```typescript
// 微服务中的 CORS 配置
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

**生产环境 CORS 白名单**：

```typescript
// 推荐使用白名单而非 '*'
const ALLOWED_ORIGINS = [
  'https://your-domain.com',
  'https://www.your-domain.com',
];

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
```

### 13.4 CSP 头部

```nginx
# Content Security Policy
add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' wss: https: https://*.stripe.com;
    frame-src https://*.stripe.com https://walletconnect.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
" always;

# 其他安全头部
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 13.5 数据库加密

SQLite 数据库文件级加密方案：

```bash
# 方案 1: 文件系统级加密 (LUKS)
sudo cryptsetup luksFormat /dev/sdb1
sudo cryptsetup luksOpen /dev/sdb1 encrypted_db
sudo mkfs.ext4 /dev/mapper/encrypted_db
sudo mount /dev/mapper/encrypted_db /mnt/encrypted_db

# 方案 2: 使用 SQLCipher (加密 SQLite 扩展)
# 需要替换 Prisma 的 SQLite 引擎
# 参考: https://github.com/prisma/prisma/issues/7826

# 方案 3: 应用层加密（敏感字段）
# 对钱包地址、私钥等敏感数据进行 AES-256 加密
```

---

## 14. 备份与灾难恢复

### 14.1 备份策略

| 备份类型 | 频率 | 保留期限 | 存储位置 | 自动化 |
|----------|------|---------|---------|--------|
| 数据库全量 | 每日 | 30 天 | 本地 + S3 | ✅ cron |
| 数据库增量 | 每 6 小时 | 7 天 | 本地 | ✅ cron |
| 应用代码 | 每次部署 | 无限 | Git | ✅ Git |
| 配置文件 | 每次变更 | 无限 | Git | ✅ Git |
| SSL 证书 | 自动续期 | - | Let's Encrypt | ✅ certbot |
| Docker 镜像 | 每次构建 | 90 天 | Docker Hub / ECR | ✅ CI/CD |

**S3 远程备份脚本**：

```bash
#!/bin/bash
# backup-to-s3.sh

DB_PATH="/home/deploy/bb-protocol/db/production.db"
S3_BUCKET="s3://your-backup-bucket/bb-protocol"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 上传数据库到 S3
aws s3 cp $DB_PATH $S3_BUCKET/db/production-$TIMESTAMP.db

# 上传 PM2 日志
tar czf /tmp/pm2-logs-$TIMESTAMP.tar.gz /var/log/pm2/
aws s3 cp /tmp/pm2-logs-$TIMESTAMP.tar.gz $S3_BUCKET/logs/pm2-logs-$TIMESTAMP.tar.gz

# 清理本地临时文件
rm -f /tmp/pm2-logs-$TIMESTAMP.tar.gz

echo "[$(date)] S3 备份完成"
```

### 14.2 恢复流程

#### 场景 1: 数据库损坏

```bash
# 1. 停止应用
pm2 stop bb-protocol-app

# 2. 评估损坏程度
sqlite3 /home/deploy/bb-protocol/db/production.db "PRAGMA integrity_check;"

# 3. 如果可修复
sqlite3 /home/deploy/bb-protocol/db/production.db "REINDEX;"

# 4. 如果不可修复，恢复备份
cp /home/deploy/backups/db/production-20250115_020000.db /home/deploy/bb-protocol/db/production.db

# 5. 重启应用
pm2 start bb-protocol-app

# 6. 验证数据完整性
curl http://localhost:3000/api/health
```

#### 场景 2: 服务器故障

```bash
# 1. 准备新服务器
# 参照第 7.1 节安装所有依赖

# 2. 克隆代码
git clone https://github.com/your-org/bb-protocol.git
cd bb-protocol
bun install

# 3. 配置环境变量
cp .env.example .env
nano .env  # 填写所有环境变量

# 4. 恢复数据库
aws s3 cp s3://your-backup-bucket/bb-protocol/db/production-LATEST.db ./db/production.db

# 5. 初始化
bun run db:generate
bun run build

# 6. 启动服务
pm2 start ecosystem.config.js

# 7. 验证
curl http://localhost:3000/api/health
```

#### 场景 3: 误操作数据

```bash
# 1. 立即停止应用
pm2 stop bb-protocol-app

# 2. 找到最近的干净备份
ls -la /home/deploy/backups/db/

# 3. 恢复备份
cp /home/deploy/backups/db/production-XXXXXX.db /home/deploy/bb-protocol/db/production.db

# 4. 重启应用
pm2 start bb-protocol-app

# 5. 验证
curl http://localhost:3000/api/dashboard
```

### 14.3 灾难恢复计划

| 灾难级别 | RTO (恢复时间) | RPO (数据丢失) | 行动 |
|----------|---------------|---------------|------|
| Level 1: 单服务故障 | < 5 分钟 | 0 | PM2 自动重启 |
| Level 2: 数据库损坏 | < 30 分钟 | < 6 小时 | 恢复最近备份 |
| Level 3: 服务器宕机 | < 2 小时 | < 6 小时 | 新服务器 + S3 恢复 |
| Level 4: 区域故障 | < 8 小时 | < 24 小时 | 切换到备用区域 |

**RTO** (Recovery Time Objective): 从故障到恢复服务的目标时间  
**RPO** (Recovery Point Objective): 可接受的最大数据丢失量

---

## 15. 更新与维护

### 15.1 版本更新流程

```bash
#!/bin/bash
# update.sh — 版本更新脚本

set -e

PROJECT_DIR="/home/deploy/bb-protocol"
BRANCH="main"

cd $PROJECT_DIR

# 1. 拉取最新代码
git fetch origin
CURRENT_VERSION=$(git describe --tags --always)
git pull origin $BRANCH
NEW_VERSION=$(git describe --tags --always)

echo "版本更新: $CURRENT_VERSION → $NEW_VERSION"

# 2. 安装依赖
bun install

# 3. 推送数据库 Schema 变更
bun run db:push

# 4. 生成 Prisma Client
bun run db:generate

# 5. 构建应用
bun run build

# 6. 重启主应用
pm2 restart bb-protocol-app

# 7. 重启微服务
pm2 restart bb-resonance-sim
pm2 restart bb-monitoring-sim
pm2 restart bb-ifd-calculator
pm2 restart bb-ece-oracle
pm2 restart bb-poue-prover
pm2 restart bb-mcp-router

# 8. 健康检查
sleep 10
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ 更新成功！版本: $NEW_VERSION"
else
    echo "❌ 更新后健康检查失败！"
    echo "请执行回滚: bash rollback.sh"
    exit 1
fi
```

### 15.2 数据库迁移

```bash
# 查看当前迁移状态
bunx prisma migrate status

# 应用待执行的迁移
bunx prisma migrate deploy

# 创建新迁移（开发环境）
bunx prisma migrate dev --name describe_the_change

# 强制推送 Schema（开发环境，可能丢失数据）
bun run db:push
```

### 15.3 回滚操作

```bash
#!/bin/bash
# rollback.sh — 回滚到上一个版本

set -e

PROJECT_DIR="/home/deploy/bb-protocol"
BACKUP_DIR="/home/deploy/backups/db"

cd $PROJECT_DIR

# 1. 回滚代码
git log --oneline -5
echo "请输入要回滚到的 commit hash:"
read COMMIT_HASH

git checkout $COMMIT_HASH

# 2. 安装依赖
bun install

# 3. 构建应用
bun run build

# 4. 恢复数据库（可选）
echo "是否恢复数据库？(y/n)"
read RESTORE_DB

if [ "$RESTORE_DB" == "y" ]; then
    echo "可用的备份文件："
    ls -la $BACKUP_DIR/
    echo "请输入备份文件名："
    read BACKUP_FILE
    pm2 stop bb-protocol-app
    cp $BACKUP_DIR/$BACKUP_FILE ./db/production.db
fi

# 5. 重启服务
bun run db:generate
pm2 restart bb-protocol-app

# 6. 健康检查
sleep 10
curl -s http://localhost:3000/api/health | jq '.status'

echo "回滚完成！"
```

### 15.4 维护窗口

**计划维护流程**：

1. **提前通知**：至少 48 小时前通过邮件和网站公告通知用户
2. **设置维护页面**：
   ```nginx
   # /etc/nginx/conf.d/maintenance.conf
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           return 503;
           error_page 503 /maintenance.html;
       }
       
       location = /maintenance.html {
           root /var/www/maintenance;
           internal;
       }
   }
   ```
3. **执行维护操作**
4. **验证服务恢复**
5. **关闭维护页面**
6. **发送恢复通知**

**维护页面 HTML**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BB Protocol — 系统维护中</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #0f172a;
            color: #e2e8f0;
        }
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
        }
        h1 { color: #22d3ee; }
        .emoji { font-size: 4rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🔧</div>
        <h1>系统维护中</h1>
        <p>BB Protocol 正在进行系统升级维护，预计很快恢复。</p>
        <p>感谢您的耐心等待！</p>
    </div>
</body>
</html>
```

---

## 16. 常见问题 (FAQ)

### Q1: 启动时报 "Cannot find module '@prisma/client'"

**原因**：Prisma Client 未生成或未安装。

**解决方案**：
```bash
bun run db:generate
bun install
```

### Q2: WebSocket 连接一直断开重连

**原因**：微服务未启动或 Caddy 网关未正确配置。

**解决方案**：
1. 确认对应微服务已启动：`curl http://localhost:3003/health`
2. 检查前端是否使用正确的连接方式：`io("/?XTransformPort=3003")`
3. 检查 Caddy 配置中的 `XTransformPort` 路由规则
4. 确认防火墙未阻断 WebSocket 连接

### Q3: 数据库迁移后数据丢失

**原因**：使用 `db:push` 在生产环境，某些 Schema 变更可能导致数据重置。

**解决方案**：
1. 始终在生产环境使用 `prisma migrate deploy`
2. 迁移前备份数据库
3. 如已丢失，从最近的备份恢复

### Q4: Stripe Webhook 收不到事件

**原因**：Webhook 端点不可达或签名密钥不匹配。

**解决方案**：
1. 确认 Webhook URL 可从公网访问
2. 检查 `STRIPE_WEBHOOK_SECRET` 是否正确
3. 使用 Stripe CLI 本地测试：`stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. 检查 Nginx 日志是否有 4xx/5xx 错误

### Q5: 钱包连接失败 (WalletConnect)

**原因**：WalletConnect Project ID 未配置或无效。

**解决方案**：
1. 检查 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` 是否设置
2. 确认 Project ID 在 WalletConnect Cloud 中处于激活状态
3. 清除浏览器缓存和 LocalStorage
4. 检查浏览器是否安装了 Web3 钱包扩展

### Q6: Docker 构建失败 " bun install --frozen-lockfile"

**原因**：`bun.lock` 文件与 `package.json` 不同步。

**解决方案**：
```bash
# 本地重新生成 lockfile
rm bun.lock
bun install
git add bun.lock
git commit -m "chore: update bun.lock"
```

### Q7: PM2 启动后进程立即退出

**原因**：环境变量缺失或端口冲突。

**解决方案**：
1. 查看错误日志：`pm2 logs bb-protocol-app --err`
2. 检查环境变量是否正确设置
3. 检查端口是否被占用：`lsof -i :3000`
4. 尝试手动启动确认错误信息：`bun server.js`

### Q8: Nginx 502 Bad Gateway

**原因**：后端应用未启动或 Nginx 无法连接到上游服务。

**解决方案**：
1. 检查应用是否运行：`pm2 status`
2. 检查端口是否监听：`ss -tlnp | grep 3000`
3. 检查 Nginx 上游配置是否正确
4. 检查 SELinux/AppArmor 是否阻止连接

### Q9: SSL 证书自动续期失败

**原因**：Certbot 无法完成 HTTP-01 验证。

**解决方案**：
```bash
# 手动续期并查看详细错误
sudo certbot renew --verbose

# 确保 80 端口可从外部访问
sudo ufw allow 80/tcp

# 检查 Nginx 是否正确代理 .well-known 目录
sudo nginx -t
```

### Q10: 内存持续增长（内存泄漏）

**原因**：可能存在未释放的 WebSocket 连接或缓存未清理。

**解决方案**：
1. 设置 PM2 内存限制：`max_memory_restart: '1G'`
2. 监控内存使用：`pm2 monit`
3. 生成堆快照分析：
   ```bash
   # 在 PM2 配置中添加
   node_args: '--inspect=0.0.0.0:9229'
   
   # 使用 Chrome DevTools 连接分析
   ```
4. 检查 Socket.IO 连接是否正确清理

### Q11: 国际化 (i18n) 显示英文而非中文

**原因**：语言包未正确加载或浏览器语言设置问题。

**解决方案**：
1. 确认 `src/lib/messages/zh.json` 存在且完整
2. 检查浏览器语言偏好设置
3. 清除浏览器缓存
4. 使用语言切换器手动选择中文

### Q12: 共振波形图不显示实时数据

**原因**：Resonance-Sim 微服务未启动或 WebSocket 断开。

**解决方案**：
1. 确认 Resonance-Sim 运行中：`curl http://localhost:3003/health`
2. 打开浏览器开发者工具 → Network → WS，查看 WebSocket 连接状态
3. 检查前端 `use-resonance-stream.ts` hook 的连接 URL
4. 确认使用 `io("/?XTransformPort=3003")` 而非直连

### Q13: Docker 容器时间不正确

**原因**：容器默认时区为 UTC。

**解决方案**：
```yaml
# 在 docker-compose.yml 中添加时区配置
environment:
  - TZ=Asia/Shanghai
volumes:
  - /etc/localtime:/etc/localtime:ro
```

### Q14: 构建时 TypeScript 报错但本地开发正常

**原因**：本地开发模式跳过了 TypeScript 检查（`ignoreBuildErrors: true`）。

**解决方案**：
1. 检查 `next.config.ts` 中的 `typescript.ignoreBuildErrors` 设置
2. 临时关闭忽略选项，修复所有类型错误
3. 运行 `npx tsc --noEmit` 检查类型

### Q15: 部署后页面样式错乱

**原因**：Tailwind CSS 类名在构建时被错误清除（purge 问题）。

**解决方案**：
1. 检查 `tailwind.config.ts` 中的 `content` 配置
2. 确保所有组件路径都包含在 content 列表中
3. 清除 `.next` 缓存后重新构建：
   ```bash
   rm -rf .next
   bun run build
   ```

### Q16: 数据库文件过大导致性能下降

**原因**：SQLite 数据库长时间使用后产生碎片。

**解决方案**：
```bash
# 停止应用
pm2 stop bb-protocol-app

# 执行 VACUUM 压缩数据库
sqlite3 db/production.db "VACUUM;"

# 重建索引
sqlite3 db/production.db "REINDEX;"

# 检查完整性
sqlite3 db/production.db "PRAGMA integrity_check;"

# 重启应用
pm2 start bb-protocol-app
```

---

## 附录

### A. 端口分配汇总

| 端口 | 服务 | 协议 | 必需 |
|------|------|------|------|
| 80 | Nginx / Caddy | HTTP | ✅ |
| 443 | Nginx / Caddy | HTTPS | ✅ |
| 81 | Caddy (Docker) | HTTP | ❌ (Docker) |
| 3000 | Next.js App | HTTP | ✅ |
| 3003 | Resonance-Sim | WS | ❌ |
| 3004 | Monitoring-Sim | WS | ❌ |
| 3005 | IFD-Calculator | WS | ❌ |
| 3006 | ECE-Oracle | WS | ❌ |
| 3007 | POUE-Prover | WS | ❌ |
| 3008 | MCP-Router | WS | ❌ |
| 9229 | Node.js Debugger | HTTP | ❌ (开发) |

### B. 环境变量快速参考

```bash
# 最小化生产配置
DATABASE_URL="file:./db/production.db"
NEXTAUTH_SECRET="<随机32字符密钥>"
NEXTAUTH_URL="https://your-domain.com"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="<WalletConnect ID>"
NEXT_PUBLIC_CHAIN_ID="8453"
NEXT_PUBLIC_RPC_URL="https://mainnet.base.org"
NODE_ENV="production"
```

### C. 关键文件路径

| 路径 | 说明 |
|------|------|
| `prisma/schema.prisma` | 数据库 Schema 定义 |
| `src/lib/web3-config.ts` | Web3 链配置和合约地址 |
| `src/lib/stripe-config.ts` | Stripe 支付配置 |
| `src/lib/i18n-config.ts` | 国际化配置 |
| `Caddyfile` | Caddy 网关配置 |
| `docker-compose.yml` | Docker 编排配置 |
| `ecosystem.config.js` | PM2 进程管理配置 |
| `.env` | 环境变量（不提交到 Git） |

### D. 技术栈版本

| 技术 | 版本 |
|------|------|
| Next.js | 16.1+ |
| React | 19.0 |
| TypeScript | 5.x |
| Bun | 1.0+ |
| Prisma | 6.11+ |
| Socket.IO | 4.8+ |
| Stripe | 22.1+ |
| wagmi | 3.6+ |
| viem | 2.x |
| Tailwind CSS | 4.x |
| shadcn/ui | New York style |
| Zustand | 5.0+ |
| TanStack Query | 5.100+ |
| Framer Motion | 12.x |
| Foundry | latest |

---

> **免责声明**: 本文档基于 BB Protocol v5.0.0 编写，部分配置可能随版本更新而变化。部署前请确认当前版本的兼容性。如有问题，请提交 [GitHub Issue](https://github.com/your-org/bb-protocol/issues) 或联系技术团队。

---

*文档结束 — BB Protocol 认知分身协议全环境部署指南 v5.0.0*
