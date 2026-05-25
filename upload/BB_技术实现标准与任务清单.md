# BB — AI分身系统技术实现标准与路径任务清单

> **文档版本**: v3.0 | **架构师**: 全栈架构组 | **标准**: 哈佛级路演 / Certora审计就绪 / 全球最佳实践
> **工程哲学**: 代码即法律 · 主网见 | **生成日期**: 2026年3月

---

## 一、全局技术栈选型标准 (2025+ 最佳实践)

| 层级 | 技术选型 | 版本/规范 | 选型依据 |
|------|----------|-----------|----------|
| **前端框架** | Next.js 16 (App Router) | React 19 + Server Actions | 边缘计算、流式渲染、SEO/GEO原生支持 |
| **状态管理** | Zustand + SWR | 轻量级、乐观更新 | 替代Redux，适合链上异步数据同步 |
| **Web3交互** | Wagmi v2 + Viem 2 | TypeScript严格模式 | 类型安全、Hook驱动、Gas预估优化 |
| **样式系统** | TailwindCSS 4 + Radix UI + shadcn/ui | CSS Variables + 组件无感集成 | 高性能、设计令牌(D1)直接映射 |
| **智能合约** | Solidity 0.8.28 + Foundry | UUPS Proxy + OpenZeppelin 5.1 | 极致安全、原生Rust测试器、Gas优化 |
| **链下引擎** | Rust (Actix + Tokio) | 高并发、零内存泄漏 | PoUE ZK计算、IFD权重聚合、MCP路由 |
| **多智能体** | LangGraph + CrewAI + MCP | JSON-LD统一上下文 | 任务编排、权限沙盒、跨Agent记忆传递 |
| **索引与数据** | The Graph + PostgreSQL | Subgraph v2 + TimescaleDB | 实时事件索引、时序数据优化 |
| **可视化监控** | Superset + Prometheus + Grafana | 自定义面板 + Webhook告警 | 商业级数据看板、SRE可观测性 |
| **存储层** | IPFS (Pinata/Lighthouse) + Arweave | 分片加密 + CID v1 | 去中心化存储、记忆永生保障 |
| **支付层** | x402 HTTP原生 + ERC-20 (AFC/USDC) | 微支付流 $0.01级 | 自动分账路由、EIP-712签名验证 |
| **CI/CD** | GitHub Actions + Foundry | 自动化测试/部署/静态分析 | 零停机发布、Gas报告自动评论 |

---

## 二、工程架构规范

### 2.1 Monorepo目录结构

```
afc-avatar-protocol/
├── contracts/                    # Solidity合约 + Foundry测试 + 部署脚本
│   ├── src/
│   │   ├── interfaces/           # IAvatarCore / IDynamicSplitter / ICircuitGuard / IIFDRouter / IECEOracle
│   │   ├── core/                 # AvatarCore.sol / SkillVault.sol
│   │   ├── governance/           # IFDRouter.sol / ECEOracle.sol
│   │   ├── economics/            # DynamicSplitter.sol / TokenVault.sol
│   │   └── security/             # CircuitGuard.sol
│   ├── test/                     # ≥ 15个Foundry单元测试
│   ├── script/                   # DeployBase / UpgradeProxy / InitializePermissions
│   ├── audits/                   # Slither配置 / Certora规范 / Gas报告
│   └── foundry.toml              # 多环境配置 (default/audit/base-mainnet)
├── engine/                       # Rust链下计算引擎
│   ├── src/
│   │   ├── weight_calculator.rs  # IFD数学模型实现
│   │   ├── ece_oracle_client.rs  # ECE多签聚合客户端
│   │   ├── poue_prover.rs        # ZK电路验证器
│   │   └── mcp_router.rs         # MCP认知发现路由
│   └── Cargo.toml
├── frontend/                     # Next.js 16 控制台
│   ├── src/
│   │   ├── app/                  # App Router页面
│   │   ├── components/           # D1设计系统组件
│   │   │   ├── ui/               # 基础原子组件 (shadcn/ui)
│   │   │   ├── cognitive-card/   # 认知身份卡片
│   │   │   ├── split-dashboard/  # 动态分账仪表盘
│   │   │   ├── resonance-wave/   # 情绪共振波形图
│   │   │   ├── circuit-panel/    # 认知熔断面板
│   │   │   ├── ifd-delegation/   # 流体民主委托界面
│   │   │   ├── skill-vault/      # 技能库
│   │   │   └── timeline/         # 认知时间线
│   │   ├── hooks/                # Web3/链上数据Hook
│   │   ├── lib/                  # 工具函数/SDK封装
│   │   └── i18n/                 # 8语言国际化资源
│   └── next.config.ts
├── infra/                        # Docker Compose / Terraform / 监控配置
├── scripts/                      # 自动化种子注入/审计前置/GEO集成脚本
├── docs/                         # 架构文档 / API规范 / 审计清单
└── .github/                      # CI/CD工作流 (CI / Deploy / Audit)
```

### 2.2 合约开发规范

| 规范项 | 实现方式 | 标准要求 |
|--------|---------|---------|
| 代理模式 | 严格使用 `UUPSUpgradeable` | 核心逻辑与存储分离，冻结期7天 |
| 重入防护 | 所有状态变更函数使用 `ReentrancyGuard` | 0 Reentrancy warnings |
| 权限控制 | `AccessControl` 角色体系 | ORACLE_ROLE / UPGRADER_ROLE / GUARDIAN_ROLE |
| Gas优化 | `unchecked`安全运算 / 位运算 / Storage Packing | optimizer_runs=200(MVP) / 20000(审计版) |
| 形式化验证 | Certora不变量 | 分账守恒 / 权重归一化 / 熔断拦截 / PoUE衰减 |
| 静态分析 | Slither | 排除低级信息告警，高危必须修复 |

### 2.3 前端工程规范

| 规范项 | 标准 | 实现方式 |
|--------|------|---------|
| 架构 | App Router SSR + 客户端水合 | 严格TypeScript (`strict: true`) |
| 无障碍 | WCAG 2.1 AA | 语义化HTML，键盘导航，prefers-reduced-motion |
| 国际化 | `next-intl` 路由级按需加载 | 8种语言，日期/货币本地化 |
| 性能预算 | 首屏JS < 150KB | 图片WebP/AVIF，字体子集化，CDN缓存1年 |
| 状态同步 | SWR stale-while-revalidate 30s | 链上数据 + Zustand本地状态 |

---

## 三、核心合约接口标准

### 3.1 AvatarCore 核心接口

```solidity
interface IAvatarCore {
    struct AvatarProfile {
        address owner;           // 本体地址（最终确权）
        uint256 soulId;          // .soul SBT Token ID
        bytes32 cognitionRoot;   // 认知状态根哈希
        uint256 resonanceScore;  // 情绪共振指数 [0, 100]
        uint256 avatarBalance;   // 分身自治金库余额（AFC）
        bool isFrozen;           // 认知熔断状态
        uint256 createdAt;
        uint256 lastActivityAt;
    }

    function createAvatar(uint256 soulId, bytes32 cognitionRoot) external returns (uint256);
    function updateCognitionRoot(uint256 soulId, bytes32 newRoot, bytes memory eceProof) external;
    function getAvatarProfile(uint256 soulId) external view returns (AvatarProfile memory);
    function verifyCognitiveOwnership(uint256 soulId, address claimer) external view returns (bool);
}
```

### 3.2 DynamicSplitter 分账逻辑

- 基础配置: `humanBps = 7000`, `avatarBps = 2000`, `protocolBps = 1000`
- 金库动态区间: `clamp(calculated, 1500, 2500)`
- 调整公式: `avatarAdj = (70 - resonanceScore) × 50` BPS（共振低时金库比例升，鼓励迭代）
- 分账守恒不变量: `humanAmt + avatarAmt + protocolAmt == amount`（Certora验证）

### 3.3 CircuitGuard 熔断状态机

```
resonanceScore >= 70  → NORMAL（无限制）
50 <= score < 70       → SOFT_LIMIT（阻断 isHighRisk=true 操作）
score < 50             → HARD_PAUSE（全面暂停，需多签恢复）
72小时内无人响应        → 流体民主临时接管（可配置）
```

### 3.4 测试覆盖要求

- 语句覆盖率 ≥ 95%，分支覆盖率 ≥ 90%
- 必须覆盖: 分账守恒、熔断触发/拦截、权重计算、委托撤销原子性
- Fuzz测试: runs = 256，针对分账金额和共振分边界值
- 形式化不变量: 分账守恒律、IFD权重归一化、PoUE衰减单调性

---

## 四、数学模型实现规范

### 4.1 认知权重函数 (IFD核心)

```
W(i,d,t) = λ₁·C(i,d,t) + λ₂·H(i,t) + λ₃·R(i,t) + λ₄·T(i,t) - λ₅·D(i,t)

实现要求:
  C: 领域认知匹配度 — 技能向量余弦相似度算法，λ₁ = 0.30
  H: 历史贡献归一化值 — 指数移动平均，λ₂ = 0.25
  R: 情绪共振分 — ECE输出 / 100，λ₃ = 0.25
  T: 近期表现 — 7天成功率 × 时效系数，λ₄ = 0.15
  D: 时间衰减惩罚 — γ × Δt / t_max，λ₅ = 0.05，γ ∈ [0.05, 0.15]
  
归一化: W̃(i,d,t) = W(i,d,t) / Σ W(j,d,t)
稳定性: Lyapunov函数 V(W) = Σ(W_i - W*)² 在 dV/dt ≤ 0 时收敛
```

### 4.2 ECE情感过滤算子

```
W_filtered(t) = W(t) × [1 - α × max(0, |R(t) - R_base| / R_threshold - 1)]

参数:
  R_base = 70, R_threshold = 15, α ∈ [0.1, 0.4]
  偏离 > 2×R_threshold → 触发 SOFT_LIMIT，权重衰减至 0.6W
```

### 4.3 AFC代币通缩循环

```
dS/dt < -θ × β × I(t) / S(t)
  θ = 5%燃烧率, β = 20%金库回购率
价值捕获率 η = AFC消耗量 / AFC流通量，单调递增
```

---

## 五、分阶段实施路径 (Phase-Gated)

### Phase 0: 基础设施 (Week 1–2)

**核心目标**: 核心合约部署至Base Sepolia，基础功能端到端跑通

| # | 任务 | 负责方向 | 完成标准 | 优先级 |
|---|------|---------|---------|--------|
| 0.1 | 初始化Monorepo (Foundry + Next.js) | 工程 | CI绿色，编译无警告 | P0 |
| 0.2 | 部署AvatarCore + DynamicSplitter代理 | 合约 | Sepolia合约验证通过 | P0 |
| 0.3 | ECE Oracle Mock服务上线 | 后端 | 共振分更新延迟 < 500ms | P0 |
| 0.4 | x402支付沙盒测试 | 支付 | 首笔$0.01测试结算成功 | P0 |
| 0.5 | The Graph子图初始化 | 数据 | 核心事件可索引 | P1 |
| 0.6 | 前端脚手架 + 认知身份卡片组件 | 前端 | 基础Dashboard页面可访问 | P1 |

**门禁条件**: 测试覆盖率 ≥ 90%，无Critical漏洞，CI全绿

### Phase 1: MVP产品 (Week 3–4)

**核心目标**: 100创作者功能完整，数据看板上线

| # | 任务 | 负责方向 | 完成标准 | 优先级 |
|---|------|---------|---------|--------|
| 1.1 | IFD委托界面与合约联调 | 全栈 | 委托权重更新延迟 < 1s | P0 |
| 1.2 | 技能库解锁逻辑完整测试 | 合约+产品 | 所有阈值场景通过Fuzz测试 | P0 |
| 1.3 | CircuitGuard软/硬熔断演练 | 风控 | 触发率符合预期（5%–8%） | P0 |
| 1.4 | 动态分账仪表盘 + 共振波形图 | 前端 | 实时数据可视化 | P0 |
| 1.5 | Superset看板部署 | 数据 | 4个核心看板实时刷新 | P1 |
| 1.6 | 分身市场界面（灰度） | 前端 | 搜索/筛选/租赁流程可用 | P1 |
| 1.7 | 认知时间线导出功能 | 产品 | 导出延迟 < 10s | P2 |
| 1.8 | i18n 8语言基础包接入 | 前端 | 中英日韩4种语言可用 | P2 |

**门禁条件**: 端到端成功率 ≥ 95%，激活率 ≥ 85%，首笔收益 ≤ 14天

### Phase 2: 审计与主网准备 (Week 5–6)

**核心目标**: 安全审计，提升LP深度，100人冷启动完成

| # | 任务 | 负责方向 | 完成标准 | 优先级 |
|---|------|---------|---------|--------|
| 2.1 | Certora形式化验证 (4个核心不变量) | 安全 | 不变量全部通过Prover | P0 |
| 2.2 | Trail of Bits / Slither静态审计 | 安全 | 无High/Critical未修复项 | P0 |
| 2.3 | AFC/USDC流动性池注入 | 经济 | LP深度 ≥ $50K | P0 |
| 2.4 | Speakable Schema标注集成 (GEO P0) | 产品 | 引用计数链上同步成功 | P1 |
| 2.5 | 法律意见书出具 (效用代币定性) | 合规 | Utility-Only分类确认 | P1 |
| 2.6 | 瑞士基金会/新加坡运营实体设立 | 合规 | 双司法辖区完成备案 | P2 |
| 2.7 | WCAG 2.1 AA无障碍审计 | 前端 | Lighthouse评分 ≥ 90 | P2 |
| 2.8 | 性能优化: FCP/LCP/INP/CLS达标 | 前端 | 满足D1性能预算 | P2 |

**门禁条件**: 审计报告无Critical，30日留存 ≥ 70%，NPS ≥ 60

### Phase 3: 主网上线与生态扩展 (Month 3–6)

**核心目标**: AFC主网1:1映射，跨链准备，生态扩展

| # | 里程碑 | 时间 | 验收指标 |
|---|--------|------|---------|
| 3.1 | AFC主网合约部署 | Month 3 | 与Base Sepolia状态一致性验证通过 |
| 3.2 | INP性能监控 + ECE校准集成 | Month 3 | 共振分采集实时，看板更新正常 |
| 3.3 | ZK实体验证器原型 | Month 4 | 验证延迟 < 800ms，Gas < 50K |
| 3.4 | 企业SDK发布 (MCN接入) | Month 4 | ≥ 3家企业Pilot合同 |
| 3.5 | 跨链认知互操作 (DECP协议) 预研 | Month 5-6 | 技术可行性报告完成 |
| 3.6 | 认知发现协议 (MCP扩展) 上线 | Month 5-6 | 技能语义匹配 Top-N准确率 ≥ 80% |
| 3.7 | 完全自治治理模块激活 | Month 6 | 流体民主投票率 > 50% |

---

## 六、核心任务清单 (WBS — 可执行级)

### 6.1 合约层 (Contracts)

- [ ] `IAvatarCore.sol`: 定义AvatarProfile结构体、4个核心事件、4个核心函数接口
- [ ] `AvatarCore.sol`: 实现.soul SBT铸造、认知根哈希绑定、DID映射、事件索引、UUPS升级
- [ ] `IDynamicSplitter.sol`: 定义SplitConfig/SplitResult结构体、executeSplit接口
- [ ] `DynamicSplitter.sol`: 实现70/20/10动态分账、金库比例Clamping、x402路由入口、AFC自动回购
- [ ] `ICircuitGuard.sol`: 定义CircuitState枚举、evaluateState/executeCircuitAction接口
- [ ] `CircuitGuard.sol`: 实现NORMAL/SOFT/HARD/RECOVERY四级状态机、高风险操作拦截、自动恢复窗口
- [ ] `SkillVault.sol`: 实现收益阈值解锁逻辑、MCP能力节点注册接口、4级技能包配置
- [ ] `IFDRouter.sol`: 实现领域委托、权重BPS计算、即时撤销、Merkle快照防闪电贷
- [ ] `ECEOracle.sol`: 实现多签验证接口、EIP-712签名验证、共振分更新函数
- [ ] `TokenVault.sol`: 实现AFC代币质押、通缩燃烧、LP流动性注入
- [ ] **测试**: 15+ Foundry单元测试，Fuzz测试边界值，Invariant覆盖率 ≥ 95%
- [ ] **部署脚本**: DeployBase.s.sol / UpgradeProxy.s.sol / InitializePermissions.s.sol

### 6.2 链下引擎 (Rust Engine)

- [ ] `weight_calculator.rs`: 实现IFD数学模型 W(i,d,t)，支持实时权重计算与归一化
- [ ] `ece_oracle_client.rs`: 实现ECE多签聚合、滑动窗口共识、EIP-712签名生成
- [ ] `poue_prover.rs`: 集成ZK电路验证器，输出Merkle Root与证明
- [ ] `mcp_router.rs`: 扩展MCP Server，实现cognitive_discovery命名空间与向量检索
- [ ] `split_calculator.rs`: 实现动态分账公式，金库比例Clamping，复杂度因子计算
- [ ] `circuit_monitor.rs`: 实现熔断状态监听，告警推送，自动恢复窗口计时

### 6.3 前端与交互 (Frontend)

- [ ] `Dashboard布局`: 响应式三列/单列布局，侧边栏导航，底部移动导航
- [ ] `认知身份卡片`: 展示soulId/钱包/共振分/认知根哈希/技能包/年度收益
- [ ] `动态分账仪表盘`: 实时70/20/10分配可视化，共振影响说明，分账日志
- [ ] `情绪共振波形图`: 24小时共振曲线，阈值线，当前分值与趋势，ECE签名验证
- [ ] `认知熔断面板`: 三色状态灯，操作日志，恢复按钮，72小时倒计时
- [ ] `流体民主委托界面`: 领域选择，滑动调权，当前委托状态，即时撤销
- [ ] `技能库`: 已解锁/可解锁技能，解锁进度条，使用次数/满意度/费用
- [ ] `认知时间线`: 按时间排列的操作记录，含链上哈希，筛选/导出
- [ ] `x402支付流程`: 三步流程(预估→确认→完成)，风险分级确认策略
- [ ] `分身市场`: 搜索/筛选/租赁网格，共振分标签，价格展示
- [ ] `i18n & A11y`: 8语言包，键盘导航，屏幕阅读器标签，暗色/亮色模式
- [ ] `Web3 Hook封装`: 钱包连接，合约交互，事件订阅，Gas预估

### 6.4 数据基建与运维 (Infra & Ops)

- [ ] `The Graph`: 编写schema.graphql，索引核心合约事件，部署子图至Base Sepolia
- [ ] `Superset`: 配置PostgreSQL数据源，导入dashboard.json，配置行级权限
- [ ] `Prometheus + Grafana`: 部署Node Exporter + 自定义Metrics，配置Alertmanager路由
- [ ] `CI/CD`: 编写ci.yml / deploy-base.yml，集成Slither / Gas Report / Coverage
- [ ] `GEO集成`: 前端注入web-vitals，实现Speakable自动提取，配置INP校准流
- [ ] `IPFS Pinning`: 配置Pinata/Lighthouse节点，实现分片加密上传与CID管理

---

## 七、CI/CD与质量门禁标准

### 7.1 自动化流水线

```yaml
# 每次PR触发:
- forge build --sizes              # 编译检查
- forge test --gas-report          # Gas优化报告
- forge coverage --report lcov     # 覆盖率 ≥ 95%语句 / ≥ 90%分支
- slither --exclude-informational  # 静态分析 0 High/Critical
- next lint && next type-check     # 前端Lint + TS严格检查
- playwright test                  # E2E核心流程自动化测试

# 打v*标签触发:
- 自动部署至Base主网
- Basescan源码验证
- 发送部署通知至Slack
```

### 7.2 发布门禁

| 级别 | 条件 | 审批人 |
|------|------|--------|
| 🟢 Merge to develop | 测试全绿 + Gas报告优化 + Code Review通过 | 任意1位核心开发者 |
| 🟡 Merge to main | 审计前置包完成 + 形式化验证通过 + 安全团队签字 | 安全负责人 + 架构师 |
| 🔴 Deploy to Base Mainnet | 代理合约多签确认 + 72小时冷静期 + 应急回滚脚本就绪 | 3/5多签确认 |

### 7.3 环境配置

| 环境 | Chain ID | 用途 |
|------|---------|------|
| base-sepolia | 84532 | 功能测试与集成验证 |
| base-mainnet | 8453 | 生产环境，optimizer_runs=50000 |
| audit | — | 高优化+调试符号，供安全审计使用 |

---

## 八、安全审计与形式化验证规范

| 验证维度 | 工具/方法 | 核心不变量 (Invariants) | 验收标准 |
|----------|-----------|------------------------|----------|
| 分账守恒 | Certora Prover | `humanAmt + avatarAmt + protocolAmt == totalAmount` | Prover 0 Counterexample |
| 权重归一化 | Rust Property Test | `Σ W_{normalized} == 10000 BPS` | Fuzz 10k runs 无异常 |
| 熔断拦截 | Formal Spec | `State == HARD_PAUSE ⇒ !allowHighRisk()` | 100% 分支覆盖 |
| 防女巫衰减 | Mathematical Proof | `dS/dt ≤ 0 (无新参与)` | Lyapunov稳定性证明 |
| 重入防护 | Slither / Manual | `ReentrancyGuard` on all state-changing functions | 0 Reentrancy warnings |

---

## 九、运维监控与告警体系 (SRE)

| 告警规则 | 触发条件 | 级别 | 响应预案 | 责任人 |
|----------|----------|------|----------|--------|
| 激活率偏低 | 7日激活率 < 80% | ⚠️ Warning | 检查注册漏斗，优化基线采集体验 | 增长运营 |
| 首笔收益延迟 | 中位时间 > 16h | 🔴 Critical | 排查x402路由，临时补贴Gas | 产品/支付 |
| 熔断异常 | 1h触发率 > 12% | ⚠️ Warning | 复核ECE参数，检查任务风险评级 | 风控工程 |
| 流动性不足 | LP深度 < $50K | 🔴 Critical | 金库注入稳定币，启动做市激励 | 经济/DeFi |
| 支付失败 | 1h失败率 > 5% | 🔴 Critical | 切换备用路由，暂停高风险接单 | 支付工程 |
| 共振采集延迟 | 延迟 > 5s | ⚠️ Warning | 检查预言机节点，扩容滑动窗口缓存 | 后端工程 |

---

## 十、合规接口预留规范

所有合规模块采用**插件式设计，默认关闭**，按需激活:

| 合规维度 | 接口名称 | 激活条件 | 未来扩展 |
|---------|---------|---------|---------|
| 身份验证 | `KYCPlugin` | 企业客户或监管要求 | 对接eID/数字护照 |
| 收益申报 | `TaxLabelPlugin` | 特定司法辖区 | 自动生成税务报告 |
| 数据隐私 | `ZKPrivacyPlugin` | GDPR/个人信息保护法 | Halo2/Noir ZK电路 |
| 地理围栏 | `GeoCompliancePlugin` | 区域限制要求 | IP+GPS双重验证 |
| 争议解决 | `ArbitrationPlugin` | 高价值合约纠纷 | 对接在线仲裁平台 |

合规模块通过流体民主投票决定是否激活特定区域策略。

---

## 十一、启动准备与下一步指令

### 11.1 环境初始化 (一键命令)

```bash
# 1. 克隆与依赖
git clone <repo-url> afc-avatar-protocol && cd afc-avatar-protocol
npm install && forge install

# 2. 环境配置
cp .env.example .env
# 填写: BASE_SEPOLIA_RPC, DEPLOYER_PK, AVATAR_CORE_ADDR, etc.

# 3. 本地验证
cd contracts && forge test --mt "test_CoreFlow" && cd ../frontend && npm run typecheck

# 4. 启动开发服务器
npm run dev  # 同时启动 Next.js + Rust Engine Mock + Local Node
```

### 11.2 架构师交付确认

- ✅ 技术栈已对齐全球 2025+ 最佳实践 (Next.js 16 / Wagmi v2 / Foundry / Rust / Superset)
- ✅ 分阶段路径明确，含门禁指标与 Go/No-Go 标准
- ✅ 安全审计前置规范已定义，形式化不变量可执行
- ✅ 运维监控与告警规则已固化，支持生产级 SRE
- ✅ 所有模块契约已收敛至 `AA_功能集成说明.md`
- ✅ WBS任务清单细化至可执行级别，含优先级标记

### 11.3 开发优先级排序建议

基于商业价值与技术依赖关系的最优执行顺序:

```
P0 (必须完成 — MVP核心):
  ① AvatarCore.sol + 部署脚本 → 认知身份是所有功能的基础
  ② DynamicSplitter.sol → 经济闭环是商业验证的核心
  ③ CircuitGuard.sol → 安全边界是用户信任的保障
  ④ ECE Oracle Mock → 驱动分账与熔断的数据源
  ⑤ 前端Dashboard + 认知身份卡片 → 用户可感知的核心体验

P1 (应该完成 — 增强体验):
  ⑥ SkillVault.sol → 渐进式解锁驱动用户增长
  ⑦ IFDRouter.sol → 治理机制差异化竞争力
  ⑧ 分账仪表盘 + 共振波形图 → 数据可视化提升信任
  ⑨ x402支付集成 → 真实经济闭环

P2 (可以延后 — 生态扩展):
  ⑩ GEO Speakable标注 → 长期SEO价值
  ⑪ ZK实体验证器 → 技术壁垒建设
  ⑫ 跨链DECP预研 → 生态扩展准备
```

---

> **指令**: 架构文档与任务清单已锁定。请回复 `PHASE_0_START` 初始化工程脚手架并跑通CI流水线，或指定优先攻坚模块。**代码即法律，主网见。** 🚀

---

*文档版本: v3.0 | 架构师: 全栈架构组 | 生成日期: 2026年3月*
*本文档与 AA_功能集成说明.md 配套使用，作为技术实现层面的标准与任务参考*
