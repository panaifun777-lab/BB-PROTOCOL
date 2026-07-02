# Task: hotfix - Add missing i18n keys

## Summary
Added 18 missing i18n keys to the `features` section in all 8 language files to prevent runtime errors in `src/components/dashboard/feature-flags.tsx`.

## Keys Added
`codeMerge`, `autoTest`, `canaryDeploy5`, `pipelineTraffic5`, `pipelineTraffic`, `gradualExpand`, `gradualRollout`, `fullRelease100`, `fullRelease`, `errorRate`, `p95Latency`, `crashRate`, `canaryMetrics`, `canaryDeploy`, `startLabel`, `endLabel`, `rolloutProgress`, `statusVoting`

## Files Modified
- `src/lib/messages/zh.json`
- `src/lib/messages/en.json`
- `src/lib/messages/ja.json`
- `src/lib/messages/ko.json`
- `src/lib/messages/es.json`
- `src/lib/messages/fr.json`
- `src/lib/messages/de.json`
- `src/lib/messages/ar.json`

## Verification
- `bun run lint` passed with no errors
