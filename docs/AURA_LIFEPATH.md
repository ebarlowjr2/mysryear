# A.U.R.A LifePath (MVP)

## What Was Built

A.U.R.A LifePath is a guided, semi-gameified career pathway engine in the web app:

- Landing: `/aura/lifepath`
- Top 5 selection: `/aura/lifepath/select`
- Comparison dashboard: `/aura/lifepath/compare`
- Career detail dashboard: `/aura/lifepath/career/[id]`

The flow uses a local typed mock dataset (20 careers) and a scoring utility to generate a Career Health
score that changes with simple scenario toggles.

## Mock vs Real

- Mock:
  - Career dataset (`apps/web/src/features/aura/lifepath/data/careers.ts`)
  - Cohorts/opportunities cards
  - Cost breakdown estimates
- Real:
  - UI flow + routing
  - Health scoring model + scenario adjustments

## Career Health Scoring

Implemented in `apps/web/src/features/aura/lifepath/lib/scoring.ts`.

Score is out of 100 using weighted categories:

- Readiness (25)
- Affordability (25)
- Momentum (20)
- Support (15)
- Debt Impact (15)

Scenario toggles adjust timeline, cost, and debt risk to create a simulation feel.

## Where to Refine Next

- Persist selections to Supabase per user (instead of localStorage)
- Add real career data sources (growth outlook, typical debt, regional pay)
- Add scholarship + cohort matching integrations
- Add parent dashboard tie-in and saved student profile influence
- Expand scenario system into a deeper simulation engine (constraints, timelines, milestones)
