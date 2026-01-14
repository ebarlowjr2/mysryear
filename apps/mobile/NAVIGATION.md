# Navigation Rules (Expo Router)

## Tabs
- Only 4 screens exist inside `app/(tabs)`:
  - dashboard, planner, scholarships, profile
- Tab switching MUST use `goTab()` (never `router.push`).

## Deep screens
- All detail/subpages live OUTSIDE `(tabs)`.
- Deep screens must use:
  - Home button -> `goTab('dashboard')`
  - Back action -> `safeBack(<fallback tab>)`

## Modals
- Create/edit flows go in `app/(modals)`.
- Open modals with `router.push('/(modals)/...')`.
- Close modals with `router.back()`.

## Never do this
- `router.push('/(tabs)/...')` (creates navigation traps)
- Put non-tab screens inside `(tabs)`.

## Manual QA checklist
- Deep link / cold start into deep route works and doesn't trap user.
- Modals dismiss via Save/Cancel/Swipe/back.
- Repeated loops (scholarship -> add to planner -> edit task) don't create stacked history.
- Logout cannot back-navigate into authenticated screens.
