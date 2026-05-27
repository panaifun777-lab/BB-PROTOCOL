# BB Protocol 认知分身协议 — 全环境专业部署指南

---

> **文档版本**: v5.0.0  
> **最后更新**: 2026-03-05  
> **维护团队**: BB Protocol Core Team  
> **适用范围**: 开发环境 / 预发布 / 生产环境  
> **技术栈**: Next.js 16.1.3 + React 19 + Bun + Prisma + SQLite  
> **区块链**: Base L2 (Chain ID: 8453) — 10 Solidity Contracts  
> **微服务**: 6 services — Resonance-Sim / Monitoring-Sim / IFD-Calculator / ECE-Oracle / POUE-Prover / MCP-Router  
> **国际化**: 8 languages (zh, en, ja, ko, es, fr, de, ar)  
> **支付**: Stripe + x402 双轨支付  

---

**⚠️ 安全警告**: 本文档包含生产环境密钥配置说明。请务必将所有 `CHANGE_ME` 占位符替换为安全随机值，且绝不要将 `.env` 文件提交到版本控制系统。

---

## 目录

1. [专业封面与文档元数据](#1-专业封面与文档元数据)
2. [Quick Start 快速开始 — 5分钟评估部署](#2-quick-start-快速开始)
3. [本地开发环境部署](#3-本地开发环境部署)
4. [Docker Compose 单机部署](#4-docker-compose-单机部署)
5. [Vercel Serverless 部署](#5-vercel-serverless-部署)
6. [VPS/云服务器部署 — Nginx + PM2 + SSL](#6-vps云服务器部署)
7. [AWS (ECS/Fargate) 部署](#7-aws-ecsfargate-部署)
8. [Google Cloud Platform (Cloud Run) 部署](#8-google-cloud-platform-cloud-run-部署)
9. [Microsoft Azure (App Service) 部署](#9-microsoft-azure-app-service-部署)
10. [Kubernetes (K8s) 生产级编排](#10-kubernetes-k8s-生产级编排)
11. [Terraform IaC 基础设施编排](#11-terraform-iac-基础设施编排)
12. [GitHub Actions CI/CD 流水线](#12-github-actions-cicd-流水线)
13. [数据库管理](#13-数据库管理)
14. [Stripe 支付配置](#14-stripe-支付配置)
15. [Web3 配置](#15-web3-配置)
16. [微服务部署与健康监控](#16-微服务部署与健康监控)
17. [监控与可观测性](#17-监控与可观测性)
18. [安全加固](#18-安全加固)
19. [备份与灾难恢复](#19-备份与灾难恢复)
20. [扩缩容策略](#20-扩缩容策略)
21. [故障排查指南](#21-故障排查指南)
22. [常见问题 (FAQ)](#22-常见问题-faq)

---

## 1. 专业封面与文档元数据

### 1.1 项目概览

| 项目属性 | 值 |
|---------|---|
| **项目名称** | BB Protocol 认知分身协议 |
| **代码仓库** | `github.com/your-org/bb-protocol` |
| **主框架** | Next.js 16.1.3 + Turbopack |
| **前端** | React 19 + Zustand 5 + TanStack Query 5 |
| **运行时** | Bun 1.1.38 (primary) / Node.js 20+ (fallback) |
| **ORM** | Prisma 6.x + SQLite |
| **UI 组件** | shadcn/ui + Radix UI + Tailwind CSS 4 |
| **Web3** | ConnectKit 1.9 + Wagmi 3 + viem 2.x (Base L2) |
| **支付** | Stripe 22.x + x402 双轨 |
| **实时通信** | Socket.IO 4.8 + Caddy XTransformPort Gateway |
| **合约** | 10 Solidity Contracts on Base L2 (8453) |
| **语言支持** | 8 languages (zh/en/ja/ko/es/fr/de/ar) |

### 1.2 系统架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                     用户浏览器 (Client)                           │
│          React 19 + Zustand + TanStack Query + ConnectKit        │
│                   8 languages i18n support                       │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS / WSS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              Caddy 反向代理网关 (:81 / :80 / :443)                │
│         XTransformPort 路由 → 后端微服务 Socket.IO                │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      │
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐        │
│App   ││Reson ││Monit ││IFD   ││ECE   ││PoUE  ││MCP   │        │
│:3000 ││:3003 ││:3004 ││:3005 ││:3006 ││:3007 ││:3008 │        │
│Next16││Sim   ││Sim   ││Calc  ││Oracle││Prover││Router│        │
│Bun   ││Bun   ││Bun   ││Bun   ││Bun   ││Bun   ││Bun   │        │
└──┬───┘└──────┘└──────┘└──────┘└──────┘└──────┘└──────┘        │
   │   WebSocket 广播: 3-30s 间隔                                │
   ▼                                                             │
┌──────────┐     ┌──────────────┐     ┌──────────────┐          │
│ SQLite   │     │ Stripe API   │     │ Base L2 RPC  │◄─────────┘
│ Prisma   │     │ + x402 Pay   │     │ 10 Contracts │
└──────────┘     └──────────────┘     └──────────────┘
```

### 1.3 服务端口映射

| 端口 | 服务名称 | 说明 | 技术栈 | 协议 | 依赖级别 |
|------|---------|------|--------|------|---------|
| 3000 | App (主应用) | Next.js 16 前端 + API | Next.js / Bun | HTTP | **必须** |
| 3003 | Resonance-Sim | 情绪共振模拟引擎 | Socket.IO / Bun | WebSocket | 推荐 |
| 3004 | Monitoring-Sim | 系统监控模拟服务 | Socket.IO / Bun | WebSocket | 推荐 |
| 3005 | IFD-Calculator | 流体民主权重计算引擎 | Socket.IO / Bun | WebSocket | 可选 |
| 3006 | ECE-Oracle | 情绪共识预言机 | Socket.IO / Bun | WebSocket | 可选 |
| 3007 | POUE-Prover | 认知理解证明引擎 | Socket.IO / Bun | WebSocket | 可选 |
| 3008 | MCP-Router | 模型上下文协议路由 | Socket.IO / Bun | WebSocket | 可选 |
| 81 | Caddy Gateway | 反向代理网关 | Caddy | HTTP/WS | **必须** |

### 1.4 最低硬件要求

| 环境 | CPU | 内存 | 磁盘 | 网络 | 月成本估算 |
|------|-----|------|------|------|-----------|
| 开发环境 | 2 核 | 4 GB | 10 GB SSD | 5 Mbps | $0 (本地) |
| 预发布 | 2 核 | 4 GB | 20 GB SSD | 10 Mbps | ~$20-40 |
| 生产 (VPS) | 4 核 | 8 GB | 50 GB SSD | 50 Mbps | ~$40-80 |
| 生产 (AWS ECS) | 2×512 CPU | 2×1GB | RDS 50GB | ALB | ~$200-500 |
| 生产 (K8s) | 4+ 核 | 8+ GB | PV 100GB | LB | ~$300-800 |

---

## 2. Quick Start 快速开始

> **目标**: 5 分钟内在本地运行 BB Protocol，快速评估功能。

### 2.1 前提条件

```bash
# 确保已安装 Bun (推荐) 或 Node.js 20+
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 验证安装
bun --version   # >= 1.0.0
node --version  # >= 20.0.0 (可选)
git --version   # >= 2.30
```

### 2.2 一键启动 (5步)

```bash
# Step 1: 克隆仓库
git clone https://github.com/your-org/bb-protocol.git && cd bb-protocol

# Step 2: 安装依赖
bun install

# Step 3: 配置环境变量
cp .env.example .env
# 快速评估仅需修改 NEXTAUTH_SECRET（生产部署需修改所有变量）
sed -i "s/change-me-to-a-secure-random-string-at-least-32-chars/$(openssl rand -base64 32)/" .env

# Step 4: 初始化数据库
bun run db:push && bun run db:generate

# Step 5: 启动开发服务器
bun run dev
```

### 2.3 验证部署

```bash
# 检查主应用
curl -s http://localhost:3000/api/health | jq .

# 预期输出:
# { "status": "ok", "timestamp": "2026-03-05T...", "version": "5.0.0" }

# 浏览器访问
open http://localhost:3000
```

### 2.4 快速启动微服务 (可选)

```bash
# 在新终端窗口中启动核心微服务
bash start-services.sh

# 或单独启动
cd mini-services/resonance-sim && bun run dev &   # 端口 3003
cd mini-services/monitoring-sim && bun run dev &   # 端口 3004
```

> **注意**: 缺少微服务仅影响对应功能模块（如共振波形、监控面板），主应用不会崩溃，会自动 fallback 到 mock 数据。

---

## 3. 本地开发环境部署

### 3.1 概述

本地开发环境支持完整的前后端 + 微服务开发体验，包括热重载、数据库管理、Web3 钱包连接等。

### 3.2 前提条件

| 软件 | 版本要求 | 安装方式 | 验证命令 |
|------|---------|---------|---------|
| Bun | 1.0+ | `curl -fsSL https://bun.sh/install \| bash` | `bun --version` |
| Node.js | 20+ | `nvm install 20` | `node --version` |
| Git | 2.30+ | 系统包管理器 | `git --version` |
| SQLite3 | 3.39+ | 随 Prisma 安装 | `sqlite3 --version` |

**操作系统支持**: macOS 12+ / Ubuntu 22.04+ / Debian 12+ / Windows WSL2

### 3.3 完整安装步骤

```bash
# ── Step 1: 克隆仓库 ─────────────────────────────────────
git clone https://github.com/your-org/bb-protocol.git
cd bb-protocol

# ── Step 2: 安装依赖 ─────────────────────────────────────
bun install

# ── Step 3: 配置环境变量 ─────────────────────────────────
cp .env.example .env

# 必须修改的变量:
# NEXTAUTH_SECRET — 生成方式:
openssl rand -base64 32
# 将输出填入 .env 中的 NEXTAUTH_SECRET

# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID — 从 https://cloud.walletconnect.com 获取

# ── Step 4: 初始化数据库 ─────────────────────────────────
bun run db:push      # 推送 Prisma Schema → SQLite
bun run db:generate  # 生成 Prisma Client

# ── Step 5: 种子数据 ─────────────────────────────────────
# 先启动服务器，然后通过 API 初始化
bun run dev &
sleep 5
curl -X POST http://localhost:3000/api/seed
# 种子数据包含: 3 Avatar / 5 Skill / 收益记录 / 委托 / 时间线 / LP / 合规 / 多链

# ── Step 6: 启动主应用 ───────────────────────────────────
bun run dev
# 访问 http://localhost:3000
```

### 3.4 启动微服务

```bash
# 每个微服务需在独立终端窗口启动:

# 情绪共振模拟 (端口 3003, 广播间隔 6s/15-30s)
cd mini-services/resonance-sim && bun --hot index.ts

# 系统监控模拟 (端口 3004, 广播间隔 3s/10s)
cd mini-services/monitoring-sim && bun --hot index.ts

# IFD 权重计算 (端口 3005, 广播间隔 5s)
cd mini-services/ifd-calculator && bun --hot index.ts

# ECE 预言机 (端口 3006, 广播间隔 3s)
cd mini-services/ece-oracle && bun --hot index.ts

# POUE 证明引擎 (端口 3007, 广播间隔 8s)
cd mini-services/poue-prover && bun --hot index.ts

# MCP 路由 (端口 3008, 广播间隔 7s)
cd mini-services/mcp-router && bun --hot index.ts
```

### 3.5 Caddy 网关 (开发环境)

```bash
# 安装 Caddy (macOS)
brew install caddy

# 安装 Caddy (Ubuntu)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# 启动 Caddy 网关 (端口 81)
caddy run --config Caddyfile
```

### 3.6 验证所有服务

```bash
#!/bin/bash
# health-check.sh — 批量健康检查
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

### 3.7 开发环境故障排查

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 端口被占用 | 旧进程未释放 | `lsof -i :3000` → `kill -9 <PID>` |
| Prisma Client 未生成 | 安装后未运行 generate | `bun run db:generate` |
| 数据库文件损坏 | 异常退出 | `rm -f db/custom.db && bun run db:push` |
| Bun 安装失败 | lockfile 不一致 | `rm -rf node_modules bun.lock && bun install` |
| WebSocket 连接失败 | 未通过 Caddy 网关 | 使用 `io("/?XTransformPort=3003")` 而非 `io("http://localhost:3003")` |
| Hydration mismatch | `new Date()` 在 SSR/Client 不同 | 使用 `useClientTime()` hook |

---

## 4. Docker Compose 单机部署

### 4.1 概述

Docker Compose 适合单服务器部署场景，将所有服务（App + 6 微服务 + Caddy 网关）编排在一台主机上。

### 4.2 前提条件

```bash
# 安装 Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version       # >= 24.0
docker compose version # >= 2.20
```

### 4.3 完整 docker-compose.yml

```yaml
# docker-compose.yml — BB Protocol 生产环境 Docker Compose 配置
version: "3.9"

services:
  # ── Next.js 主应用 ──────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
        VERSION: "5.0.0"
    container_name: bb-protocol-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./db/production.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:?NEXTAUTH_SECRET is required}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-}
      - NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-8453}
      - NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL:-https://mainnet.base.org}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3000}
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

  # ── Resonance-Sim 共振模拟 ──────────────────────────────
  resonance-sim:
    build:
      context: .
      dockerfile: mini-services/resonance-sim/Dockerfile
    container_name: bb-protocol-resonance-sim
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

  # ── Monitoring-Sim 监控模拟 ──────────────────────────────
  monitoring-sim:
    build:
      context: .
      dockerfile: mini-services/monitoring-sim/Dockerfile
    container_name: bb-protocol-monitoring-sim
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

  # ── IFD-Calculator 流体民主引擎 ─────────────────────────
  ifd-calculator:
    build:
      context: ./mini-services/ifd-calculator
      dockerfile: Dockerfile
    container_name: bb-protocol-ifd-calculator
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

  # ── ECE-Oracle 情绪共识预言机 ──────────────────────────
  ece-oracle:
    build:
      context: ./mini-services/ece-oracle
      dockerfile: Dockerfile
    container_name: bb-protocol-ece-oracle
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

  # ── POUE-Prover 认知理解证明引擎 ────────────────────────
  poue-prover:
    build:
      context: ./mini-services/poue-prover
      dockerfile: Dockerfile
    container_name: bb-protocol-poue-prover
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

  # ── MCP-Router 模型上下文路由 ──────────────────────────
  mcp-router:
    build:
      context: ./mini-services/mcp-router
      dockerfile: Dockerfile
    container_name: bb-protocol-mcp-router
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

  # ── Caddy 网关 ──────────────────────────────────────────
  caddy:
    image: caddy:2-alpine
    container_name: bb-protocol-caddy
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
  caddy_data:
    driver: local
  caddy_config:
    driver: local

networks:
  internal:
    driver: bridge
```

### 4.4 部署步骤

```bash
# ── Step 1: 配置环境变量 ─────────────────────────────────
cp .env.example .env
nano .env  # 填写 NEXTAUTH_SECRET, WALLETCONNECT_PROJECT_ID 等

# ── Step 2: 构建并启动基础服务 ────────────────────────────
docker compose up -d

# ── Step 3: 启动完整服务（含 engine 微服务）──────────────
docker compose --profile engine up -d

# ── Step 4: 查看服务状态 ─────────────────────────────────
docker compose ps

# ── Step 5: 查看日志 ─────────────────────────────────────
docker compose logs -f app
```

### 4.5 数据库备份

```bash
# 从容器中导出数据库
docker compose cp app:/app/db/production.db ./backups/production-$(date +%Y%m%d).db

# 自动备份脚本 (crontab)
# 0 2 * * * cd /home/deploy/bb-protocol && docker compose cp app:/app/db/production.db ./backups/production-$(date +\%Y\%m\%d).db
```

### 4.6 Docker 环境故障排查

| 问题 | 解决方案 |
|------|---------|
| 构建失败 `bun install` 超时 | 增加 Docker BuildKit 超时: `export DOCKER_BUILDKIT=0` |
| 容器启动后立即退出 | 查看 logs: `docker compose logs app` |
| 健康检查失败 | 检查 `curl` 是否可用，增加 `start_period` |
| 数据库卷数据丢失 | 确保 `app_data` 卷正确挂载 |
| 网络不通 | 检查 `internal` network: `docker network ls` |

---

## 5. Vercel Serverless 部署

### 5.1 概述

Vercel 部署适合 Next.js 主应用的 serverless 场景，**但微服务需要单独部署到 VPS/云服务器**。

> ⚠️ **重要限制**: Vercel 不支持持久化文件系统（SQLite 不可用），需要外部数据库。WebSocket 微服务不支持 Vercel 部署。

### 5.2 前提条件

- Vercel 账号
- Git 仓库已推送到 GitHub/GitLab/Bitbucket
- 外部数据库 (Turso / PlanetScale / Neon)

### 5.3 部署步骤

```bash
# ── Step 1: 安装 Vercel CLI ──────────────────────────────
npm i -g vercel

# ── Step 2: 登录 ─────────────────────────────────────────
vercel login

# ── Step 3: 部署 (预发布) ────────────────────────────────
vercel

# ── Step 4: 部署 (生产) ──────────────────────────────────
vercel --prod
```

### 5.4 Vercel 项目配置

在 Vercel Dashboard → Settings → General 中配置：

```yaml
Framework Preset: Next.js
Build Command: bun run build
Output Directory: .next
Install Command: bun install
Node.js Version: 20.x
Node.js Options: --max-old-space-size=4096
```

### 5.5 环境变量配置

| 变量名 | 值 | 环境 |
|--------|---|------|
| `DATABASE_URL` | Turso/Neon 连接字符串 | Production |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Production |
| `NEXTAUTH_URL` | `https://your-domain.com` | Production |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect 项目 ID | All |
| `NEXT_PUBLIC_CHAIN_ID` | `8453` | Production |
| `NEXT_PUBLIC_RPC_URL` | `https://mainnet.base.org` | Production |
| `STRIPE_SECRET_KEY` | `sk_live_xxx` | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` | Production |

### 5.6 外部数据库配置 (推荐 Turso)

```bash
# ── 安装 Turso CLI ───────────────────────────────────────
curl -sSfL https://get.tur.so/install.sh | bash

# ── 创建数据库 ───────────────────────────────────────────
turso db create bb-protocol-prod

# ── 获取连接 URL ─────────────────────────────────────────
turso db show bb-protocol-prod --url
# 输出: libsql://bb-protocol-prod-xxx.turso.io

# ── 创建 Auth Token ──────────────────────────────────────
turso db tokens create bb-protocol-prod
# 输出: eyJhbGciOiJF...

# ── 设置环境变量 ─────────────────────────────────────────
DATABASE_URL="libsql://bb-protocol-prod-xxx.turso.io?authToken=eyJhbGciOiJF..."
```

### 5.7 自定义域名

```bash
# 在 Vercel Dashboard → Settings → Domains 添加域名
# DNS 配置:
# 类型    名称    值
# CNAME   @       cname.vercel-dns.com
# CNAME   www     cname.vercel-dns.com

# 或使用 Vercel CLI
vercel domains add your-domain.com
```

### 5.8 Vercel 部署注意事项

1. **微服务部署**: Resonance-Sim / Monitoring-Sim 等需部署到 VPS，通过 Caddy/Nginx 代理
2. **WebSocket 限制**: Vercel Serverless Functions 不支持长连接，Socket.IO 需要外部服务
3. **数据库迁移**: 部署前手动运行 `bun run db:migrate`，Vercel 构建时不自动执行
4. **Cold Start**: Serverless 函数冷启动约 1-3 秒，对 WebSocket 重连有影响

---

## 6. VPS/云服务器部署

### 6.1 概述

VPS 部署是性价比最高的生产方案，使用 Nginx + PM2 + Let's Encrypt 实现完整的生产环境。

### 6.2 前提条件

- Ubuntu 22.04 LTS VPS（推荐 4核/8GB）
- 域名已指向服务器 IP
- SSH 访问权限

### 6.3 服务器初始化

```bash
#!/bin/bash
# server-init.sh — VPS 初始化脚本

set -e

# ── 系统更新 ─────────────────────────────────────────────
sudo apt update && sudo apt upgrade -y

# ── 安装基础工具 ─────────────────────────────────────────
sudo apt install -y curl git build-essential

# ── 安装 Bun ─────────────────────────────────────────────
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# ── 安装 Node.js 20 ─────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ── 安装 Nginx ──────────────────────────────────────────
sudo apt install -y nginx

# ── 安装 Certbot (Let's Encrypt) ────────────────────────
sudo apt install -y certbot python3-certbot-nginx

# ── 安装 PM2 ────────────────────────────────────────────
sudo npm install -g pm2

# ── 配置防火墙 ──────────────────────────────────────────
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ 服务器初始化完成！"
```

### 6.4 Nginx 反向代理配置

```nginx
# /etc/nginx/sites-available/bb-protocol

# ── 上游服务定义 ──────────────────────────────────────────
upstream nextjs_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream resonance_sim { server 127.0.0.1:3003; }
upstream monitoring_sim { server 127.0.0.1:3004; }
upstream ifd_calculator { server 127.0.0.1:3005; }
upstream ece_oracle { server 127.0.0.1:3006; }
upstream poue_prover { server 127.0.0.1:3007; }
upstream mcp_router { server 127.0.0.1:3008; }

# ── HTTP → HTTPS 重定向 ──────────────────────────────────
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# ── HTTPS 主配置 ─────────────────────────────────────────
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
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https: https://mainnet.base.org;" always;

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

    # WebSocket 微服务代理
    location /ws/resonance/ {
        proxy_pass http://resonance_sim/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    location /ws/monitoring/ {
        proxy_pass http://monitoring_sim/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    location /ws/ifd/ {
        proxy_pass http://ifd_calculator/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    location /ws/ece/ {
        proxy_pass http://ece_oracle/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    location /ws/poue/ {
        proxy_pass http://poue_prover/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    location /ws/mcp/ {
        proxy_pass http://mcp_router/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }

    # 静态资源长缓存
    location /_next/static/ {
        proxy_pass http://nextjs_app;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查（无日志）
    location /api/health {
        proxy_pass http://nextjs_app;
        access_log off;
    }

    access_log /var/log/nginx/bb-protocol-access.log;
    error_log /var/log/nginx/bb-protocol-error.log;
}
```

### 6.5 启用 Nginx 配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/bb-protocol /etc/nginx/sites-enabled/

# 移除默认配置
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

### 6.6 SSL 证书配置

```bash
# 获取 Let's Encrypt 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续期
sudo certbot renew --dry-run

# 查看续期定时器
sudo systemctl status certbot.timer
```

### 6.7 PM2 进程管理配置

```javascript
// ecosystem.config.js — BB Protocol PM2 配置
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
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: 'https://your-domain.com',
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
      env: { NODE_ENV: 'production', PORT: 3003 },
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
      env: { NODE_ENV: 'production', PORT: 3004 },
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
      env: { NODE_ENV: 'production', PORT: 3005 },
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
      env: { NODE_ENV: 'production', PORT: 3006 },
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
      env: { NODE_ENV: 'production', PORT: 3007 },
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
      env: { NODE_ENV: 'production', PORT: 3008 },
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/pm2/bb-mcp-error.log',
      out_file: '/var/log/pm2/bb-mcp-out.log',
    },
  ],
};
```

### 6.8 PM2 常用命令

```bash
# 启动所有服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
pm2 logs bb-protocol-app --lines 100

# 重启服务
pm2 restart bb-protocol-app
pm2 restart all

# 设置开机自启
pm2 startup
pm2 save

# 监控面板
pm2 monit
```

### 6.9 自动化部署脚本

```bash
#!/bin/bash
# deploy.sh — BB Protocol 自动化部署脚本
set -e

PROJECT_DIR="/home/deploy/bb-protocol"
BRANCH="main"
BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 备份数据库 ────────────────────────────────────────────
log_info "备份数据库..."
mkdir -p $BACKUP_DIR
cp $PROJECT_DIR/db/production.db $BACKUP_DIR/production-$TIMESTAMP.db

# ── 拉取最新代码 ──────────────────────────────────────────
log_info "拉取最新代码..."
cd $PROJECT_DIR && git fetch origin && git checkout $BRANCH && git pull origin $BRANCH

# ── 安装依赖 ──────────────────────────────────────────────
log_info "安装依赖..."
bun install

# ── 数据库迁移 ────────────────────────────────────────────
log_info "推送数据库 Schema..."
bun run db:push

# ── 构建应用 ──────────────────────────────────────────────
log_info "构建 Next.js 应用..."
bun run build

# ── 重启服务 ──────────────────────────────────────────────
log_info "重启 PM2 服务..."
pm2 restart all

# ── 健康检查 ──────────────────────────────────────────────
log_info "执行健康检查..."
sleep 10
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)

if [ "$HTTP_STATUS" == "200" ]; then
    log_info "✅ 部署成功！"
else
    log_error "❌ 健康检查失败 (HTTP $HTTP_STATUS)"
    pm2 restart all
    log_warn "请检查日志: pm2 logs"
fi

# ── 清理旧备份 ────────────────────────────────────────────
find $BACKUP_DIR -name "production-*.db" -mtime +30 -delete
log_info "部署流程完成！"
```

### 6.10 VPS 部署验证

```bash
# 验证 HTTPS
curl -I https://your-domain.com/api/health

# 验证 SSL
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null 2>/dev/null | openssl x509 -noout -dates

# 验证所有服务
pm2 status
```

---

## 7. AWS (ECS/Fargate) 部署

### 7.1 概述

AWS ECS/Fargate 部署适合需要高可用、自动扩缩容的生产环境，使用 ALB + RDS + S3 + CloudFront 完整架构。

### 7.2 架构图

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  CloudFront  │────▶│  ALB (HTTPS:443) │────▶│  ECS Fargate Tasks │
│  CDN + S3    │     │  HTTP:80 → 301   │     │  App :3000 (2-10)  │
└─────────────┘     └────────┬─────────┘     │  Resonance :3003   │
                             │               │  Monitoring :3004  │
                             │               │  IFD :3005         │
                             │               │  ECE :3006         │
                             │               │  PoUE :3007        │
                             │               │  MCP :3008         │
                             │               └────────┬───────────┘
                             │                        │
                    ┌────────▼────────┐     ┌────────▼───────────┐
                    │  RDS PostgreSQL │     │  S3 (Assets/Static) │
                    │  Multi-AZ       │     │  + IPFS Cache       │
                    │  + Read Replica │     └────────────────────┘
                    └─────────────────┘
```

### 7.3 前提条件

- AWS 账号 + CLI 配置
- ECR 仓库已创建
- ACM SSL 证书 (us-east-1)
- Route53 Hosted Zone

### 7.4 Docker 镜像构建与推送

```bash
# ── 登录 ECR ─────────────────────────────────────────────
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# ── 构建并推送主应用镜像 ──────────────────────────────────
docker build -t bb-protocol-app:latest .
docker tag bb-protocol-app:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bb-protocol:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bb-protocol:latest

# ── 构建并推送微服务镜像 ──────────────────────────────────
docker build -t bb-resonance-sim:latest -f mini-services/resonance-sim/Dockerfile .
docker tag bb-resonance-sim:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bb-protocol:resonance-sim-latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bb-protocol:resonance-sim-latest
```

### 7.5 SSM Parameter Store 配置

```bash
# 存储敏感配置到 AWS SSM Parameter Store
aws ssm put-parameter --name "/cognitive-avatar/production/DATABASE_URL" \
  --value "postgresql://dbadmin:PASSWORD@RDS_ENDPOINT:5432/cognitive_avatar" \
  --type "SecureString" --region us-east-1

aws ssm put-parameter --name "/cognitive-avatar/production/NEXTAUTH_SECRET" \
  --value "$(openssl rand -base64 32)" \
  --type "SecureString" --region us-east-1

aws ssm put-parameter --name "/cognitive-avatar/production/NEXTAUTH_URL" \
  --value "https://your-domain.com" \
  --type "SecureString" --region us-east-1
```

### 7.6 Terraform 部署

```bash
# ── 初始化 Terraform ─────────────────────────────────────
cd terraform
terraform init

# ── 规划 ─────────────────────────────────────────────────
terraform plan -var="environment=production" \
  -var="ecr_repository_url=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/bb-protocol" \
  -var="domain_name=your-domain.com" \
  -var="route53_zone_id=ZXXXXXXXXXX" \
  -var="rds_password=CHANGE_ME_SECURE_PASSWORD" \
  -out=tfplan

# ── 应用 ─────────────────────────────────────────────────
terraform apply tfplan
```

### 7.7 AWS 部署验证

```bash
# 获取 ALB DNS
terraform output alb_dns_name

# 健康检查
curl -s https://your-domain.com/api/health | jq .

# 查看 ECS 服务状态
aws ecs describe-services --cluster cognitive-avatar-production-cluster \
  --services cognitive-avatar-production-app | jq '.services[0].status'
```

### 7.8 AWS 注意事项

1. **RDS vs SQLite**: AWS 生产环境使用 PostgreSQL RDS，需修改 `DATABASE_URL` 和 Prisma Schema
2. **NAT Gateway**: 私有子网通过 NAT Gateway 访问外网，会产生数据传输费用
3. **ALB XTransformPort**: ALB Listener Rules 通过 `query_string` 匹配 `XTransformPort` 参数路由到不同 Target Group
4. **Auto Scaling**: CPU > 70% 扩容，内存 > 80% 扩容，请求数 > 1000/target 扩容

---

## 8. Google Cloud Platform (Cloud Run) 部署

### 8.1 概述

GCP Cloud Run 适合无服务器容器部署，按请求计费，自动扩缩容至零。

### 8.2 前提条件

```bash
# 安装 gcloud CLI
curl https://sdk.cloud.google.com | bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 8.3 部署步骤

```bash
# ── 启用 API ─────────────────────────────────────────────
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com

# ── 构建镜像 ─────────────────────────────────────────────
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/bb-protocol

# ── 部署主应用到 Cloud Run ───────────────────────────────
gcloud run deploy bb-protocol-app \
  --image gcr.io/YOUR_PROJECT_ID/bb-protocol \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "NEXT_PUBLIC_CHAIN_ID=8453" \
  --set-env-vars "NEXT_PUBLIC_RPC_URL=https://mainnet.base.org" \
  --set-secrets "DATABASE_URL=bb-protocol-db-url:latest" \
  --set-secrets "NEXTAUTH_SECRET=bb-protocol-auth-secret:latest"

# ── 部署微服务 ───────────────────────────────────────────
gcloud run deploy bb-resonance-sim \
  --image gcr.io/YOUR_PROJECT_ID/bb-resonance-sim \
  --platform managed \
  --region us-central1 \
  --port 3003 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 3

# 对其他微服务重复上述命令（3004-3008）
```

### 8.4 Cloud SQL 配置

```bash
# ── 创建 Cloud SQL PostgreSQL 实例 ───────────────────────
gcloud sql instances create bb-protocol-db \
  --database-version POSTGRES_16 \
  --tier db-f1-micro \
  --region us-central1 \
  --storage-auto-increase

# ── 创建数据库 ───────────────────────────────────────────
gcloud sql databases create cognitive_avatar --instance bb-protocol-db

# ── 获取连接字符串 ───────────────────────────────────────
gcloud sql instances describe bb-protocol-db --format="value(connectionName)"
```

### 8.5 GCP 注意事项

- Cloud Run 不支持持久化 WebSocket 长连接（最大 60 分钟），微服务需考虑重连机制
- 最小实例设为 0 时，冷启动约 5-10 秒
- 使用 Cloud SQL Proxy 连接数据库

---

## 9. Microsoft Azure (App Service) 部署

### 9.1 概述

Azure App Service for Containers 提供托管的容器部署，适合企业级场景。

### 9.2 前提条件

```bash
# 安装 Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
az login
az configure --defaults location=eastus group=bb-protocol-rg
```

### 9.3 部署步骤

```bash
# ── 创建资源组 ───────────────────────────────────────────
az group create --name bb-protocol-rg --location eastus

# ── 创建 ACR ────────────────────────────────────────────
az acr create --name bbprotocolacr --sku Basic --resource-group bb-protocol-rg

# ── 构建并推送镜像 ───────────────────────────────────────
az acr build --registry bbprotocolacr --image bb-protocol:latest .

# ── 创建 App Service Plan ────────────────────────────────
az appservice plan create \
  --name bb-protocol-plan \
  --resource-group bb-protocol-rg \
  --sku P1V3 \
  --is-linux

# ── 创建 Web App ────────────────────────────────────────
az webapp create \
  --name bb-protocol-app \
  --plan bb-protocol-plan \
  --resource-group bb-protocol-rg \
  --deployment-container-image-name bbprotocolacr.azurecr.io/bb-protocol:latest

# ── 配置环境变量 ─────────────────────────────────────────
az webapp config appsettings set \
  --name bb-protocol-app \
  --resource-group bb-protocol-rg \
  --settings \
    NODE_ENV=production \
    NEXT_PUBLIC_CHAIN_ID=8453 \
    NEXT_PUBLIC_RPC_URL=https://mainnet.base.org \
    DATABASE_URL="file:./db/production.db"

# ── 配置 Key Vault 引用（敏感变量）───────────────────────
az webapp config appsettings set \
  --name bb-protocol-app \
  --resource-group bb-protocol-rg \
  --settings \
    NEXTAUTH_SECRET="@Microsoft.KeyVault(VaultName=bb-protocol-kv;SecretName=NextAuthSecret)"

# ── 配置自定义域名 ───────────────────────────────────────
az webapp config hostname add \
  --hostname your-domain.com \
  --webapp-name bb-protocol-app \
  --resource-group bb-protocol-rg
```

### 9.4 Azure 部署验证

```bash
# 获取应用 URL
az webapp show --name bb-protocol-app --resource-group bb-protocol-rg \
  --query defaultHostName -o tsv

# 健康检查
curl -s https://bb-protocol-app.azurewebsites.net/api/health | jq .
```

---

## 10. Kubernetes (K8s) 生产级编排

### 10.1 概述

Kubernetes 部署适合大规模生产环境，提供自动扩缩容、滚动更新、服务发现等企业级特性。

### 10.2 Helm Chart 结构

```
helm/bb-protocol/
├── Chart.yaml
├── values.yaml
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── app-deployment.yaml
│   ├── app-service.yaml
│   ├── app-hpa.yaml
│   ├── app-ingress.yaml
│   ├── app-configmap.yaml
│   ├── app-secret.yaml
│   ├── microservice-deployment.yaml
│   ├── microservice-service.yaml
│   ├── caddy-configmap.yaml
│   ├── caddy-deployment.yaml
│   ├── caddy-service.yaml
│   ├── prometheus-configmap.yaml
│   ├── grafana-configmap.yaml
│   └── NOTES.txt
```

### 10.3 values.yaml

```yaml
# helm/bb-protocol/values.yaml
global:
  project: bb-protocol
  environment: production

app:
  replicaCount: 2
  image:
    repository: your-registry/bb-protocol
    tag: "5.0.0"
    pullPolicy: IfNotPresent
  port: 3000
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
  env:
    NODE_ENV: production
    NEXT_PUBLIC_CHAIN_ID: "8453"
    NEXT_PUBLIC_RPC_URL: "https://mainnet.base.org"
  secrets:
    DATABASE_URL: "CHANGE_ME"
    NEXTAUTH_SECRET: "CHANGE_ME"
    NEXTAUTH_URL: "https://your-domain.com"
    STRIPE_SECRET_KEY: "CHANGE_ME"

microservices:
  resonance-sim:
    enabled: true
    port: 3003
    replicaCount: 1
    resources:
      requests: { cpu: 128m, memory: 256Mi }
      limits: { cpu: 256m, memory: 512Mi }
  monitoring-sim:
    enabled: true
    port: 3004
    replicaCount: 1
    resources:
      requests: { cpu: 128m, memory: 256Mi }
      limits: { cpu: 256m, memory: 512Mi }
  ifd-calculator:
    enabled: true
    port: 3005
    replicaCount: 1
  ece-oracle:
    enabled: true
    port: 3006
    replicaCount: 1
  poue-prover:
    enabled: true
    port: 3007
    replicaCount: 1
  mcp-router:
    enabled: true
    port: 3008
    replicaCount: 1

caddy:
  enabled: true
  image: caddy:2-alpine
  port: 80

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/websocket-services: "resonance-sim,monitoring-sim"
  hosts:
    - host: your-domain.com
      paths:
        - path: /
          pathType: Prefix
          service: app
  tls:
    - secretName: bb-protocol-tls
      hosts:
        - your-domain.com

persistence:
  enabled: true
  storageClass: standard
  size: 10Gi
```

### 10.4 主应用 Deployment

```yaml
# helm/bb-protocol/templates/app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "bb-protocol.fullname" . }}-app
  labels:
    {{- include "bb-protocol.labels" . | nindent 4 }}
    app.kubernetes.io/component: app
spec:
  replicas: {{ .Values.app.replicaCount }}
  selector:
    matchLabels:
      {{- include "bb-protocol.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: app
  template:
    metadata:
      labels:
        {{- include "bb-protocol.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: app
    spec:
      containers:
        - name: app
          image: "{{ .Values.app.image.repository }}:{{ .Values.app.image.tag }}"
          imagePullPolicy: {{ .Values.app.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.app.port }}
              protocol: TCP
          env:
            {{- range $key, $value := .Values.app.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
          envFrom:
            - secretRef:
                name: {{ include "bb-protocol.fullname" . }}-app-secrets
          resources:
            {{- toYaml .Values.app.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /api/health
              port: {{ .Values.app.port }}
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: {{ .Values.app.port }}
            initialDelaySeconds: 10
            periodSeconds: 10
          volumeMounts:
            - name: db-data
              mountPath: /app/db
      volumes:
        - name: db-data
          {{- if .Values.persistence.enabled }}
          persistentVolumeClaim:
            claimName: {{ include "bb-protocol.fullname" . }}-db-pvc
          {{- else }}
          emptyDir: {}
          {{- end }}
```

### 10.5 Helm 部署命令

```bash
# ── 安装 Helm ────────────────────────────────────────────
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# ── 安装 Ingress Controller ──────────────────────────────
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# ── 安装 cert-manager ────────────────────────────────────
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# ── 部署 BB Protocol ────────────────────────────────────
helm install bb-protocol ./helm/bb-protocol \
  --namespace bb-protocol --create-namespace \
  -f helm/bb-protocol/values-production.yaml \
  --set app.secrets.DATABASE_URL="postgresql://..." \
  --set app.secrets.NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  --set app.secrets.NEXTAUTH_URL="https://your-domain.com"

# ── 升级 ─────────────────────────────────────────────────
helm upgrade bb-protocol ./helm/bb-protocol \
  --namespace bb-protocol \
  -f helm/bb-protocol/values-production.yaml \
  --set app.image.tag="5.0.1"

# ── 回滚 ─────────────────────────────────────────────────
helm rollback bb-protocol 1 --namespace bb-protocol
```

### 10.6 K8s 部署验证

```bash
# 检查 Pod 状态
kubectl get pods -n bb-protocol

# 检查服务
kubectl get svc -n bb-protocol

# 查看 Ingress
kubectl get ingress -n bb-protocol

# 查看日志
kubectl logs -f deployment/bb-protocol-app -n bb-protocol

# 端口转发调试
kubectl port-forward svc/bb-protocol-app 3000:3000 -n bb-protocol
```

---

## 11. Terraform IaC 基础设施编排

### 11.1 概述

项目已包含完整的 Terraform 配置，位于 `terraform/` 目录，支持 AWS 基础设施的一键部署。

### 11.2 文件结构

```
terraform/
├── main.tf          # VPC, Subnets, Security Groups, NAT Gateway
├── ecs.tf           # ECS Cluster, Task Definitions, ALB, Auto-scaling
├── rds.tf           # RDS PostgreSQL, Parameter Group, Read Replica
├── s3.tf            # S3 Buckets, CloudFront CDN, ACM Certificate
├── variables.tf     # 所有可配置变量
└── outputs.tf       # 输出值（endpoints, ARNs, etc.）
```

### 11.3 关键变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `environment` | (必填) | `staging` 或 `production` |
| `aws_region` | `us-east-1` | AWS 区域 |
| `app_cpu` | 512 | App Task CPU (1 vCPU = 1024) |
| `app_memory` | 1024 | App Task 内存 (MiB) |
| `app_desired_count` | 2 | App 实例数 |
| `app_min_count` | 2 | 最小实例 |
| `app_max_count` | 10 | 最大实例 |
| `rds_instance_class` | db.t3.medium | RDS 实例类型 |
| `domain_name` | (必填) | 主域名 |
| `chain_id` | 8453 | Base L2 Chain ID |

### 11.4 部署命令

```bash
# ── 初始化 ───────────────────────────────────────────────
cd terraform
terraform init -backend-config=backend.hcl

# ── 创建 staging 环境 ────────────────────────────────────
terraform workspace new staging
terraform plan -var="environment=staging" \
  -var="ecr_repository_url=xxx.dkr.ecr.us-east-1.amazonaws.com/bb-protocol" \
  -var="domain_name=staging.your-domain.com" \
  -var="route53_zone_id=ZXXXXX" \
  -var="rds_password=CHANGE_ME" \
  -out=staging.tfplan

terraform apply staging.tfplan

# ── 创建 production 环境 ─────────────────────────────────
terraform workspace new production
terraform plan -var="environment=production" \
  -var="ecr_repository_url=xxx.dkr.ecr.us-east-1.amazonaws.com/bb-protocol" \
  -var="domain_name=your-domain.com" \
  -var="route53_zone_id=ZXXXXX" \
  -var="rds_password=CHANGE_ME" \
  -var="app_desired_count=3" \
  -out=production.tfplan

terraform apply production.tfplan
```

### 11.5 Terraform 输出

```bash
# 查看所有输出
terraform output

# 关键输出:
# app_url                    = "https://your-domain.com"
# alb_dns_name               = "bb-protocol-prod-alb-xxx.us-east-1.elb.amazonaws.com"
# rds_endpoint               = "bb-protocol-prod-db.xxx.us-east-1.rds.amazonaws.com:5432"
# cloudfront_domain_name     = "xxx.cloudfront.net"
# ecs_cluster_name           = "bb-protocol-production-cluster"
```

### 11.6 GCP Terraform 示例

```hcl
# terraform/gcp/main.tf — GCP Cloud Run 部署示例
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

resource "google_cloud_run_service" "app" {
  name     = "bb-protocol-app"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "gcr.io/${var.gcp_project_id}/bb-protocol:${var.app_image_tag}"
        ports { container_port = 3000 }
        resources {
          limits = { cpu = "1", memory = "1Gi" }
        }
        env {
          name  = "NODE_ENV"
          value = "production"
        }
      }
    }
  }

  traffic { percent = 100 latest_revision = true }
}

resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.app.name
  location = google_cloud_run_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

### 11.7 Azure Terraform 示例

```hcl
# terraform/azure/main.tf — Azure App Service 部署示例
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "bb-protocol-rg"
  location = var.azure_location
}

resource "azurerm_container_registry" "acr" {
  name                = "bbprotocolacr"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
}

resource "azurerm_linux_web_app" "app" {
  name                = "bb-protocol-app"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_service_plan.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    linux_fx_image = "${azurerm_container_registry.acr.login_server}/bb-protocol:latest"
  }

  app_settings = {
    NODE_ENV             = "production"
    NEXT_PUBLIC_CHAIN_ID = "8453"
    NEXT_PUBLIC_RPC_URL  = "https://mainnet.base.org"
  }
}
```

---

## 12. GitHub Actions CI/CD 流水线

### 12.1 概述

完整的 CI/CD 流水线，支持自动化测试、构建、部署到 staging/production 环境。

### 12.2 完整 workflow 配置

```yaml
# .github/workflows/deploy.yml
name: BB Protocol CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ── 代码检查 ───────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run db:generate

  # ── 单元测试 ───────────────────────────────────────────
  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run db:push
      - run: bun run db:generate
      - run: bun run test --if-present

  # ── E2E 测试 ───────────────────────────────────────────
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run db:push && bun run db:generate
      - run: bun run build
      - run: bun playwright install --with-deps
      - run: bunx playwright test
        env:
          BASE_URL: http://localhost:3000

  # ── 构建并推送 Docker 镜像 ─────────────────────────────
  build:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: [test, e2e]
    if: github.event_name == 'push'
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── 部署到 Staging ────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to ECS Staging
        run: |
          aws ecs update-service \
            --cluster bb-protocol-staging-cluster \
            --service bb-protocol-staging-app \
            --force-new-deployment

      - name: Health Check
        run: |
          for i in $(seq 1 10); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://staging.your-domain.com/api/health)
            if [ "$STATUS" == "200" ]; then
              echo "✅ Staging deployment healthy"
              exit 0
            fi
            echo "Waiting for staging... (attempt $i/10)"
            sleep 15
          done
          echo "❌ Staging health check failed"
          exit 1

  # ── 部署到 Production ─────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to ECS Production
        run: |
          # 更新 Task Definition 使用新镜像
          TASK_DEF=$(aws ecs describe-task-definition \
            --task-definition bb-protocol-production-app \
            --query 'taskDefinition' --output json)

          NEW_TASK_DEF=$(echo "$TASK_DEF" | jq \
            --arg IMAGE "${{ needs.build.outputs.image_tag }}" \
            '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)')

          NEW_ARN=$(aws ecs register-task-definition \
            --cli-input-json "$NEW_TASK_DEF" \
            --query 'taskDefinition.taskDefinitionArn' --output text)

          # 滚动更新
          aws ecs update-service \
            --cluster bb-protocol-production-cluster \
            --service bb-protocol-production-app \
            --task-definition "$NEW_ARN" \
            --force-new-deployment

      - name: Production Health Check
        run: |
          for i in $(seq 1 15); do
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/api/health)
            if [ "$STATUS" == "200" ]; then
              echo "✅ Production deployment healthy"
              exit 0
            fi
            echo "Waiting for production... (attempt $i/15)"
            sleep 20
          done
          echo "❌ Production health check failed — initiating rollback"
          aws ecs update-service \
            --cluster bb-protocol-production-cluster \
            --service bb-protocol-production-app \
            --force-new-deployment
          exit 1
```

### 12.3 必需的 GitHub Secrets

| Secret 名称 | 说明 |
|-------------|------|
| `AWS_ACCESS_KEY_ID` | AWS 访问密钥 |
| `AWS_SECRET_ACCESS_KEY` | AWS 密钥 |
| `NEXTAUTH_SECRET` | 认证密钥 |
| `DATABASE_URL` | 数据库连接字符串 |
| `STRIPE_SECRET_KEY` | Stripe API 密钥 |

---

## 13. 数据库管理

### 13.1 Prisma Migrate vs db:push

| 特性 | `db:push` | `migrate dev` / `migrate deploy` |
|------|-----------|----------------------------------|
| 创建迁移文件 | ❌ 否 | ✅ 是 |
| 适用于开发 | ✅ 推荐 | ⚠️ 可用 |
| 适用于生产 | ❌ 不推荐 | ✅ 推荐 |
| 数据丢失风险 | ⚠️ 可能 | ✅ 安全（可回滚） |
| 速度 | ⚡ 快 | 🐢 较慢 |
| 版本追踪 | ❌ 无 | ✅ 有 |

### 13.2 开发环境数据库操作

```bash
# 推送 Schema 到数据库（开发阶段）
bun run db:push

# 创建命名迁移
bunx prisma migrate dev --name add_avatar_skills

# 生成 Prisma Client
bun run db:generate

# 重置数据库（清空所有数据）
bun run db:reset

# 打开 Prisma Studio（可视化管理）
bunx prisma studio
```

### 13.3 生产环境数据库迁移

```bash
# ── 运行待执行的迁移 ─────────────────────────────────────
bunx prisma migrate deploy

# ── 检查迁移状态 ─────────────────────────────────────────
bunx prisma migrate status

# ── 回滚迁移（需要手动回滚 SQL）─────────────────────────
# Prisma 不支持自动回滚，需要手动编写 down migration
```

### 13.4 数据库备份策略

```bash
#!/bin/bash
# backup-db.sh — SQLite 数据库备份脚本

DB_PATH="/home/deploy/bb-protocol/db/production.db"
BACKUP_DIR="/home/deploy/backups/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

# ── SQLite 安全备份（使用 .backup 命令）──────────────────
sqlite3 $DB_PATH ".backup '${BACKUP_DIR}/production-${TIMESTAMP}.db'"

# ── 压缩备份 ─────────────────────────────────────────────
gzip ${BACKUP_DIR}/production-${TIMESTAMP}.db

# ── 上传到 S3（可选）─────────────────────────────────────
# aws s3 cp ${BACKUP_DIR}/production-${TIMESTAMP}.db.gz \
#   s3://bb-protocol-backups/db/

# ── 清理旧备份 ──────────────────────────────────────────
find $BACKUP_DIR -name "production-*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ 数据库备份完成: production-${TIMESTAMP}.db.gz"
```

### 13.5 数据库恢复

```bash
# ── 停止应用 ─────────────────────────────────────────────
pm2 stop bb-protocol-app

# ── 恢复数据库 ───────────────────────────────────────────
gunzip -c /home/deploy/backups/db/production-20260305_020000.db.gz > /home/deploy/bb-protocol/db/production.db

# ── 验证数据库完整性 ─────────────────────────────────────
sqlite3 /home/deploy/bb-protocol/db/production.db "PRAGMA integrity_check;"

# ── 重启应用 ─────────────────────────────────────────────
pm2 start bb-protocol-app
```

### 13.6 数据库扩容

| 场景 | 方案 |
|------|------|
| SQLite → 多读 | 添加 SQLite WAL mode + Read replicas |
| SQLite → 高并发 | 迁移到 PostgreSQL (RDS/Neon) |
| PostgreSQL 扩展 | RDS Read Replica + Connection Pooling (PgBouncer) |
| 全球用户 | 多区域 RDS + 读写分离 |

---

## 14. Stripe 支付配置

### 14.1 概述

BB Protocol 使用 Stripe + x402 双轨支付系统，Stripe 处理法币订阅，x402 处理微支付。

### 14.2 Stripe 账户设置

```bash
# ── 1. 创建 Stripe 账户 ─────────────────────────────────
# 访问 https://dashboard.stripe.com/register

# ── 2. 获取 API 密钥 ────────────────────────────────────
# Dashboard → Developers → API keys
# - Publishable key: pk_test_xxx / pk_live_xxx
# - Secret key: sk_test_xxx / sk_live_xxx

# ── 3. 创建产品和价格 ───────────────────────────────────
# Dashboard → Products → Add product

# 使用 Stripe CLI 创建:
stripe products create --name="BB Protocol Starter" --description="入门版订阅"
stripe prices create --product=prod_XXX --unit-amount=999 --currency=usd --recurring[interval]=month
```

### 14.3 环境变量配置

```bash
# .env — Stripe 相关配置
STRIPE_SECRET_KEY="sk_live_your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your_stripe_publishable_key"
STRIPE_STARTER_PRICE_ID="price_starter_id"
STRIPE_PRO_PRICE_ID="price_pro_id"
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise_id"
```

### 14.4 Webhook 配置

```bash
# ── 安装 Stripe CLI ──────────────────────────────────────
brew install stripe/stripe-cli/stripe

# ── 本地测试 Webhook ─────────────────────────────────────
stripe listen --forward-to localhost:3000/api/stripe/webhook
# 输出: whsec_xxx (填入 STRIPE_WEBHOOK_SECRET)

# ── 生产 Webhook 端点配置 ───────────────────────────────
# Dashboard → Developers → Webhooks → Add endpoint
# Endpoint URL: https://your-domain.com/api/stripe/webhook
# Events: checkout.session.completed, customer.subscription.updated, invoice.paid
```

### 14.5 Stripe API 路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/stripe/create-session` | POST | 创建 Checkout Session |
| `/api/stripe/webhook` | POST | 接收 Stripe Webhook |
| `/api/stripe/subscription` | GET | 获取订阅状态 |
| `/api/stripe/products` | GET | 获取产品列表 |
| `/api/stripe/usage` | GET | 获取使用量 |
| `/api/stripe/config` | GET | 获取 Stripe 配置 |
| `/api/stripe/confirm` | POST | 确认支付 |
| `/api/stripe/refund` | POST | 退款 |

---

## 15. Web3 配置

### 15.1 概述

BB Protocol 运行在 Base L2 (Chain ID: 8453) 上，使用 ConnectKit + Wagmi + viem 实现 Web3 集成，包含 10 个 Solidity 智能合约。

### 15.2 WalletConnect 配置

```bash
# ── 1. 创建 WalletConnect 项目 ──────────────────────────
# 访问 https://cloud.walletconnect.com
# Create Project → 获取 Project ID

# ── 2. 配置环境变量 ─────────────────────────────────────
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your-project-id"
NEXT_PUBLIC_CHAIN_ID="8453"
NEXT_PUBLIC_RPC_URL="https://mainnet.base.org"
```

### 15.3 RPC 端点配置

| 网络 | Chain ID | RPC URL | 用途 |
|------|----------|---------|------|
| Base Mainnet | 8453 | `https://mainnet.base.org` | 生产环境 |
| Base Sepolia | 84532 | `https://sepolia.base.org` | 测试环境 |
| Alchemy Base | 8453 | `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY` | 高可用 |
| Infura Base | 8453 | `https://base-mainnet.infura.io/v3/YOUR_KEY` | 高可用 |

### 15.4 智能合约部署

```bash
# ── 安装 Foundry ─────────────────────────────────────────
curl -L https://foundry.paradigm.xyz | bash
foundryup

# ── 编译合约 ─────────────────────────────────────────────
cd contracts
forge build

# ── 部署到 Base Sepolia (测试) ───────────────────────────
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast

# ── 部署到 Base Mainnet (生产) ──────────────────────────
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### 15.5 合约清单

| 合约 | 文件 | 说明 |
|------|------|------|
| AvatarCore | `AvatarCore.sol` | 认知分身核心 |
| SkillVault | `SkillVault.sol` | 技能金库 |
| DynamicSplitter | `DynamicSplitter.sol` | 动态分账 |
| CircuitGuard | `CircuitGuard.sol` | 熔断保护 |
| GovernanceToken | `GovernanceToken.sol` | 治理代币 |
| IFDRouter | `IFDRouter.sol` | 流体民主路由 |
| ECEOracle | `ECEOracle.sol` | 情绪共识预言机 |
| PoUEVerifier | `PoUEVerifier.sol` | 认知理解证明 |
| MCPRouter | `MCPRouter.sol` | MCP 路由合约 |
| TokenVault | `TokenVault.sol` | 代币金库 |

---

## 16. 微服务部署与健康监控

### 16.1 微服务架构概览

```
                        ┌───────────────────────────────────┐
                        │     Caddy Gateway (:81)           │
                        │  XTransformPort Query Routing     │
                        └──┬──┬──┬──┬──┬──┬──┬──────────────┘
                           │  │  │  │  │  │  │
          ┌────────────────┘  │  │  │  │  │  └───────────────┐
          ▼                   ▼  ▼  ▼  ▼  ▼                  ▼
    ┌──────────┐  ┌────────┐ ┌────────┐ ┌────────┐  ┌──────────┐
    │  App     │  │Reson   │ │Monit   │ │IFD/ECE │  │  MCP     │
    │  :3000   │  │:3003   │ │:3004   │ │:3005-6 │  │:3007-8   │
    │  HTTP    │  │WS 6s   │ │WS 3s   │ │WS 3-5s │  │WS 7-8s   │
    └──────────┘  └────────┘ └────────┘ └────────┘  └──────────┘
```

### 16.2 各微服务详情

| 微服务 | 端口 | 广播间隔 | 功能描述 | 关键指标 |
|--------|------|---------|---------|---------|
| Resonance-Sim | 3003 | 6s (共振) / 15-30s (收益) | 情绪共振模拟，提供实时共振强度数据 | resonanceLevel, revenueEvents |
| Monitoring-Sim | 3004 | 3s (指标) / 10s (链上事件) | 系统监控，CPU/Memory/Network 指标 | cpuUsage, memoryUsage, chainEvents |
| IFD-Calculator | 3005 | 5s (权重更新) | 流体民主权重计算引擎 | totalWeight, nodes, cycles |
| ECE-Oracle | 3006 | 3s (价格更新) | 情绪共识预言机 | assetsTracked, priceUpdates |
| POUE-Prover | 3007 | 8s (证明提交) | 认知理解证明引擎 | proofsGenerated, verificationRate |
| MCP-Router | 3008 | 7s (请求路由) | 模型上下文协议路由 | requestsRouted, activeModels |

### 16.3 微服务健康检查

```bash
# 批量健康检查脚本
#!/bin/bash
services=("3000:App" "3003:Resonance-Sim" "3004:Monitoring-Sim" \
          "3005:IFD-Calculator" "3006:ECE-Oracle" "3007:POUE-Prover" "3008:MCP-Router")

echo "=== BB Protocol 服务健康状态 ==="
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

### 16.4 前端连接方式

```typescript
// ✅ 正确: 通过 Caddy 网关 + XTransformPort 连接
import { io } from 'socket.io-client';

const resonanceSocket = io('/?XTransformPort=3003');
const monitoringSocket = io('/?XTransformPort=3004');

// ❌ 错误: 直接连接微服务 (CORS 问题 + 安全风险)
const badSocket = io('http://localhost:3003');  // 禁止！
```

### 16.5 Caddy 网关 XTransformPort 配置

```caddyfile
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

---

## 17. 监控与可观测性

### 17.1 概述

生产环境需要完整的监控体系，包括指标采集、日志聚合、告警通知。

### 17.2 Prometheus + Grafana 配置

```yaml
# monitoring/docker-compose.monitoring.yml
version: "3.9"

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: bb-protocol-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'

  grafana:
    image: grafana/grafana:latest
    container_name: bb-protocol-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    depends_on:
      - prometheus

  node-exporter:
    image: prom/node-exporter:latest
    container_name: bb-protocol-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'

volumes:
  prometheus_data:
  grafana_data:
```

### 17.3 Prometheus 配置

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'bb-protocol-app'
    metrics_path: '/api/health'
    static_configs:
      - targets: ['host.docker.internal:3000']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'caddy'
    static_configs:
      - targets: ['host.docker.internal:81']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alert_rules.yml'
```

### 17.4 告警规则

```yaml
# monitoring/alert_rules.yml
groups:
  - name: bb-protocol-alerts
    rules:
      - alert: HighCPUUsage
        expr: process_cpu_seconds_total > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"

      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1073741824
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage exceeds 1GB"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "5XX error rate exceeds 5%"
```

### 17.5 日志聚合

```bash
# PM2 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true

# Docker 日志
docker compose logs -f --since 1h app

# Nginx 日志
tail -f /var/log/nginx/bb-protocol-access.log
tail -f /var/log/nginx/bb-protocol-error.log
```

---

## 18. 安全加固

### 18.1 SSL/TLS 配置

```nginx
# Nginx SSL 最佳实践
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

### 18.2 安全头部

```nginx
# 安全 HTTP 头部配置
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https: https://mainnet.base.org https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com;" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

### 18.3 CORS 配置

```bash
# .env — CORS 配置
CORS_ORIGIN="https://your-domain.com"  # 仅允许生产域名

# 微服务 CORS 设置
# 每个 Socket.IO 服务仅允许来自 CORS_ORIGIN 的连接
```

### 18.4 Rate Limiting

```nginx
# Nginx 限流配置
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

location /api/ {
    limit_req zone=api burst=10 nodelay;
    proxy_pass http://nextjs_app;
}

location /api/stripe/ {
    limit_req zone=auth burst=3 nodelay;
    proxy_pass http://nextjs_app;
}
```

### 18.5 密钥管理

```bash
# ⚠️ 安全警告: 绝不要将密钥提交到 Git

# 方案 1: .env 文件 (开发/小规模)
echo ".env" >> .gitignore

# 方案 2: AWS SSM Parameter Store (生产推荐)
aws ssm put-parameter --name "/bb-protocol/prod/NEXTAUTH_SECRET" \
  --value "$(openssl rand -base64 32)" --type "SecureString"

# 方案 3: AWS Secrets Manager (高安全)
aws secretsmanager create-secret \
  --name bb-protocol/prod/secrets \
  --secret-string '{"DATABASE_URL":"...","NEXTAUTH_SECRET":"..."}'

# 方案 4: HashiCorp Vault (企业级)
vault kv put secret/bb-protocol NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

### 18.6 防火墙配置

```bash
# ── UFW 防火墙规则 ─────────────────────────────────────
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许 SSH (建议限制来源 IP)
sudo ufw allow from YOUR_IP to any port 22

# 允许 HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 拒绝直接访问内部端口
sudo ufw deny 3000:3008/tcp

sudo ufw --force enable
sudo ufw status verbose
```

---

## 19. 备份与灾难恢复

### 19.1 备份策略

| 数据类型 | 备份频率 | 保留期限 | 存储位置 |
|---------|---------|---------|---------|
| SQLite 数据库 | 每日 2:00 AM | 30 天 | 本地 + S3 |
| RDS PostgreSQL | 自动（RDS 备份） | 7 天 | AWS RDS |
| .env 配置 | 每次变更 | 无限 | AWS SSM |
| Docker 镜像 | 每次构建 | 10 个版本 | ECR/GHCR |
| 合约 ABI | 每次部署 | 无限 | Git |

### 19.2 自动化备份脚本

```bash
#!/bin/bash
# backup-all.sh — 完整备份脚本
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/deploy/backups"
S3_BUCKET="s3://bb-protocol-backups"

# ── 数据库备份 ───────────────────────────────────────────
sqlite3 /home/deploy/bb-protocol/db/production.db \
  ".backup '${BACKUP_DIR}/db/production-${TIMESTAMP}.db'"
gzip ${BACKUP_DIR}/db/production-${TIMESTAMP}.db

# ── 配置备份 ─────────────────────────────────────────────
cp /home/deploy/bb-protocol/.env ${BACKUP_DIR}/config/env-${TIMESTAMP}

# ── 上传到 S3 ───────────────────────────────────────────
aws s3 sync ${BACKUP_DIR}/db/ ${S3_BUCKET}/db/ --exclude "*" --include "*${TIMESTAMP}*"

# ── Point-in-time 恢复标记 ──────────────────────────────
echo "${TIMESTAMP}" > ${BACKUP_DIR}/latest-backup.txt

echo "✅ 完整备份完成: ${TIMESTAMP}"
```

### 19.3 灾难恢复流程

```bash
# ── 场景 1: 数据库损坏 ──────────────────────────────────
pm2 stop bb-protocol-app
LATEST=$(ls -t /home/deploy/backups/db/production-*.db.gz | head -1)
gunzip -c $LATEST > /home/deploy/bb-protocol/db/production.db
sqlite3 /home/deploy/bb-protocol/db/production.db "PRAGMA integrity_check;"
pm2 start bb-protocol-app

# ── 场景 2: 服务器宕机 ──────────────────────────────────
# 1. 启动新 VPS
# 2. 运行 server-init.sh
# 3. 克隆仓库 + 配置 .env
# 4. 从 S3 恢复数据库:
aws s3 cp s3://bb-protocol-backups/db/production-XXXXXX.db.gz /tmp/
gunzip /tmp/production-XXXXXX.db.gz
cp /tmp/production-XXXXXX.db /home/deploy/bb-protocol/db/production.db
# 5. bun install && bun run build && pm2 start ecosystem.config.js

# ── 场景 3: 合约升级失败 ────────────────────────────────
# 使用 Foundry 部署新合约 → 更新前端合约地址 → 验证
```

### 19.4 备份验证

```bash
# 每周验证备份完整性
#!/bin/bash
LATEST=$(ls -t /home/deploy/backups/db/production-*.db.gz | head -1)
TEMP_DB="/tmp/verify-$(date +%s).db"
gunzip -c $LATEST > $TEMP_DB
RESULT=$(sqlite3 $TEMP_DB "PRAGMA integrity_check;")
rm $TEMP_DB

if [ "$RESULT" == "ok" ]; then
    echo "✅ 备份验证通过: $LATEST"
else
    echo "❌ 备份损坏: $LATEST" | mail -s "BB Protocol Backup Alert" admin@your-domain.com
fi
```

---

## 20. 扩缩容策略

### 20.1 水平扩展 (Horizontal Scaling)

| 组件 | 扩展方式 | 最小 | 最大 | 触发条件 |
|------|---------|------|------|---------|
| App (ECS) | Auto Scaling | 2 | 10 | CPU > 70% / 内存 > 80% / 请求数 > 1000/target |
| Resonance-Sim | 手动 | 1 | 3 | WebSocket 连接数 > 500 |
| Monitoring-Sim | 手动 | 1 | 3 | 数据采集延迟 > 5s |
| RDS | Read Replica | 1 | 3 | 连接数 > 80% / 查询延迟 > 100ms |

### 20.2 垂直扩展 (Vertical Scaling)

| 组件 | 最小 | 推荐 | 最大 |
|------|------|------|------|
| App CPU | 256 | 512 | 2048 |
| App 内存 | 512Mi | 1Gi | 4Gi |
| RDS 实例 | db.t3.micro | db.t3.medium | db.r6g.xlarge |
| Redis (可选) | 128Mi | 256Mi | 1Gi |

### 20.3 负载均衡

```
                     ┌────────────────────┐
                     │  Load Balancer      │
                     │  (ALB / Nginx)      │
                     └──┬────┬────┬────────┘
                        │    │    │
              ┌─────────┘    │    └──────────┐
              ▼              ▼               ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  App #1  │  │  App #2  │  │  App #3  │
        │  :3000   │  │  :3000   │  │  :3000   │
        └──────────┘  └──────────┘  └──────────┘
              │              │               │
              └──────────────┼───────────────┘
                             ▼
                    ┌──────────────────┐
                    │  RDS PostgreSQL   │
                    │  + Read Replica   │
                    └──────────────────┘
```

### 20.4 数据库扩展路径

```
SQLite (开发)
  ↓ 高并发需求
PostgreSQL RDS Single-AZ (staging)
  ↓ 高可用需求
PostgreSQL RDS Multi-AZ + Read Replica (production)
  ↓ 全球用户
Aurora PostgreSQL + Global Database (enterprise)
```

---

## 21. 故障排查指南

### 21.1 常见问题与解决方案

| # | 问题 | 症状 | 原因 | 解决方案 |
|---|------|------|------|---------|
| 1 | 端口被占用 | `EADDRINUSE` | 旧进程未释放 | `lsof -i :3000` → `kill -9 <PID>` |
| 2 | Prisma Client 未生成 | `Cannot find module '.prisma/client'` | 安装后未 generate | `bun run db:generate` |
| 3 | 数据库损坏 | `SQLITE_CORRUPT` | 异常关机 | `rm -f db/custom.db && bun run db:push` |
| 4 | WebSocket 断连 | 仪表盘数据停止更新 | 微服务离线 | 检查 `pm2 status` → 重启对应服务 |
| 5 | Hydration mismatch | 控制台 Warning | SSR/Client 时间不同 | 确认使用 `useClientTime()` hook |
| 6 | CORS 错误 | 浏览器控制台 CORS | 直接连接微服务 | 使用 Caddy `XTransformPort` 网关 |
| 7 | Stripe Webhook 失败 | 支付状态不更新 | Webhook 签名不匹配 | 检查 `STRIPE_WEBHOOK_SECRET` |
| 8 | 钱包连接失败 | ConnectKit 不弹出 | WalletConnect ID 缺失 | 检查 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` |
| 9 | 构建 OOM | `FATAL ERROR: Reached heap limit` | 内存不足 | `NODE_OPTIONS=--max-old-space-size=4096` |
| 10 | 502 Bad Gateway | Nginx 返回 502 | App 未启动 | `pm2 restart bb-protocol-app` |

### 21.2 日志查看命令

```bash
# ── PM2 日志 ─────────────────────────────────────────────
pm2 logs bb-protocol-app --lines 200

# ── Docker 日志 ──────────────────────────────────────────
docker compose logs -f app --since 1h

# ── Nginx 日志 ──────────────────────────────────────────
tail -200 /var/log/nginx/bb-protocol-error.log

# ── 系统日志 ────────────────────────────────────────────
journalctl -u nginx --since "1 hour ago"
```

### 21.3 性能诊断

```bash
# ── Node.js 性能分析 ────────────────────────────────────
NODE_OPTIONS="--inspect" bun run dev
# 在 Chrome DevTools → Node.js 中连接

# ── 内存泄漏排查 ────────────────────────────────────────
pm2 start ecosystem.config.js --node-args="--max-old-space-size=4096"
pm2 logs bb-protocol-app | rg "memory"

# ── 网络延迟排查 ────────────────────────────────────────
curl -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
  -o /dev/null -s https://your-domain.com/api/health
```

---

## 22. 常见问题 (FAQ)

### Q1: 必须启动所有 6 个微服务吗？

**不需要。** 仅 App (3000) 为必须服务。其余微服务根据功能需求按需启动：
- **推荐启动**: Resonance-Sim (3003) + Monitoring-Sim (3004) — 仪表盘核心数据
- **可选启动**: IFD-Calculator (3005) ~ MCP-Router (3008) — 高级功能
- 缺少微服务时，前端自动 fallback 到 mock 数据，不会崩溃

### Q2: 可以用 Node.js 替代 Bun 吗？

**可以。** 项目兼容 Node.js 20+，但推荐使用 Bun：
- Bun 安装速度约 npm 的 30 倍
- Bun 运行时启动更快
- PM2 中 `script: 'bun'` 可改为 `script: 'node'`

### Q3: SQLite 适合生产环境吗？

SQLite 适合中小规模部署（< 100 并发写入）。高并发场景建议迁移到：
- **Turso** (libSQL，Serverless SQLite 兼容)
- **Neon** (Serverless PostgreSQL)
- **RDS PostgreSQL** (AWS 托管)

### Q4: 如何从 SQLite 迁移到 PostgreSQL？

```bash
# 1. 修改 prisma/schema.prisma
# datasource db {
#   provider = "postgresql"
#   url      = env("DATABASE_URL")
# }

# 2. 设置新 DATABASE_URL
# DATABASE_URL="postgresql://user:pass@host:5432/db"

# 3. 推送 Schema
bunx prisma db push

# 4. 迁移数据（使用 prisma migrate 或手动 SQL 导出/导入）
```

### Q5: 微服务可以部署到不同服务器吗？

**可以。** 只需确保：
1. 所有微服务通过统一网关（Caddy/Nginx/ALB）暴露
2. 前端使用 `XTransformPort` 参数路由
3. CORS_ORIGIN 配置正确

### Q6: 如何更新微服务而不影响用户？

```bash
# 滚动更新策略:
# 1. 启动新版本微服务
pm2 start bb-resonance-sim-new

# 2. 更新网关路由指向新服务

# 3. 验证新服务健康
curl http://localhost:3003/health

# 4. 停止旧版本
pm2 stop bb-resonance-sim-old
```

### Q7: x402 支付是什么？

x402 是基于 HTTP 402 状态码的微支付协议，允许按使用量付费。与 Stripe 订阅模式互补，适合 API 调用、技能使用等微交易场景。

### Q8: 如何支持多语言？

项目已内置 8 种语言支持 (zh/en/ja/ko/es/fr/de/ar)，使用自定义 `useI18n` hook + `t()` 函数。语言文件位于 `src/lib/messages/` 目录。

### Q9: 合约部署到 Base L2 的费用是多少？

Base L2 Gas 费用极低（通常 < $0.01/交易），10 个合约部署总费用约 $0.5-2.0。

### Q10: 如何监控系统健康状态？

- **开发**: `bash health-check.sh`
- **生产**: Prometheus + Grafana (Section 17)
- **AWS**: CloudWatch Alarms + Container Insights
- **前端**: 页面头部显示 Service Health Indicator (绿/黄点 + 连接数)

---

## 附录

### A. 环境变量完整参考

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

### B. 生成 NEXTAUTH_SECRET

```bash
# OpenSSL
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Bun
bun -e "console.log(Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64'))"
```

### C. Docker 常用命令速查

```bash
docker compose up -d                    # 启动所有服务
docker compose --profile engine up -d   # 启动含引擎服务
docker compose ps                       # 查看状态
docker compose logs -f app              # 查看日志
docker compose restart app              # 重启服务
docker compose down                     # 停止所有服务
docker compose down -v                  # 停止并删除卷
docker compose build --no-cache         # 重新构建
```

### D. PM2 常用命令速查

```bash
pm2 start ecosystem.config.js   # 启动
pm2 status                      # 状态
pm2 logs                        # 日志
pm2 restart all                 # 重启
pm2 monit                       # 监控
pm2 startup                     # 开机自启
pm2 save                        # 保存进程列表
```

---

> **文档维护**: 如发现文档错误或需要补充内容，请提交 Issue 或 PR 到项目仓库。  
> **紧急联系**: 生产环境故障请联系 BB Protocol Core Team (ops@bb-protocol.dev)
