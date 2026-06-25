# Portfolio Proof Attachments + Scholarship Readiness

## Purpose

This sprint connects the student portfolio foundation to scholarship/application readiness without starting the full scholarship rebuild yet. Portfolio records remain owned by `student_profile_id`, and proof documents continue to use the existing `uploaded_files` table and `user-uploads` Supabase Storage bucket.

## What Changed

- Portfolio entries can reference `uploaded_file_id` as proof/evidence.
- Web portfolio creation can upload an optional proof file while creating a portfolio item.
- Web and mobile portfolio lists show the attached proof file name when present.
- Dashboard summaries now include a basic Scholarship Readiness signal.
- Shared readiness logic lives in `packages/shared/src/portfolio.ts` so web and mobile use the same scoring model.

## Current Scholarship Readiness Model

The score is intentionally simple and refinement-ready. It checks five signals:

- At least one activity or leadership entry
- At least 10 volunteer/service hours
- At least one award or achievement
- At least one completed certification or skill credential
- At least one proof document attached

Each completed signal contributes equally to a 0-100 score.

Labels:

- `Needs Foundation`: below 40
- `Getting Scholarship Ready`: 40-79
- `Scholarship Ready`: 80+

## Mock/Basic vs Real

Real today:

- Portfolio rows are stored in canonical Supabase tables.
- Proof files are stored in Supabase Storage and tracked in `uploaded_files`.
- Readiness score uses actual portfolio counts and proof attachment presence.

Still basic:

- The score is not yet scholarship-specific.
- Proof file replacement/editing is not fully built.
- Scholarships do not yet consume readiness data directly.

## Next Refinements

- Add proof replacement/removal actions per portfolio item.
- Add signed download/open actions for proof files.
- Map portfolio fields to scholarship/application requirements.
- Add resume/export generation from portfolio records.
- Use scholarship categories to create targeted readiness checks.
