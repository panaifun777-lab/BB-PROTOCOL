# BB Protocol — 认知分身协议功能全景文档

> **版本**: v2.2.0  
> **最后更新**: 2026-03-05  
> **项目性质**: 演示原型 / 概念验证 (Demo/Prototype)  
> **技术栈**: Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 + Prisma + Solidity

---

## 1. 项目概述

BB Protocol（认知分身协议）是一个面向 **AI 分身经济** 的区块链/DeFi 仪表盘系统。项目构建了一个完整的「认知分身 → 技能解锁 → 收益分账 → 链上治理」闭环，涵盖前端 Dashboard、后端 API、智能合约、微服务引擎、支付系统等六大开发阶段。

### 核心理念

| 概念 | 说明 |
|------|------|
| **认知分身 (Avatar)** | 基于 `.soul` SBT 的 AI 数字分身，拥有独立的认知状态根、共振分和熔断机制 |
| **动态分账 (Dynamic Split)** | 70/20/10 (人类/分身金库/协议LP) 收益分账，分身份额随共振分动态调整 |
| **认知熔断 (Circuit Breaker)** | 四级熔断机制：NORMAL → SOFT_LIMIT → HARD_PAUSE → RECOVERY |
| **流体民主 (IFD)** | 流体民主委托投票，支持按领域 (domain) 分权委托 |
| **情绪共振 (ECE)** | 情绪共识引擎 (Emotional Consensus Engine) 驱动共振分评估 |

---

## 2. 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BB Protocol Architecture                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Frontend (Next.js 16 App Router)               │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │  │
│  │  │  Page   │ │ 33 Dash  │ │ Language │ │ Web3 ConnectKit      │ │  │
│  │  │  (SPA)  │ │ Components│ │ Switcher │ │ + Wagmi + Viem       │ │  │
│  │  └────┬────┘ └────┬─────┘ └────┬─────┘ └──────────┬───────────┘ │  │
│  │       │           │            │                   │              │  │
│  │  ┌────┴───────────┴────────────┴───────────────────┴───────────┐ │  │
│  │  │              Zustand Stores + TanStack Query                │ │  │
│  │  │  dashboard-store │ web3-store │ engine-store                │ │  │
│  │  └──────────────────────────┬──────────────────────────────────┘ │  │
│  │                             │                                     │  │
│  │  ┌──────────────────────────┴──────────────────────────────────┐ │  │
│  │  │                   Custom Hooks (11+)                        │ │  │
│  │  │  use-i18n │ use-dashboard-data │ use-engine-status          │ │  │
│  │  │  use-payment │ use-web3 │ use-web3-sync │ use-split-sync   │ │  │
│  │  │  use-payment-polling │ use-payment-retry                    │ │  │
│  │  │  use-conversion-tracking │ use-client-time                  │ │  │
│  │  └──────────────────────────┬──────────────────────────────────┘ │  │
│  └─────────────────────────────┼────────────────────────────────────┘  │
│                                │ API (49 endpoints)                     │
│  ┌─────────────────────────────┴────────────────────────────────────┐  │
│  │                  Next.js API Routes (App Router)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐ │  │
│  │  │ Dashboard│ │ Payment  │ │ Stripe   │ │ Web3 / Contracts   │ │  │
│  │  │ Core API │ │ API CRUD │ │ Webhooks │ │ Simulation API     │ │  │
│  │  └─────┬────┘ └────┬─────┘ └────┬─────┘ └────────┬───────────┘ │  │
│  └────────┼───────────┼────────────┼─────────────────┼─────────────┘  │
│           │           │            │                 │                  │
│  ┌────────┴───────────┴────────────┴─────────────────┴──────────────┐  │
│  │                    Prisma ORM + SQLite                           │  │
│  │              35+ Models │ SQLite (dev) → PostgreSQL (prod)       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  Microservices (6 Bun Services)                    │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │  │
│  │  │resonance-sim │ │monitoring-sim│ │ IFD Calculator (3005)    │ │  │
│  │  │  Port 3003   │ │  Port 3004   │ │ ECE Oracle    (3006)     │ │  │
│  │  │  Socket.IO   │ │  Socket.IO   │ │ POUE Prover   (3007)     │ │  │
│  │  └──────────────┘ └──────────────┘ │ MCP Router    (3008)     │ │  │
│  │                                     └──────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              Smart Contracts (Solidity, Base L2)                  │  │
│  │  ┌────────────┐ ┌────────────────┐ ┌──────────┐ ┌────────────┐ │  │
│  │  │AvatarCore │ │DynamicSplitter │ │TokenVault│ │CircuitGuard│ │  │
│  │  │ (.soul SBT)│ │ (Revenue Split)│ │ (LP Vault)│ │(熔断器)   │ │  │
│  │  └────────────┘ └────────────────┘ └──────────┘ └────────────┘ │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │  │
│  │  │SkillVault  │ │ IFDRouter  │ │ ECEOracle  │ │Governance  │  │  │
│  │  │ (技能解锁) │ │ (流体民主) │ │ (共振预言) │ │Token       │  │  │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  Rust Engine (高性能计算层)                        │  │
│  │  ifd_calculator.rs │ ece_oracle.rs │ poue_prover.rs │ mcp_router │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │           Caddy Gateway (Port 81 → XTransformPort Routing)        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              Infrastructure (Terraform + Docker)                   │  │
│  │  ECS Fargate │ RDS PostgreSQL │ S3 Static │ CloudFront CDN        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 功能清单（按开发阶段）

### Phase 0 — 基础架构

| 功能 | 描述 | 状态 |
|------|------|------|
| Next.js 16 项目初始化 | App Router + Turbopack + React 19 | ✅ 完成 |
| Prisma ORM 集成 | SQLite 开发环境 + PostgreSQL 生产迁移方案 | ✅ 完成 |
| shadcn/ui 组件库 | New York 风格，47+ UI 组件 | ✅ 完成 |
| Tailwind CSS 4 | 暗色主题 (#0F172A 基底) + 响应式布局 | ✅ 完成 |
| i18n 国际化 | 8 语言 (zh/en/ja/ko/de/fr/es/ar) + RTL 支持 | ✅ 完成 |
| Zustand 状态管理 | 3 Store: dashboard-store / web3-store / engine-store | ✅ 完成 |
| TanStack Query | 服务端数据获取 + 缓存管理 | ✅ 完成 |
| Caddy 网关 | XTransformPort 路由 + WebSocket 转发 | ✅ 完成 |

### Phase 1 — 核心 Dashboard

| 功能 | 描述 | 状态 |
|------|------|------|
| **认知身份卡片** (CognitiveCard) | .soul SBT 身份、共振分仪表、熔断状态、技能包概览 | ✅ 完成 |
| **动态分账仪表盘** (SplitDashboard) | 70/20/10 分账可视化、月度趋势图、最近分账记录 | ✅ 完成 |
| **共振波形** (ResonanceWave) | 24h 共振分时序图、阈值线 (软限制/硬暂停)、危险区标识 | ✅ 完成 |
| **熔断面板** (CircuitPanel) | 四级熔断状态展示、手动恢复按钮 | ✅ 完成 |
| **技能库** (SkillVault) | 4 层技能解锁、收益阈值进度条、使用统计 | ✅ 完成 |
| **IFD 委托** (IFDDelegation) | 流体民主委托、按领域分配权重、委托撤销 | ✅ 完成 |
| **认知时间线** (CognitiveTimeline) | 5 类事件流 (技能/收益/共振/委托/熔断)、筛选器 | ✅ 完成 |

### Phase 2 — 高级功能

| 功能 | 描述 | 状态 |
|------|------|------|
| **安全审计** (SecurityAudit) | 安全不变量检查 (4类)、漏洞发现、审计日志 | ✅ 完成 |
| **合规模型** (CompliancePanel) | 5 大合规模块 (KYC/Tax/ZK/Geo/Arbitration)、5 司法管辖区 | ✅ 完成 |
| **性能仪表盘** (PerformanceDashboard) | Web Vitals 监控、缓存策略、CDN 配置、懒加载模块 | ✅ 完成 |
| **部署中心** (DeploymentCenter) | 合约部署记录、MultiSig 确认、状态一致性检查、CI/CD 流水线 | ✅ 完成 |
| **监控中心** (MonitoringCenter) | Prometheus 指标、链上事件监听、告警规则、异常检测 | ✅ 完成 |
| **灰度发布** (FeatureFlags) | 功能开关、A/B 测试、金丝雀指标、回滚日志 | ✅ 完成 |

### Phase 3 — Web3 集成

| 功能 | 描述 | 状态 |
|------|------|------|
| **多链部署** (MultichainDeploy) | 4 条链 (Base/Base Sepolia/Arbitrum/Ethereum)、跨链桥 | ✅ 完成 |
| **SDK 平台** (SdkPlatform) | API 端点管理、API Key 管理、SDK 包下载、Webhook 配置 | ✅ 完成 |
| **DAO 治理** (DaoGovernance) | 提案投票、委托图、国库管理、治理参数 | ✅ 完成 |
| **生态枢纽** (EcosystemHub) | 协议集成状态 (DEX/Lending/Oracle 等)、钱包支持、活动流 | ✅ 完成 |
| **合约架构** (ContractsArch) | 10 合约详细视图、函数定义、交互图、不变量测试、Gas 报告 | ✅ 完成 |
| **引擎架构** (EngineArch) | 6 引擎模块详解、数学模型、基准测试 | ✅ 完成 |
| **Web3 集成** (Web3Integration) | 钱包连接状态、合约交互、事件订阅、交易记录 | ✅ 完成 |
| **Web3 钱包** (Web3Wallet) | ConnectKit + Wagmi 集成、余额展示、链切换 | ✅ 完成 |
| **数据基建** (DataInfra) | Subgraph 实体统计、IPFS Pin 管理、数据流路径、Zustand Store 映射 | ✅ 完成 |
| **引擎状态** (EngineStatus) | 6 微服务实时状态、Socket.IO 连接指示器 | ✅ 完成 |

### Phase 4 — DeFi 功能

| 功能 | 描述 | 状态 |
|------|------|------|
| **LP 流动性** (LPLiquidity) | AFC/USDC 交易对、深度图、Token 经济学、质押信息 | ✅ 完成 |
| **合约模拟** (ContractSimulation) | 10 合约交互模拟、参数输入、Gas 估算、验证检查 | ✅ 完成 |
| **分身市场** (AvatarMarketplace) | 6 个 AI 分身租赁、领域筛选、共振分排序 | ✅ 完成 |
| **通知中心** (NotificationCenter) | 8 类通知 (治理/收益/安全/桥接等)、优先级、已读标记 | ✅ 完成 |

### Phase 5 — 实时通信

| 功能 | 描述 | 状态 |
|------|------|------|
| **resonance-sim** (Port 3003) | Socket.IO 共振分模拟服务，实时推送波形数据 | ✅ 完成 |
| **monitoring-sim** (Port 3004) | Socket.IO 监控模拟服务，实时推送系统指标 | ✅ 完成 |
| **ifd-calculator** (Port 3005) | IFD 流体民主计算引擎 | ✅ 完成 |
| **ece-oracle** (Port 3006) | 情绪共识引擎预言机 | ✅ 完成 |
| **poue-prover** (Port 3007) | 理解力证明引擎 | ✅ 完成 |
| **mcp-router** (Port 3008) | MCP 模型上下文路由器 | ✅ 完成 |
| **Engine Status Hook** | 统一 6 微服务 Socket.IO 连接管理 | ✅ 完成 |

### Phase 6 — 支付系统

#### Phase 6-1: 基础支付

| 功能 | 描述 | 状态 |
|------|------|------|
| Payment CRUD API | 创建/查询/更新/删除支付记录 | ✅ 完成 |
| x402 支付组件 | 链上微支付弹窗，支持 wallet_sign/biometric/auto_approved | ✅ 完成 |
| Payment Hook | 核心支付状态管理 + 分账计算 | ✅ 完成 |

#### Phase 6-2: Stripe 集成

| 功能 | 描述 | 状态 |
|------|------|------|
| Stripe Session 创建 | Checkout Session 发起 | ✅ 完成 |
| Stripe Webhook | 事件处理 (checkout.session.completed 等) | ✅ 完成 |
| Stripe 确认 | 支付确认流程 | ✅ 完成 |
| Stripe 退款 | 退款处理 | ✅ 完成 |
| 订阅管理 | 创建/取消/重新激活订阅 | ✅ 完成 |
| 计量使用 | 按量计费上报 + 查询 | ✅ 完成 |

#### Phase 6-3: 确认与多币种

| 功能 | 描述 | 状态 |
|------|------|------|
| Payment Polling | 3 秒轮询，20 次最大尝试 | ✅ 完成 |
| Payment Verify | 支付验证端点 | ✅ 完成 |
| 多币种支持 | USD/EUR/GBP/JPY/CNY/KRW + 汇率更新 | ✅ 完成 |
| Invoice 系统 | 发票 CRUD、自动生成、行项目明细 | ✅ 完成 |

#### Phase 6-4: 分析与优化

| 功能 | 描述 | 状态 |
|------|------|------|
| Payment Analytics | 总收入、月度趋势、方法分布、转化漏斗 | ✅ 完成 |
| Payment Retry | 指数退避重试 (1s→2s→4s)，最大 3 次 | ✅ 完成 |
| Split Sync | 链上 vs 法币分账对比 | ✅ 完成 |
| 统一路由 | 微支付 → x402，大额 → Stripe 智能路由 | ✅ 完成 |
| Conversion Tracking | 6 事件类型追踪 (initiated/submitted/completed/failed/retried/method_selected) | ✅ 完成 |
| 订阅面板 | 套餐对比 (Starter/Pro/Enterprise)、使用统计 | ✅ 完成 |
| 计量使用面板 | 按量计费可视化、账单周期汇总 | ✅ 完成 |
| 发票列表 | 发票状态管理、PDF 生成 | ✅ 完成 |
| 支付历史 | 分页历史记录 + 统计摘要 | ✅ 完成 |

---

## 4. 技术栈详情

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.1 | App Router + Turbopack + SSR/CSR |
| React | 19.0.0 | UI 渲染 (Concurrent Mode) |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 4.x | 样式系统 |
| shadcn/ui | New York | 组件库 (47+ 组件) |
| Framer Motion | 12.x | 动画 (入场/悬浮/过渡) |
| Zustand | 5.x | 客户端状态 (3 Store) |
| TanStack Query | 5.x | 服务端状态 + 缓存 |
| ConnectKit | 1.9.2 | Web3 钱包连接 |
| Wagmi | 3.6.15 | 链上交互 |
| Viem | 2.x | 以太坊类型安全操作 |
| Recharts | 2.15.4 | 数据可视化 |
| Socket.IO Client | 4.8.3 | 实时通信 |
| Sonner | 2.0.6 | Toast 通知 |
| react-hook-form | 7.60.0 | 表单管理 |
| zod | 4.0.2 | Schema 验证 |
| Lucide React | 0.525.0 | 图标库 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js API Routes | 16.1.1 | RESTful API (49 端点) |
| Prisma | 6.11.1 | ORM (SQLite → PostgreSQL) |
| Stripe SDK | 22.1.1 | 法币支付 |
| @stripe/stripe-js | 9.6.0 | 前端 Stripe 集成 |
| next-auth | 4.24.11 | 身份认证 |
| sharp | 0.34.3 | 图像处理 |
| uuid | 11.1.1 | ID 生成 |

### 智能合约

| 技术 | 用途 |
|------|------|
| Solidity ^0.8.24 | 智能合约语言 |
| OpenZeppelin | 安全基础库 (ERC20/Ownable/ReentrancyGuard) |
| Foundry | 合约开发框架 |

### 基础设施

| 技术 | 用途 |
|------|------|
| Docker + Docker Compose | 容器化部署 |
| Caddy | 反向代理 / 网关 |
| Terraform | 基础设施即代码 |
| Bun | JavaScript 运行时 |
| Rust | 高性能引擎层 |

---

## 5. 组件清单 (33 Dashboard 组件)

| # | 组件名 | 文件 | 功能描述 |
|---|--------|------|----------|
| 1 | CognitiveCard | cognitive-card.tsx | 认知身份卡片 (.soul SBT) |
| 2 | SplitDashboard | split-dashboard.tsx | 动态分账仪表盘 |
| 3 | ResonanceWave | resonance-wave.tsx | 共振波形图 |
| 4 | CircuitPanel | circuit-panel.tsx | 熔断面板 |
| 5 | SkillVault | skill-vault.tsx | 技能库 |
| 6 | IFDDelegation | ifd-delegation.tsx | 流体民主委托 |
| 7 | CognitiveTimeline | cognitive-timeline.tsx | 认知时间线 |
| 8 | SecurityAudit | security-audit.tsx | 安全审计 |
| 9 | CompliancePanel | compliance-panel.tsx | 合规模型 |
| 10 | PerformanceDashboard | performance-dashboard.tsx | 性能仪表盘 |
| 11 | DeploymentCenter | deployment-center.tsx | 部署中心 |
| 12 | MonitoringCenter | monitoring-center.tsx | 监控中心 |
| 13 | FeatureFlags | feature-flags.tsx | 灰度发布 |
| 14 | MultichainDeploy | multichain-deploy.tsx | 多链部署 |
| 15 | SdkPlatform | sdk-platform.tsx | SDK 平台 |
| 16 | DaoGovernance | dao-governance.tsx | DAO 治理 |
| 17 | EcosystemHub | ecosystem-hub.tsx | 生态枢纽 |
| 18 | ContractsArch | contracts-arch.tsx | 合约架构 |
| 19 | EngineArch | engine-arch.tsx | 引擎架构 |
| 20 | Web3Integration | web3-integration.tsx | Web3 集成 |
| 21 | Web3Wallet | web3-wallet.tsx | Web3 钱包 |
| 22 | DataInfra | data-infra.tsx | 数据基建 |
| 23 | EngineStatusDashboard | engine-status.tsx | 引擎状态 |
| 24 | LPLiquidity | lp-liquidity.tsx | LP 流动性 |
| 25 | ContractSimulation | contract-simulation.tsx | 合约模拟 |
| 26 | AvatarMarketplace | avatar-marketplace.tsx | 分身市场 |
| 27 | NotificationCenter | notification-center.tsx | 通知中心 |
| 28 | X402Payment | x402-payment.tsx | x402 支付弹窗 |
| 29 | PaymentHistory | payment-history.tsx | 支付历史 |
| 30 | SubscriptionPanel | subscription-panel.tsx | 订阅面板 |
| 31 | MeteredUsage | metered-usage.tsx | 计量使用 |
| 32 | InvoiceList | invoice-list.tsx | 发票列表 |
| 33 | PaymentAnalytics | payment-analytics.tsx | 支付分析 |

所有组件均通过 `dynamic(() => import(...), { ssr: false })` 懒加载，首屏仅渲染 CognitiveCard + SplitDashboard。

---

## 6. API 路由清单 (49 端点)

### 核心 Dashboard API

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/dashboard` | GET | Dashboard 聚合数据 |
| `/api/seed` | POST | 数据库种子数据 |
| `/api/agent-info` | GET | Agent 信息 |
| `/api/route` | GET | 根路由 |

### 认知分身 & 技能

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/avatars` | GET, POST | 分身列表 / 创建 |
| `/api/avatars/[id]` | GET, PATCH | 分身详情 / 更新 |
| `/api/avatars/[id]/unlock-skill` | POST | 技能解锁 |
| `/api/skills` | GET, POST | 技能列表 / 创建 |
| `/api/delegations` | GET, POST, PATCH | 委托管理 |

### 收益 & 共振

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/revenues` | GET, POST | 收益记录 |
| `/api/resonance` | GET, POST | 共振分数据 |
| `/api/timeline` | (未独立实现，通过 dashboard 获取) | 时间线 |

### 安全 & 合规

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/security` | GET | 安全审计数据 |
| `/api/compliance` | GET, POST | 合规数据 |

### 合约 & 引擎

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/contracts-arch` | GET | 合约架构数据 |
| `/api/contracts/simulate` | GET, POST | 合约模拟 |
| `/api/engine-arch` | GET | 引擎架构数据 |
| `/api/engine-status` | GET | 引擎实时状态 |

### 运维 & 监控

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/performance` | GET | 性能指标 |
| `/api/deployment` | GET | 部署中心数据 |
| `/api/monitoring` | GET | 监控中心数据 |
| `/api/feature-flags` | GET, POST | 灰度发布 |

### Web3 & 多链

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/web3-integration` | GET | Web3 集成数据 |
| `/api/multichain` | GET | 多链部署数据 |
| `/api/dao-governance` | GET, POST | DAO 治理数据 |
| `/api/ecosystem` | GET | 生态枢纽数据 |
| `/api/sdk-platform` | GET | SDK 平台数据 |
| `/api/data-infra` | GET | 数据基建数据 |
| `/api/liquidity` | GET | LP 流动性数据 |

### 支付系统

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/payment` | GET, POST | 支付列表 / 创建 |
| `/api/payment/[id]` | GET, PATCH | 支付详情 / 更新 |
| `/api/payment/[id]/verify` | POST | 支付验证 |
| `/api/payment/initiate` | POST | 发起支付 |
| `/api/payment/history` | GET | 支付历史 |
| `/api/payment/analytics` | GET | 支付分析 |

### Stripe 集成

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/stripe/create-session` | POST | 创建 Checkout Session |
| `/api/stripe/webhook` | POST | Stripe Webhook 处理 |
| `/api/stripe/confirm` | POST | 支付确认 |
| `/api/stripe/refund` | POST | 退款处理 |
| `/api/stripe/subscription` | GET, POST, PATCH | 订阅管理 |
| `/api/stripe/usage` | GET, POST | 计量使用 |

### 发票 & 币种

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/invoice` | GET, POST | 发票列表 / 创建 |
| `/api/invoice/[id]` | GET, PATCH | 发票详情 / 更新 |
| `/api/currency` | GET, POST | 汇率查询 / 转换 |
| `/api/currency/update` | POST | 汇率更新 |

### 工具

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/download` | GET | 源代码下载 |
| `/api/llms-txt` | GET | LLM 友好文本 |
| `/api/sitemap` | GET | 站点地图 |

---

## 7. 智能合约概述

### 合约清单 (10 合约 + 9 接口 + 2 库)

| 合约 | 描述 | 关键功能 |
|------|------|----------|
| **AvatarCore** | .soul SBT 核心合约 | createAvatar, updateCognitionRoot, getAvatarProfile |
| **DynamicSplitter** | 动态收益分账 | executeSplit, getSplitConfig, 防重入 + 熔断检查 |
| **TokenVault** | LP 质押金库 | deposit (0.95x 铸造), withdraw (1.05x 销毁), 闪电贷保护 |
| **CircuitGuard** | 认知熔断器 | evaluateState, triggerRecovery, getCircuitState |
| **SkillVault** | 技能解锁 | unlockSkill, getSkillStatus |
| **IFDRouter** | 流体民主路由 | delegateVote, 按领域委托 |
| **ECEOracle** | 情绪共识预言机 | submitResonanceScore, 共振分更新 |
| **PoUEVerifier** | 理解力证明验证 | 证明生成与验证 |
| **MCPRouter** | MCP 模型上下文路由 | 能力路由与发现 |
| **GovernanceToken** | 治理代币 | 投票权管理 |

### 关键接口 (9 个)

`IAvatarCore`, `ISplitter`, `ITokenVault`, `ICircuitGuard`, `ISkillVault`, `IIFDRouter`, `IECEOracle`, `IGovernance`, `IMCPRouter`

### 关键库 (2 个)

| 库 | 描述 |
|------|------|
| **MathUtils** | calculateSplitConfig (共振分→BPS映射), splitAmount (守恒分账), calculateLpMint/Withdraw |
| **Errors** | 自定义错误 (ZeroAddress, ZeroAmount, AvatarNotFoundForSplit, FlashLoanDetected 等) |

### DynamicSplitter 核心逻辑

```
avatarAdj = clamp((70 - resonanceScore) × 50, 1500, 2500)
humanBps  = 7000
avatarBps = avatarAdj
protocolBps = 10000 - humanBps - avatarBps

守恒不变量: humanBps + avatarBps + protocolBps = 10000 (恒等于)
```

- 共振分越高 → 分身份额越高 (最低 15%, 最高 25%)
- 熔断状态检查: HARD_PAUSE 时阻止所有分账
- 支持 ETH 和 ERC-20 代币分账

### TokenVault 核心逻辑

```
deposit:  lpMinted = amount × 95 / 100   (0.95x 铸造系数)
withdraw: withdrawAmount = lpAmount × 105 / 100  (1.05x 销毁系数)
闪电贷保护: 同一 block.timestamp 不允许存取
```

---

## 8. 支付系统深入

### 双轨支付架构

```
                    ┌─────────────────────┐
                    │   Payment Request    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Smart Router       │
                    │  amount <= $5?       │
                    └──┬──────────────┬───┘
                       │              │
              ┌────────▼──┐    ┌─────▼────────┐
              │  x402     │    │   Stripe      │
              │ (链上微付) │    │ (法币支付)    │
              │  USDC     │    │  USD/EUR/...  │
              └────┬──────┘    └──────┬────────┘
                   │                  │
              ┌────▼──────────────────▼────┐
              │    Revenue Split Engine     │
              │  70% Human / 20% Vault /   │
              │  10% Protocol LP           │
              └────────────────────────────┘
```

### 支付流程详解

1. **x402 链上微支付流程**:
   - 用户点击 Quick Pay → X402Payment 弹窗
   - 风险评估: ≤$0.05 low / ≤$0.50 medium / >$0.50 high
   - 确认方式: wallet_sign (已连钱包) / biometric / auto_approved (模拟)
   - 创建 Payment 记录 → 确认 → 轮询状态 → 完成

2. **Stripe 法币支付流程**:
   - 用户选择订阅/一次性支付 → 创建 Checkout Session
   - 重定向到 Stripe → 支付 → Webhook 回调
   - 支付成功/取消 → URL 参数通知 → Toast 提示

3. **轮询机制**: 3 秒间隔，最多 20 次，用于确认支付状态

4. **重试机制**: 指数退避 (1s → 2s → 4s)，最大 3 次重试

5. **分账同步**: 链上 DynamicSplitter 的 BPS 与 Stripe 法币分账配置对比

6. **转化追踪**: 6 事件类型
   - `initiated`: 发起支付
   - `submitted`: 提交支付
   - `completed`: 支付完成
   - `failed`: 支付失败
   - `retried`: 重试支付
   - `method_selected`: 选择支付方式

7. **多币种**: 支持 USD/EUR/GBP/JPY/CNY/KRW，备选汇率兜底

### 订阅层级

| 层级 | 价格 | 包含功能 |
|------|------|----------|
| Starter | $9.99/月 | 5 Avatar calls/day, 基础技能包, 邮件支持 |
| Pro | $29.99/月 | 无限 Avatar calls, 高级技能包, 优先支持, 收益分析 |
| Enterprise | $99.99/月 | 无限制, 定制技能包, 专属支持, 链上分账, SLA 保障 |

---

## 9. 项目评分

> **说明**: 以下评分基于「演示原型/概念验证」的定位进行评估，而非生产级应用的标准。

### Code Quality: 6/10

**优点**:
- TypeScript 全栈类型安全，types.ts 定义了 100+ 接口/类型
- Prisma Schema 结构清晰，关系定义完整
- 智能合约遵循 OpenZeppelin 安全模式 (ReentrancyGuard, Ownable)
- 自定义 Errors 库避免魔法字符串
- API 路由统一 try/catch 错误处理

**不足**:
- 大量组件仍使用 mock 数据，API 端点多数返回硬编码数据而非数据库查询
- 部分组件代码过长 (security-audit.tsx, dao-governance.tsx 等超过 600 行)
- React 组件内存在业务逻辑混杂 (如 getRelativeTime 散布在多个组件)
- 缺少单元测试和集成测试覆盖
- 部分 `any` 类型和 `as` 断言

### Feature Completeness: 8/10

**优点**:
- 6 个开发阶段全部完成，功能覆盖面极广
- 33 Dashboard 组件覆盖从核心业务到运维监控的完整链路
- 49 API 端点提供全面的数据接口
- 双轨支付 (x402 + Stripe) 实现完整
- 10 个智能合约涵盖核心业务逻辑
- 实时通信 (6 微服务) 完整实现

**不足**:
- 大部分 API 仅返回 mock 数据，未真正接入数据库
- Web3 交互使用硬编码合约地址 (本地 Foundry 部署地址)
- 认证系统 (NextAuth) 已引入但未完整集成
- 缺少用户注册/登录流程

### UI/UX Design: 7/10

**优点**:
- 暗色主题一致性高 (#0F172A 基底 + violet 强调色)
- 33 组件全部采用 shadcn/ui 风格统一
- Framer Motion 入场动画流畅
- 懒加载优化首屏性能 (LazySection)
- 响应式布局 (移动端底部导航 + 桌面侧边栏)
- 支付弹窗交互清晰

**不足**:
- 单页应用，33 组件全部堆叠在一个长页面，缺少路由分割
- 移动端体验仍有提升空间 (部分组件在小屏幕上过于拥挤)
- 缺少骨架屏加载状态 (多数组件使用 spinner)
- 缺少深色/浅色主题切换
- 无面包屑导航，长页面容易迷失位置

### Architecture: 7/10

**优点**:
- 前后端分离清晰 (Next.js API Routes + Prisma)
- 微服务架构合理 (6 独立服务 + Caddy 网关)
- 状态管理分层 (Zustand 客户端 + TanStack Query 服务端)
- 网关路由设计优雅 (XTransformPort)
- Rust 高性能计算层预留

**不足**:
- 所有组件挤在单一路由 `/`，未利用 Next.js App Router 的路由能力
- 微服务间缺少服务发现和健康检查编排
- SQLite 在生产环境不可行，PostgreSQL 迁移方案仅在文档层面
- 缺少消息队列 (如 Redis) 处理异步任务
- Prisma 模型间部分关系缺少级联删除策略

### Security: 5/10

**优点**:
- 智能合约使用 ReentrancyGuard + Ownable
- TokenVault 实现闪电贷保护
- Stripe Webhook 签名验证框架
- API 路由统一错误处理

**不足**:
- 无认证中间件 (API 端点无鉴权保护)
- 无 CORS 配置 (或过于宽松)
- 无速率限制 (Rate Limiting)
- 合约地址硬编码 (本地 Foundry 地址暴露)
- Stripe Secret Key 使用占位符
- 无 CSRF 保护
- 缺少输入验证 (多数 POST 端点未验证请求体)
- 无 SQL 注入防护测试

### Internationalization: 7/10

**优点**:
- 支持 8 种语言 (zh/en/ja/ko/de/fr/es/ar)
- RTL 支持 (阿拉伯语)
- 主要组件已 i18n 化 (cognitive-card, split-dashboard, resonance-wave 等)
- 语言切换器组件化
- localStorage 持久化语言选择

**不足**:
- 部分 Dashboard 组件仍有硬编码中文 (约 27 个组件待迁移)
- 日期/数字格式化未本地化 (统一使用中文格式)
- 缺少复数形式处理 (如 "1 item" vs "2 items")
- 错误消息未国际化
- 缺少翻译完整性校验工具

### Documentation: 5/10

**优点**:
- Prisma Schema 注释完善 (中文)
- 智能合约 NatSpec 注释完整
- Caddyfile 注释详尽
- API 路由有基本的功能描述
- types.ts 类型注释完整

**不足**:
- 无 API 文档 (如 Swagger/OpenAPI)
- 组件缺少 Props 文档
- 无架构决策记录 (ADR)
- 无贡献指南
- 部分配置文件缺少说明
- 缺少变更日志

---

### 总评分

| 维度 | 评分 | 权重 | 加权分 |
|------|------|------|--------|
| Code Quality | 6/10 | 15% | 0.90 |
| Feature Completeness | 8/10 | 20% | 1.60 |
| UI/UX Design | 7/10 | 15% | 1.05 |
| Architecture | 7/10 | 15% | 1.05 |
| Security | 5/10 | 15% | 0.75 |
| Internationalization | 7/10 | 10% | 0.70 |
| Documentation | 5/10 | 10% | 0.50 |
| **Overall** | | **100%** | **6.55/10** |

### **Overall: 6.5/10**

> **总结**: BB Protocol 作为一个概念验证原型，功能覆盖面令人印象深刻——从核心业务逻辑到 DeFi、支付、Web3、监控等全链路打通。然而，作为一个演示项目，它在安全防护、代码可维护性和文档完整性上仍有明显不足。大部分 API 返回 mock 数据、缺少认证和输入验证、单路由架构限制了可扩展性。如果要在生产环境使用，需要大量安全加固和代码重构工作。

---

## 附录 A: 数据库模型统计 (35+ Models)

| 分类 | 模型数 | 模型名称 |
|------|--------|----------|
| 核心业务 | 7 | Avatar, Skill, AvatarSkill, Revenue, Delegation, TimelineEvent, ResonanceHistory |
| 支付订阅 | 5 | Payment, Subscription, UsageRecord, Invoice, CurrencyRate |
| 安全审计 | 2 | AuditLog, SecurityInvariant |
| LP 流动性 | 2 | LiquidityPool, LpTransaction |
| 合规 | 2 | CompliancePlugin, Jurisdiction |
| 合约模拟 | 1 | ContractSimulation |
| 性能 | 2 | PerformanceMetric, CacheStrategy |
| 链上部署 | 2 | ContractDeploymentRecord, MultiSigOperation |
| 监控 | 2 | MonitoringAlert, AnomalyRecord |
| 灰度发布 | 3 | FeatureFlagRecord, ABTestRecord, RollbackLog |
| 多链 | 3 | SupportedChain, CrossChainBridge, ChainSwitchRecord |
| SDK/API | 3 | ApiKeyRecord, SdkPackageRecord, WebhookRecord |
| DAO 治理 | 3 | GovernanceProposalRecord, DelegationRecord, TreasuryTransactionRecord |
| 生态 | 2 | ProtocolIntegrationRecord, EcosystemNotificationRecord |
| **合计** | **39** | |

## 附录 B: 自定义 Hooks 清单

| Hook | 文件 | 功能 |
|------|------|------|
| useI18n | use-i18n.ts | 8 语言 i18n |
| useDashboardData | use-dashboard-data.ts | Dashboard 数据获取 + 缓存 |
| useEngineStatus | use-engine-status.ts | 6 微服务实时状态 |
| useResonanceStream | use-resonance-stream.ts | 共振分实时流 |
| useMonitoringStream | use-monitoring-stream.ts | 监控指标实时流 |
| usePayment | use-payment.ts | 核心支付状态管理 |
| usePaymentPolling | use-payment-polling.ts | 3 秒轮询支付状态 |
| usePaymentRetry | use-payment-retry.ts | 指数退避重试 |
| useSplitSync | use-split-sync.ts | 链上 vs 法币分账对比 |
| useConversionTracking | use-conversion-tracking.ts | 支付转化事件追踪 |
| useWeb3 | use-web3.ts | Wagmi/ConnectKit 集成 |
| useWeb3Sync | use-web3-sync.ts | Wagmi → Zustand 同步 |
| useClientTime | use-client-time.ts | SSR 安全时间 (防 Hydration) |
| useMobile | use-mobile.ts | 移动端检测 |
| useQueries | use-queries.ts | TanStack Query 预配置 |
| useToast | use-toast.ts | Toast 通知 |
