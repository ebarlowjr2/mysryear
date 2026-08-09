# Parent Action Center

## Purpose

The Parent Action Center gives parents and guardians grade-aware ways to support the active student. It is intentionally separate from the student's own checklist.

Student activities such as financial literacy, volunteer tracking, student resume updates, and student task completion stay in `student_success_tasks`. Parent actions are stored independently in `parent_action_completions`.

## Ownership Rules

Parent Action Center state is:

- owned by `student_profile_id`
- owned by the individual `parent_user_id`
- independent per parent/guardian
- not written to `student_success_tasks`
- not allowed to complete official student tasks, LifePath tasks, or career selections

Two parents linked to the same student can have different parent-action completion states.

## Shared Templates

Templates live in:

- `packages/shared/src/parent-actions.ts`

Exports:

- `highSchoolGradeFromGraduationYear`
- `parentActionTemplatesForGrade`
- `parentActionTemplatesForStudent`
- `mergeParentActionCompletions`

## Grade Logic

High-school grade is derived from expected graduation year using an August academic-year boundary. This prevents a student from incorrectly moving to the next grade on January 1.

Example:

- Class of 2030 on January 15, 2027 is still 9th grade.
- Class of 2030 on August 15, 2027 becomes 10th grade.

College students or unknown grade values receive a general supporter checklist.

## Current Template Groups

### 9th Grade

- Review graduation requirements and four-year course plan.
- Establish report-card check-in routine.
- Discuss career clusters without forcing a final choice.
- Begin family cost conversation.
- Organize activities, awards, certifications, and achievements.

### 10th Grade

- Review credits and graduation progress.
- Compare AP, dual-enrollment, CTE, and certification options.
- Review career options and training requirements.
- Plan a meaningful summer experience.
- Establish an initial affordability range.

### 11th Grade

- Build a realistic post-graduation shortlist.
- Review testing/application/visit/program timelines.
- Complete a Parent Simulation.
- Organize financial-aid and scholarship information.
- Confirm senior-year courses support preferred pathways.

### 12th Grade

- Maintain a shared deadline calendar.
- Complete FAFSA or applicable funding steps.
- Compare offers by net cost, debt, time, and career outcome.
- Confirm graduation and post-graduation paperwork.
- Create a transition budget and first-90-days plan.

### General / College / Unknown

- Confirm what support the student wants.
- Review latest documents.
- Compare pathway costs and timelines.

## Web and Mobile

Web:

- `/dashboard/family` renders grade-aware actions from the dashboard summary API.
- `/api/parent-actions` upserts/deletes completion rows.

Mobile:

- `apps/mobile/src/data/dashboard.ts` loads and toggles parent actions.
- `apps/mobile/app/(app)/index.tsx` displays parent-specific actions instead of student checklist tasks.

## Validation

Covered by tests:

- grade boundary behavior
- general fallback behavior
- independent completion merge
- parent signup not requiring school/graduation year
- parent action writes not using `student_success_tasks`
