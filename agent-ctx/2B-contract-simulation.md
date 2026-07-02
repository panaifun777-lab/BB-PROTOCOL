# Task 2-B: Contract Simulation Module

## Agent: Full-Stack Developer

## Summary
Built the Contract Simulation module for the AI分身系统 (Cognitive Avatar Protocol) project, including an interactive UI component and API route.

## Files Created
1. **`src/app/api/contracts/simulate/route.ts`** - API route with POST (simulation) and GET (verification/info) handlers
2. **`src/components/dashboard/contract-simulation.tsx`** - Full interactive contract simulation panel with 3 tabs

## Files Modified
1. **`src/app/page.tsx`** - Added ContractSimulation import, FlaskConical nav item, and Row 6 integration

## Key Implementation Details

### API Route (route.ts)
- **POST** `/api/contracts/simulate` - Accepts `{contract, function, params}`, returns simulation result + gas estimate + verification
- **GET** `/api/contracts/simulate?mode=verify&totalAmount=X&humanBps=X&avatarBps=X&protocolBps=X` - Split conservation verification
- **GET** `/api/contracts/simulate` - Returns available contracts list and gas price info
- 6 contracts fully simulated: AvatarCore, DynamicSplitter, CircuitGuard, SkillVault, IFDRouter, TokenVault
- All simulation logic is deterministic (no Math.random)
- DynamicSplitter uses: `avatarAdj = clamp((70 - resonanceScore) × 50, 1500, 2500)`

### UI Component (contract-simulation.tsx)
- **3 tabs**: 函数模拟 (Simulate) | 分账验证 (Verify) | 历史 (History)
- Local deterministic simulation engine (no API call needed for UI)
- DynamicSplitter: Split visualization bar + dynamic adjustment formula display
- CircuitGuard: State transition visualization with color-coded badges
- Gas estimation panel with optimization suggestions
- Split verification with conservation formula and visual amounts
- Simulation history tracking (up to 20 entries)
- Dark theme (slate-800/80), violet/emerald/amber accents
- Framer Motion animations for results, tabs, and history entries

### Integration
- Added "模拟" nav item with FlaskConical icon
- Row 6 full-width in dashboard grid
- Lint: 0 errors
