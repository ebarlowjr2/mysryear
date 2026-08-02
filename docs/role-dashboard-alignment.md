# Role-Based Dashboard and Profile Alignment

## Purpose

MySRYear is a multi-role planning platform. `/dashboard` is now a role resolver instead of a mixed command center.

## Dashboard Routing

- `student` -> `/dashboard/student`
- `parent` -> `/dashboard/family`
- `guardian` -> `/dashboard/family`
- `counselor` -> `/dashboard/counselor`
- `business` -> `/business/dashboard`

The resolver lives in `apps/web/src/lib/dashboard-roles.ts` and is used by the root dashboard route and top navigation.

## Role Experience

- Student dashboard keeps the Student Success Dashboard: academics, report cards, LifePath, checklist, scholarships, opportunities, uploads, and portfolio.
- Family dashboard focuses on active student oversight, parent action items, academic status, LifePath, scholarships, opportunities, and checklist progress.
- Counselor dashboard is read/support oriented and keeps counselors out of core student profile editing by default.
- Business users are routed to the existing Business Dashboard for organization profile and opportunity posting.

## Profile Alignment

`/profile` now changes behavior by role:

- Business users see business account shortcuts instead of student planning controls.
- Students and parents/guardians can manage active student profile details where permitted.
- Counselors can view linked student context but are told core profile editing is not available in this release.
- Student/family/counselor roles still use active student profile selection and relationship management.

## Validation

Run before merge:

```bash
npm run verify
npm run mobile:verify
npx tsc -p apps/mobile/tsconfig.json --noEmit
```

## Notes

No database migrations were added in this sprint. Mobile UI was not redesigned; mobile verification is currently a regression check only.
