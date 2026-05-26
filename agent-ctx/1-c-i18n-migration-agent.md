# Task 1-c: i18n Migration for 3 Dashboard Components

## Agent: i18n Migration Agent
## Status: Completed

## Summary
Successfully replaced all hardcoded Chinese strings with `t()` calls in 3 dashboard components:
1. `avatar-marketplace.tsx` - 分身市场
2. `cognitive-timeline.tsx` - 认知时间线
3. `notification-center.tsx` - 通知中心

## Key Decisions
- **Marketplace mock data**: Kept Chinese values in data arrays (used as filter/search keys), but created translation mapping objects (DOMAIN_LABEL_KEYS, SKILL_LABEL_KEYS, AVATAR_NAME_KEYS) for display
- **Timeline event types**: Changed `label` to `labelKey` field in EVENT_TYPE_CONFIG, FILTER_LABELS → FILTER_LABEL_KEYS
- **Notification mock data**: Changed `title`/`message` to `titleKey`/`messageKey` fields
- **getRelativeTime()**: Added `t: TranslateFn` parameter for i18n-aware relative time strings

## New i18n Keys Added (70 total)
- `marketplace.*` - 44 keys (title, search, domains, sorts, names, skills)
- `notifications.*` - 16 keys (title, relative time, actions, mock data)
- `timeline.*` - 10 additional keys (recordCount, labels, emptyFilter, exportAll, subscribeUpdates)

## Files Modified
- 3 component files
- 8 language files (zh, en, ja, ko, es, fr, de, ar)

## Lint Status
- Zero errors in modified files
- Pre-existing errors in `add-i18n-keys.js` (unrelated)
- Dev server compiling normally
