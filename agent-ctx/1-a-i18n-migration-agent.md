# Task 1-a: i18n Migration for 3 Dashboard Components

## Summary
Replaced all hardcoded Chinese strings with `t()` calls in 3 dashboard components and added 38 new i18n keys to all 8 language files.

## Components Migrated
1. **cognitive-card.tsx** — 20 Chinese strings → t() calls
2. **split-dashboard.tsx** — 15 Chinese strings → t() calls
3. **resonance-wave.tsx** — 14 Chinese strings → t() calls

## New Keys Added (38 keys × 8 languages)
- **avatar** section: 17 new keys (tierStarter, tierPro, tierEnterprise, human, vault, lp, resonanceDescription, normalZone, softLimitZone, hardPauseZone, skillPack, skillUsageSatisfaction, skillUnlockThreshold, annualRevenue, viewTimeline, adjustDelegation, circuitSettings)
- **revenue** section: 11 new keys (subtitle, humanShareLabel, avatarVaultLabel, protocolLPLabel, vsLastMonth, resonanceRule, monthlyTrend, sourceRental, sourceCollaboration, viewDetailedLog, monthSuffix)
- **resonance** section: 11 new keys — entirely new section (title, subtitle, normalOperation, softLimit, hardPause, recovery, dangerZone, warningZone, safeZone, softLimitActive, hardPauseTriggered)

## Reused Existing Keys
- avatar.cognitionRoot, avatar.resonanceScore, avatar.circuitState
- revenue.title, revenue.dynamicAdjustment, revenue.recentSplits, revenue.skillCall
- skills.avgCost

## Technical Notes
- Helper functions (getTierLabel, getSourceLabel, getCircuitBadge) modified to accept `t` as parameter
- RevenueSplitBar sub-component uses its own `useI18n()` hook
- split-dashboard uses `locale` in useMemo deps for correct locale-change re-render
- Chart tickFormatter uses `t('revenue.monthSuffix')` for the "月" suffix

## Verification
- ESLint: zero errors on all 3 modified components
- Dev server: compiling normally
