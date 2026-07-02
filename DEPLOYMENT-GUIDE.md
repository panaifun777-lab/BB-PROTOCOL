# BB Protocol — 部署指南

> **版本**: v2.2.0  
> **最后更新**: 2026-03-05  
> **适用环境**: 本地开发 / Docker / Vercel / VPS (Ubuntu)

---

## 目录

1. [前置条件](#1-前置条件)
2. [本地开发环境搭建](#2-本地开发环境搭建)
3. [Docker 部署](#3-docker-部署)
4. [Vercel 部署](#4-vercel-部署)
5. [自托管 VPS 部署 (Ubuntu)](#5-自托管-vps-部署-ubuntu)
6. [环境变量参考表](#6-环境变量参考表)
7. [数据库配置 (Prisma + SQLite → PostgreSQL 迁移)](#7-数据库配置)
8. [Stripe 配置](#8-stripe-配置)
9. [Web3 / WalletConnect 配置](#9-web3--walletconnect-配置)
10. [生产加固检查清单](#10-生产加固检查清单)
11. [监控与日志](#11-监控与日志)
12. [备份与恢复](#12-备份与恢复)
13. [常见问题排查](#13-常见问题排查)

---

## 1. 前置条件

### 必需软件

| 软件 | 最低版本 | 推荐版本 | 用途 |
|------|----------|----------|------|
| **Bun** | 1.1.0+ | 1.1.38 | JavaScript 运行时 + 包管理 |
| **Node.js** | 18.x+ | 20.x LTS | Next.js 兼容层 |
| **Git** | 2.30+ | 最新 | 版本控制 |
| **Docker** | 24.0+ | 最新 | 容器化部署 |
| **Docker Compose** | 2.20+ | 最新 | 容器编排 |

### 可选软件

| 软件 | 用途 |
|------|------|
| **Foundry** | 智能合约编译与测试 |
| **Rust** (1.75+) | 高性能引擎编译 |
| **Terraform** (1.6+) | 基础设施即代码 |
| **PostgreSQL** (15+) | 生产数据库 |
| **Redis** (7+) | 缓存/队列 (可选) |

### 外部服务

| 服务 | 用途 | 是否必须 |
|------|------|----------|
| **WalletConnect Cloud** | Web3 钱包连接 Project ID | 是 (Web3 功能) |
| **Stripe Account** | 法币支付 | 是 (支付功能) |
| **Alchemy/Infura RPC** | Base L2 RPC 节点 | 推荐 |
| **IPFS Node** | 认知状态根存储 | 可选 |

---

## 2. 本地开发环境搭建

### 2.1 克隆项目

```bash
git clone <repository-url> bb-protocol
cd bb-protocol
```

### 2.2 安装依赖

```bash
# 使用 Bun 安装 (推荐)
bun install

# 或使用 npm
npm install
```

### 2.3 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入必要配置
# 最小开发配置:
```

最小 `.env` 配置:

```env
# 数据库
DATABASE_URL="file:./db/custom.db"

# NextAuth
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Web3 (可选，不填则 Web3 功能降级)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=""
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"

# Stripe (可选，不填则支付功能使用模拟)
STRIPE_SECRET_KEY="sk_test_placeholder"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_placeholder"
```

### 2.4 初始化数据库

```bash
# 推送 Prisma Schema 到 SQLite
bun run db:push

# 生成 Prisma Client
bun run db:generate

# (可选) 填充种子数据
curl -X POST http://localhost:3000/api/seed
```

### 2.5 启动开发服务器

```bash
# 启动 Next.js 开发服务器 (端口 3000)
bun run dev

# 在另一个终端启动微服务 (可选)
cd mini-services/resonance-sim && bun run dev    # 端口 3003
cd mini-services/monitoring-sim && bun run dev    # 端口 3004
cd mini-services/ifd-calculator && bun run dev    # 端口 3005
cd mini-services/ece-oracle && bun run dev        # 端口 3006
cd mini-services/poue-prover && bun run dev       # 端口 3007
cd mini-services/mcp-router && bun run dev        # 端口 3008
```

或使用便捷脚本:

```bash
bash start-services.sh
```

### 2.6 验证

```bash
# 检查主应用健康状态
curl http://localhost:3000/api/health

# 检查微服务状态
curl http://localhost:3003/health   # resonance-sim
curl http://localhost:3004/health   # monitoring-sim

# 代码质量检查
bun run lint
```

### 2.7 Caddy 网关 (可选)

如果需要通过 Caddy 网关统一访问:

```bash
# 启动 Caddy (需要先安装)
caddy run --config Caddyfile

# 访问: http://localhost:81
# 微服务访问: http://localhost:81/api/health?XTransformPort=3004
```

---

## 3. Docker 部署

### 3.1 构建镜像

```bash
# 构建主应用镜像
docker build -t bb-protocol:latest .

# 构建微服务镜像
docker build -f mini-services/resonance-sim/Dockerfile -t bb-resonance-sim:latest .
docker build -f mini-services/monitoring-sim/Dockerfile -t bb-monitoring-sim:latest .
```

### 3.2 Docker Compose 启动

```bash
# 启动核心服务 (主应用 + resonance-sim + monitoring-sim + Caddy)
docker compose up -d

# 启动所有服务 (包含引擎微服务)
docker compose --profile engine up -d

# 查看运行状态
docker compose ps

# 查看日志
docker compose logs -f app
docker compose logs -f resonance-sim
```

### 3.3 Docker Compose 服务映射

| 服务 | 容器名 | 端口 | Profile |
|------|--------|------|---------|
| app | cognitive-avatar-app | 3000 | default |
| resonance-sim | cognitive-avatar-resonance-sim | 3003 | default |
| monitoring-sim | cognitive-avatar-monitoring-sim | 3004 | default |
| ifd-calculator | cognitive-avatar-ifd-calculator | 3005 | engine |
| ece-oracle | cognitive-avatar-ece-oracle | 3006 | engine |
| poue-prover | cognitive-avatar-poue-prover | 3007 | engine |
| mcp-router | cognitive-avatar-mcp-router | 3008 | engine |
| caddy | cognitive-avatar-caddy | 80/443 | default |

### 3.4 自定义环境变量

创建 `.env` 文件或直接在 `docker-compose.yml` 中修改:

```yaml
environment:
  - DATABASE_URL=file:./db/production.db
  - NEXTAUTH_SECRET=your-production-secret
  - NEXTAUTH_URL=https://your-domain.com
  - STRIPE_SECRET_KEY=sk_live_xxxxx
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
  - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxxxx
  - NEXT_PUBLIC_CHAIN_ID=8453
  - NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

### 3.5 数据持久化

Docker Compose 使用 named volumes 持久化数据:

```bash
# 查看卷
docker volume ls | grep cognitive

# 备份数据库
docker cp cognitive-avatar-app:/app/db/production.db ./backup-$(date +%Y%m%d).db

# 恢复数据库
docker cp ./backup-20260305.db cognitive-avatar-app:/app/db/production.db
docker compose restart app
```

### 3.6 停止服务

```bash
# 停止所有服务
docker compose --profile engine down

# 停止并删除数据卷 (⚠️ 危险操作)
docker compose --profile engine down -v
```

---

## 4. Vercel 部署

### 4.1 前置条件

- Vercel 账号
- GitHub/GitLab 仓库关联
- Vercel CLI (可选)

### 4.2 部署步骤

1. **Fork 或 Push 项目到 GitHub**

2. **在 Vercel Dashboard 中导入项目**

3. **配置构建设置**:
   - Framework Preset: `Next.js`
   - Build Command: `bun run build`
   - Output Directory: `.next`
   - Install Command: `bun install`

4. **配置环境变量** (在 Vercel Dashboard → Settings → Environment Variables):

   | Key | Value | Environment |
   |-----|-------|-------------|
   | `DATABASE_URL` | PostgreSQL 连接串 | Production |
   | `NEXTAUTH_SECRET` | 随机密钥 | All |
   | `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |
   | `STRIPE_SECRET_KEY` | `sk_live_xxxxx` | Production |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxxxx` | All |
   | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | 你的 Project ID | All |
   | `NEXT_PUBLIC_CHAIN_ID` | `8453` | All |
   | `NEXT_PUBLIC_RPC_URL` | `https://mainnet.base.org` | All |

5. **部署**:
   ```bash
   # 使用 Vercel CLI
   vercel --prod
   ```

### 4.3 Vercel 限制

| 限制项 | 说明 | 影响 |
|--------|------|------|
| Serverless Functions | 执行时间限制 10s (Pro: 60s) | 长时间轮询 API 需要优化 |
| 无 WebSocket 支持 | Vercel 不支持持久连接 | Socket.IO 微服务需外部托管 |
| SQLite 不可用 | Serverless 无持久文件系统 | 必须使用 PostgreSQL |
| 构建时间 | 大型项目构建较慢 | 33 动态导入组件可能增加构建时间 |

### 4.4 微服务外部托管

由于 Vercel 不支持 WebSocket，微服务需要单独部署:

```bash
# 在 Railway / Fly.io / Render 上部署微服务
# 然后在前端通过 XTransformPort 路由到外部服务
```

在 Vercel 部署时，需要将 Caddy 网关替换为 Vercel 的 `vercel.json` rewrites:

```json
{
  "rewrites": [
    {
      "source": "/api/engine/:path*",
      "destination": "https://your-engine-service.com/:path*"
    }
  ]
}
```

---

## 5. 自托管 VPS 部署 (Ubuntu)

### 5.1 服务器准备

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装基础依赖
sudo apt install -y curl git build-essential

# 安装 Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# 安装 PostgreSQL (生产环境)
sudo apt install -y postgresql postgresql-contrib
```

### 5.2 PostgreSQL 配置

```bash
# 创建数据库用户和数据库
sudo -u postgres psql
CREATE USER bbprotocol WITH PASSWORD 'your-secure-password';
CREATE DATABASE bbprotocol_prod OWNER bbprotocol;
GRANT ALL PRIVILEGES ON DATABASE bbprotocol_prod TO bbprotocol;
\q
```

### 5.3 部署项目

```bash
# 创建部署目录
sudo mkdir -p /opt/bb-protocol
sudo chown $USER:$USER /opt/bb-protocol

# 克隆项目
cd /opt/bb-protocol
git clone <repository-url> .

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env，配置 PostgreSQL 连接串等
```

`.env` 生产配置:

```env
DATABASE_URL="postgresql://bbprotocol:your-secure-password@localhost:5432/bbprotocol_prod"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="https://your-domain.com"
STRIPE_SECRET_KEY="sk_live_xxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxxxx"
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="xxxxx"
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL="https://mainnet.base.org"
```

### 5.4 构建与启动

```bash
# 推送 Prisma Schema 到 PostgreSQL
bun run db:push

# 生成 Prisma Client
bun run db:generate

# 构建项目
bun run build

# 启动生产服务器
NODE_ENV=production bun .next/standalone/server.js
```

### 5.5 Systemd 服务配置

创建 `/etc/systemd/system/bb-protocol.service`:

```ini
[Unit]
Description=BB Protocol Next.js Application
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=bbprotocol
Group=bbprotocol
WorkingDirectory=/opt/bb-protocol
ExecStart=/root/.bun/bin/bun .next/standalone/server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

# 安全加固
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/bb-protocol/db /opt/bb-protocol/.next

[Install]
WantedBy=multi-user.target
```

创建微服务 systemd 文件 (以 resonance-sim 为例) `/etc/systemd/system/bb-resonance-sim.service`:

```ini
[Unit]
Description=BB Protocol Resonance Simulation Service
After=network.target

[Service]
Type=simple
User=bbprotocol
Group=bbprotocol
WorkingDirectory=/opt/bb-protocol/mini-services/resonance-sim
ExecStart=/root/.bun/bin/bun run dev
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3003

[Install]
WantedBy=multi-user.target
```

启用并启动服务:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bb-protocol bb-resonance-sim bb-monitoring-sim
sudo systemctl start bb-protocol bb-resonance-sim bb-monitoring-sim

# 查看状态
sudo systemctl status bb-protocol
```

### 5.6 Caddy 生产配置

编辑 `/etc/caddy/Caddyfile`:

```
your-domain.com {
    # 微服务路由
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

    # 主应用路由
    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }

    # 压缩
    encode gzip

    # 安全头
    header {
        X-Frame-Options DENY
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://mainnet.base.org https://sepolia.base.org wss:"
    }

    # 日志
    log {
        output file /var/log/caddy/bb-protocol-access.log {
            roll_size 100mb
            roll_keep 10
        }
    }
}
```

重启 Caddy:

```bash
sudo systemctl reload caddy
```

Caddy 会自动为你的域名申请 Let's Encrypt SSL 证书。

### 5.7 防火墙配置

```bash
# 只开放必要端口
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable

# 内部端口不需要开放 (3000, 3003-3008)
# 它们通过 Caddy 反向代理访问
```

---

## 6. 环境变量参考表

### 核心配置

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | `file:./db/custom.db` | Prisma 数据库连接串 |
| `NEXTAUTH_SECRET` | ✅ | - | NextAuth 加密密钥 (生产环境必须更改) |
| `NEXTAUTH_URL` | ✅ | `http://localhost:3000` | NextAuth 回调 URL |
| `NODE_ENV` | ✅ | `development` | 运行环境 |

### Web3 配置

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | 推荐 | - | WalletConnect Cloud Project ID |
| `NEXT_PUBLIC_CHAIN_ID` | 否 | `8453` | 链 ID (8453=Base, 84532=Base Sepolia) |
| `NEXT_PUBLIC_RPC_URL` | 否 | `https://mainnet.base.org` | RPC 节点 URL |

### Stripe 配置

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `STRIPE_SECRET_KEY` | 支付功能 | `sk_test_placeholder` | Stripe 密钥 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 支付功能 | `pk_test_placeholder` | Stripe 公钥 |
| `STRIPE_STARTER_PRICE_ID` | 否 | `price_starter_placeholder` | Starter 订阅 Price ID |
| `STRIPE_PRO_PRICE_ID` | 否 | `price_pro_placeholder` | Pro 订阅 Price ID |
| `STRIPE_ENTERPRISE_PRICE_ID` | 否 | `price_enterprise_placeholder` | Enterprise 订阅 Price ID |
| `STRIPE_WEBHOOK_SECRET` | Webhook | - | Stripe Webhook 签名密钥 |

### 应用配置

| 变量名 | 必需 | 默认值 | 描述 |
|--------|------|--------|------|
| `PORT` | 否 | `3000` | 主应用端口 |
| `CORS_ORIGIN` | 否 | `http://localhost:3000` | 微服务 CORS 来源 |

### 环境变量生成

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成 Stripe Webhook Secret (在 Stripe Dashboard 中获取)
# 格式: whsec_xxxxxxxxxxxxx
```

---

## 7. 数据库配置

### 7.1 SQLite (开发环境)

SQLite 是默认数据库，零配置:

```env
DATABASE_URL="file:./db/custom.db"
```

```bash
bun run db:push      # 推送 Schema
bun run db:generate   # 生成 Client
```

### 7.2 PostgreSQL (生产环境)

#### Step 1: 修改 Prisma 配置

编辑 `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Step 2: 部分字段类型需要调整

SQLite 和 PostgreSQL 的类型差异:

| SQLite 类型 | PostgreSQL 类型 | 需要修改的模型字段 |
|-------------|-----------------|-------------------|
| `String` (JSON) | `Json` | Invoice.lineItems, Invoice.metadata, FeatureFlagRecord.targetingRules, ABTestRecord.variants, ApiKeyRecord.permissions, WebhookRecord.events |
| `Float` | `Decimal` 或 `Float` | 所有金额字段 (建议使用 `Decimal` 提高精度) |
| `String` (DateTime) | `DateTime` | 已兼容，无需修改 |

建议修改:

```prisma
// 将 JSON 字符串改为 Json 类型
model Invoice {
  lineItems  Json    // 替换 String
  metadata   Json?   // 替换 String
}

model FeatureFlagRecord {
  targetingRules Json?  // 替换 String
}

// 金额字段使用 Decimal
model Revenue {
  totalAmount   Decimal  // 替换 Float
  humanShare    Decimal
  avatarShare   Decimal
  protocolShare Decimal
}
```

#### Step 3: 创建迁移

```bash
# 创建迁移文件
bun run db:migrate -- --name migrate-to-postgresql

# 应用迁移
bun run db:push
```

#### Step 4: 数据迁移 (从 SQLite 到 PostgreSQL)

```bash
# 1. 导出 SQLite 数据
sqlite3 db/custom.db ".dump" > data_dump.sql

# 2. 使用 pgloader 迁移 (推荐)
# 安装 pgloader
sudo apt install pgloader

# 执行迁移
pgloader sqlite:///path/to/custom.db postgresql://user:pass@localhost:5432/bbprotocol_prod
```

### 7.3 数据库连接池 (生产推荐)

使用 PgBouncer 进行连接池管理:

```bash
sudo apt install pgbouncer
```

配置 `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
bbprotocol_prod = host=127.0.0.1 port=5432 dbname=bbprotocol_prod

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
reserve_pool_size = 5
listen_addr = 127.0.0.1
listen_port = 6432
```

更新 `.env`:

```env
DATABASE_URL="postgresql://bbprotocol:password@127.0.0.1:6432/bbprotocol_prod"
```

---

## 8. Stripe 配置

### 8.1 创建 Stripe 账号

1. 访问 [https://stripe.com](https://stripe.com) 注册账号
2. 完成商家验证 (KYC)

### 8.2 获取 API 密钥

1. 进入 Stripe Dashboard → Developers → API Keys
2. 复制 **Publishable Key** (`pk_test_...` / `pk_live_...`)
3. 复制 **Secret Key** (`sk_test_...` / `sk_live_...`)

### 8.3 创建产品和价格

在 Stripe Dashboard 中创建 3 个订阅产品:

| 产品 | 价格 | 周期 | Price ID 用途 |
|------|------|------|---------------|
| BB Protocol Starter | $9.99 | 月付 | `STRIPE_STARTER_PRICE_ID` |
| BB Protocol Pro | $29.99 | 月付 | `STRIPE_PRO_PRICE_ID` |
| BB Protocol Enterprise | $99.99 | 月付 | `STRIPE_ENTERPRISE_PRICE_ID` |

或使用 Stripe CLI 创建:

```bash
# 安装 Stripe CLI
stripe login

# 创建产品
stripe products create --name="BB Protocol Starter" --description="5 Avatar calls/day, Basic skill pack"
stripe prices create --product=prod_xxx --unit-amount=999 --currency=usd --recurring[interval]=month
```

### 8.4 配置 Webhook

1. 进入 Stripe Dashboard → Developers → Webhooks
2. 添加端点: `https://your-domain.com/api/stripe/webhook`
3. 选择监听事件:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. 复制 **Signing Secret** (`whsec_...`) 到 `STRIPE_WEBHOOK_SECRET`

### 8.5 本地 Webhook 测试

```bash
# 安装 Stripe CLI
stripe login

# 转发 Webhook 到本地
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 触发测试事件
stripe trigger checkout.session.completed
```

### 8.6 测试卡号

| 卡号 | 场景 |
|------|------|
| `4242 4242 4242 4242` | 支付成功 |
| `4000 0025 0000 3155` | 需要 3DS 验证 |
| `4000 0000 0000 0002` | 支付被拒绝 |
| `4000 0000 0000 3220` | 3DS 验证 + 拒绝 |

---

## 9. Web3 / WalletConnect 配置

### 9.1 获取 WalletConnect Project ID

1. 访问 [https://cloud.walletconnect.com](https://cloud.walletconnect.com)
2. 创建新项目
3. 复制 Project ID

### 9.2 配置链

项目支持两条链:

| 链 | Chain ID | RPC URL | 用途 |
|------|---------|---------|------|
| Base Mainnet | 8453 | `https://mainnet.base.org` | 生产环境 |
| Base Sepolia | 84532 | `https://sepolia.base.org` | 测试环境 |

### 9.3 合约部署 (Foundry)

```bash
# 安装 Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 进入合约目录
cd contracts

# 安装依赖
forge install

# 编译合约
forge build

# 部署到 Base Sepolia (测试网)
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast

# 部署到 Base Mainnet (主网)
forge script script/Deploy.s.sol --rpc-url https://mainnet.base.org --broadcast --private-key $PRIVATE_KEY
```

### 9.4 更新合约地址

部署完成后，更新 `src/lib/web3-config.ts` 中的 `CONTRACT_ADDRESSES`:

```typescript
export const CONTRACT_ADDRESSES = {
  avatarCore: '0xYourDeployedAddress' as Address,
  dynamicSplitter: '0xYourDeployedAddress' as Address,
  circuitGuard: '0xYourDeployedAddress' as Address,
  skillVault: '0xYourDeployedAddress' as Address,
  ifdRouter: '0xYourDeployedAddress' as Address,
  tokenVault: '0xYourDeployedAddress' as Address,
  eceOracle: '0xYourDeployedAddress' as Address,
  afcToken: '0xYourDeployedAddress' as Address,
  governance: '0xYourDeployedAddress' as Address,
  proxyAdmin: '0xYourDeployedAddress' as Address,
} as const;
```

### 9.5 RPC 节点推荐

| 提供商 | 免费额度 | 推荐度 |
|--------|----------|--------|
| Base 官方 RPC | 无限 | ⭐⭐⭐ |
| Alchemy | 300M CU/月 | ⭐⭐⭐⭐ |
| Infura | 100K 请求/天 | ⭐⭐⭐ |
| QuickNode | 免费层可用 | ⭐⭐⭐⭐ |

---

## 10. 生产加固检查清单

### 🔒 安全

- [ ] **NEXTAUTH_SECRET** 使用强随机密钥 (`openssl rand -base64 32`)
- [ ] **Stripe Secret Key** 使用 `sk_live_` 而非 `sk_test_`
- [ ] **数据库连接** 使用 SSL/TLS (`?sslmode=require`)
- [ ] **API 认证** 实现中间件鉴权 (目前所有 API 无认证保护)
- [ ] **CORS 配置** 限制允许的来源域名
- [ ] **速率限制** 实现 API Rate Limiting
- [ ] **输入验证** 所有 POST/PATCH 端点添加 Zod Schema 验证
- [ ] **CSRF 保护** 启用 NextAuth CSRF Token
- [ ] **安全头** Caddy 配置 CSP, X-Frame-Options, HSTS
- [ ] **合约地址** 替换硬编码的本地 Foundry 地址
- [ ] **私钥管理** 使用 KMS 或密钥管理服务 (AWS KMS, HashiCorp Vault)
- [ ] **依赖审计** 运行 `bun audit` 检查已知漏洞

### ⚡ 性能

- [ ] **数据库迁移** 从 SQLite 迁移到 PostgreSQL
- [ ] **连接池** 配置 PgBouncer
- [ ] **CDN** 配置 CloudFront / Cloudflare
- [ ] **缓存策略** 实现 ISR (Incremental Static Regeneration)
- [ ] **图片优化** 使用 Next.js Image 组件 + WebP 格式
- [ ] **Bundle 分析** 运行 `@next/bundle-analyzer` 检查包体积
- [ ] **Gzip/Brotli** 启用 Caddy 压缩
- [ ] **HTTP/2** Caddy 默认支持

### 🏗️ 基础设施

- [ ] **HTTPS** Caddy 自动配置 Let's Encrypt
- [ ] **防火墙** 仅开放 80/443 端口
- [ ] **日志收集** 配置结构化日志输出
- [ ] **健康检查** 配置 `/api/health` 监控告警
- [ ] **自动重启** systemd `Restart=on-failure`
- [ ] **日志轮转** 配置 logrotate
- [ ] **磁盘监控** 设置磁盘使用率告警
- [ ] **内存监控** 设置 OOM 告警

### 📊 可观测性

- [ ] **APM** 接入 Application Performance Monitoring
- [ ] **错误追踪** 接入 Sentry
- [ ] **日志聚合** 接入 ELK / Loki
- [ ] **指标监控** 接入 Prometheus + Grafana
- [ ] **正常运行时间** 配置 UptimeRobot / Better Stack

---

## 11. 监控与日志

### 11.1 应用日志

```bash
# 查看应用日志 (Docker)
docker compose logs -f app --tail=100

# 查看应用日志 (systemd)
sudo journalctl -u bb-protocol -f

# 查看 Caddy 访问日志
sudo tail -f /var/log/caddy/bb-protocol-access.log
```

### 11.2 健康检查

```bash
# 主应用健康检查
curl -s http://localhost:3000/api/health | jq

# 微服务健康检查
for port in 3003 3004 3005 3006 3007 3008; do
  echo "Port $port: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health)"
done
```

### 11.3 Stripe Webhook 日志

Stripe Webhook 事件会记录到控制台:

```bash
# 查看包含 Stripe 事件的日志
docker compose logs -f app | grep -i stripe
```

### 11.4 Prometheus 指标 (推荐)

安装 Prometheus + Grafana:

```bash
# Docker Compose 添加 Prometheus 服务
# 在 docker-compose.yml 中添加:

  prometheus:
    image: prom/prometheus:latest
    container_name: bb-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - internal

  grafana:
    image: grafana/grafana:latest
    container_name: bb-grafana
    ports:
      - "3001:3000"
    networks:
      - internal
```

### 11.5 错误追踪 (Sentry)

```bash
# 安装 Sentry SDK
bun add @sentry/nextjs

# 配置 sentry.client.config.ts
# 配置 sentry.server.config.ts
# 配置 next.config.ts 中的 Sentry Webpack 插件
```

---

## 12. 备份与恢复

### 12.1 SQLite 备份 (开发环境)

```bash
# 备份
cp db/custom.db "backups/custom-$(date +%Y%m%d-%H%M%S).db"

# 或使用 SQLite 在线备份
sqlite3 db/custom.db ".backup 'backups/custom-$(date +%Y%m%d).db'"
```

### 12.2 PostgreSQL 备份 (生产环境)

```bash
# 全量备份
pg_dump -U bbprotocol -F c bbprotocol_prod > "backups/bb-$(date +%Y%m%d).dump"

# 仅数据备份
pg_dump -U bbprotocol --data-only bbprotocol_prod > "backups/bb-data-$(date +%Y%m%d).sql"

# 自动化每日备份 (crontab)
crontab -e
# 添加: 0 2 * * * pg_dump -U bbprotocol -F c bbprotocol_prod > /opt/bb-protocol/backups/bb-$(date +\%Y\%m\%d).dump
```

### 12.3 恢复

```bash
# SQLite 恢复
cp backups/custom-20260305.db db/custom.db

# PostgreSQL 恢复
pg_restore -U bbprotocol -d bbprotocol_prod backups/bb-20260305.dump

# Docker 环境
docker cp backups/bb-20260305.dump cognitive-avatar-app:/tmp/
docker exec cognitive-avatar-app pg_restore -U bbprotocol -d bbprotocol_prod /tmp/bb-20260305.dump
```

### 12.4 备份保留策略

| 备份类型 | 频率 | 保留时间 | 存储位置 |
|----------|------|----------|----------|
| 每日全量 | 每天 02:00 | 7 天 | 本地 + S3 |
| 每周全量 | 每周日 03:00 | 4 周 | S3 |
| 每月全量 | 每月 1 日 04:00 | 12 月 | S3 Glacier |

### 12.5 S3 备份上传

```bash
# 安装 AWS CLI
sudo apt install awscli

# 配置 AWS 凭证
aws configure

# 上传备份
aws s3 cp backups/bb-$(date +%Y%m%d).dump s3://your-bucket/bb-protocol/backups/

# 自动化上传 (添加到 crontab)
# 0 3 * * * aws s3 cp /opt/bb-protocol/backups/bb-$(date +\%Y\%m\%d).dump s3://your-bucket/bb-protocol/backups/
```

---

## 13. 常见问题排查

### 13.1 应用启动失败

**症状**: `bun run dev` 报错

```bash
# 检查 Node/Bun 版本
bun --version   # 应 >= 1.1.0
node --version  # 应 >= 18.x

# 清除缓存重新安装
rm -rf node_modules bun.lock
bun install

# 检查 Prisma Client
bun run db:generate
```

### 13.2 数据库连接失败

**症状**: `P1001: Can't reach database server`

```bash
# SQLite: 检查文件路径
ls -la db/custom.db

# PostgreSQL: 检查连接
psql -U bbprotocol -h localhost -d bbprotocol_prod

# 检查 DATABASE_URL 格式
# SQLite:    file:./db/custom.db
# PostgreSQL: postgresql://user:pass@host:5432/dbname
```

### 13.3 Hydration 不匹配

**症状**: 控制台报 `Text content did not match`

**原因**: 组件中使用 `new Date()` 导致服务端/客户端时间不同

**解决**: 项目已实现 `useClientTime()` hook 修复此问题。如果在新组件中遇到，使用:

```typescript
import { useClientTime } from '@/hooks/use-client-time';

function MyComponent() {
  const now = useClientTime();
  // now 在 SSR 时为 null，客户端渲染后为 Date 对象
  const relativeTime = now ? getRelativeTime(timestamp, now) : '...';
  return <span suppressHydrationWarning>{relativeTime}</span>;
}
```

### 13.4 微服务连接失败

**症状**: Engine Status 显示 0/6 连接

```bash
# 检查微服务是否运行
curl http://localhost:3003/health   # resonance-sim
curl http://localhost:3004/health   # monitoring-sim

# 手动启动微服务
cd mini-services/resonance-sim && bun run dev

# 检查端口占用
lsof -i :3003
lsof -i :3004

# Socket.IO 连接使用 Caddy 网关
# 前端: io("/?XTransformPort=3003")
# 禁止: io("http://localhost:3003")
```

### 13.5 Stripe 支付失败

**症状**: 支付弹窗无响应或报错

```bash
# 检查 Stripe Key 是否配置
echo $STRIPE_SECRET_KEY

# 测试 Stripe API 连接
curl https://api.stripe.com/v1/balance \
  -u sk_test_your_key:

# 检查 Webhook 配置
stripe webhooks list

# 本地测试 Webhook
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

### 13.6 Web3 钱包连接问题

**症状**: 点击 Connect 无反应

```bash
# 检查 WalletConnect Project ID
echo $NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

# 检查 RPC 节点
curl -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# 检查浏览器控制台错误
# 常见问题: CORS 配置、Project ID 无效
```

### 13.7 内存不足

**症状**: 服务 OOM Killed

```bash
# 检查内存使用
free -h
docker stats

# 解决方案:
# 1. 减少微服务数量 (仅运行核心服务: resonance-sim + monitoring-sim)
# 2. 限制 Node.js 内存
NODE_OPTIONS="--max-old-space-size=512" bun run dev

# 3. Docker 内存限制
# 在 docker-compose.yml 中添加:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### 13.8 Docker 构建失败

**症状**: `docker build` 报错

```bash
# 清除 Docker 缓存
docker builder prune -a

# 重新构建 (不使用缓存)
docker build --no-cache -t bb-protocol:latest .

# 检查磁盘空间
df -h

# 增加 Docker 磁盘配额 (Docker Desktop → Settings → Resources)
```

### 13.9 Prisma Migration 失败

**症状**: `db:push` 或 `db:migrate` 报错

```bash
# 重置数据库 (⚠️ 会删除所有数据)
bun run db:reset

# 检查 Schema 语法
npx prisma validate

# 查看迁移状态
npx prisma migrate status

# 手动解决迁移冲突
npx prisma migrate resolve --applied <migration_name>
```

### 13.10 Caddy 网关 502 错误

**症状**: 通过 Caddy 访问返回 502

```bash
# 检查后端服务是否运行
curl http://localhost:3000/api/health

# 检查 Caddy 配置
caddy validate --config Caddyfile

# 查看 Caddy 日志
sudo journalctl -u caddy -f

# 常见原因: 后端服务未启动 / 端口不匹配
```

---

## 附录 A: 端口分配表

| 端口 | 服务 | 协议 | 说明 |
|------|------|------|------|
| 3000 | Next.js App | HTTP | 主应用 |
| 3001 | Grafana | HTTP | 监控面板 (可选) |
| 3003 | resonance-sim | Socket.IO | 共振分模拟 |
| 3004 | monitoring-sim | Socket.IO | 监控模拟 |
| 3005 | ifd-calculator | HTTP | IFD 计算引擎 |
| 3006 | ece-oracle | HTTP | 情绪共识预言机 |
| 3007 | poue-prover | HTTP | 理解力证明 |
| 3008 | mcp-router | HTTP | MCP 路由器 |
| 5432 | PostgreSQL | TCP | 数据库 (生产) |
| 6432 | PgBouncer | TCP | 连接池 (生产) |
| 81 | Caddy (开发) | HTTP | 开发网关 |
| 80/443 | Caddy (生产) | HTTP/HTTPS | 生产网关 |
| 9090 | Prometheus | HTTP | 指标收集 (可选) |

## 附录 B: 快速命令参考

```bash
# ── 开发 ──────────────────────────────
bun run dev                    # 启动开发服务器
bun run lint                   # 代码质量检查
bun run db:push                # 推送 Schema 到数据库
bun run db:generate            # 生成 Prisma Client

# ── 生产 ──────────────────────────────
bun run build                  # 构建生产版本
NODE_ENV=production bun .next/standalone/server.js  # 启动生产服务器

# ── Docker ────────────────────────────
docker compose up -d           # 启动所有服务
docker compose logs -f app     # 查看应用日志
docker compose down            # 停止所有服务

# ── 数据库 ────────────────────────────
pg_dump -U bbprotocol -F c bbprotocol_prod > backup.dump    # 备份
pg_restore -U bbprotocol -d bbprotocol_prod backup.dump      # 恢复

# ── 健康检查 ──────────────────────────
curl http://localhost:3000/api/health                        # 主应用
for p in 3003 3004 3005 3006 3007 3008; do curl -s localhost:$p/health; done  # 微服务
```
