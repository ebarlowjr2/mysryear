# Grades and Digital Report Cards

## First increment

`/grades` is the canonical, student-profile-owned grades page. The responsive web page supports a phone camera input and photo library, editable extraction drafts, manual entry, and reviewed digital records. The web navigation, Profile, and Report Card Vault link to it. The generic web upload endpoint directs report cards to this workflow; other academic documents keep their existing flow.

This increment establishes the page and normalization contract. Native iOS camera/review screens are a follow-up: the native app currently retains its legacy file-upload UI. Its old report-card writes are restricted by the migration, but those legacy files are not automatically digitized. Shared types and normalization are exported through both shared entry points; the Grades APIs accept verified bearer authentication for a future native client.

## Ownership and permissions

- Only account roles `student` and `parent` can access the new grades page, API, records, or source bucket.
- Student: must be the `student_profiles.student_user_id` owner.
- Parent: must have a current `family_relationships` row with role `parent` for that student. A pending invite, saved active-profile ID, or original creator ID alone grants no access.
- Guardian is excluded under the explicit parents-and-students-only request. Counselor, Business, and Admin account roles are also excluded from this user-facing feature. Service-role maintenance remains privileged.
- The active student defaults to a valid `profiles.active_student_profile_id`; otherwise the first accessible student is shown. An intentional switch updates that setting. A draft is pinned to its selected student and switching is disabled until saved/canceled.
- A removed relationship revokes table and storage access on subsequent requests. There is no accepted-relationship expiration.
- RLS is enforced even when calling Supabase directly. Digital report-card tables allow authenticated SELECT only; writes use a narrow RPC. Security-definer functions use an empty search path and explicit authenticated grants, with PUBLIC/anon execution revoked.
- The RPC creates one `academic_records` summary with the digital report card in one transaction. Authorship comes from `auth.uid()`. Replaying a request UUID cannot duplicate the report or its summary. It never writes student profile ownership, LifePath, GPA, or student tasks.

## Normalized format v1

`student_report_cards.data` contains:

- `schema_version: 1`
- School name (optional), academic year (`YYYY-YYYY`), and grade level as reported.
- Ordered `courses`, each with a name and `grades` array: period label, nullable numeric score (0-100), nullable letter/mark.
- Attendance scope (such as year-to-date), nullable absences and tardies.

All periods are retained (Q1, Q2, X1, S1, Q3, Q4, X2, S2, F1 or school-specific labels). Empty cells, including homeroom, remain null. A real zero remains zero. Unclear values need review. Letter grades are transcribed, not derived. No GPA or averaged term score is inferred. Addresses, student IDs, student names and teacher/contact details are excluded from extracted structured data; the selected authorized student determines ownership.

`packages/shared/src/__fixtures__/report-card.ts` is a fictional ninth-grade test fixture inspired by the provided layout, with no real identifying information or original photograph. Real extraction preserves the actual source grade level (including sixth grade). The ninth-grade label is only a fixture override, not a production OCR rule.

## Capture and review

1. Select the authorized student.
2. Take/choose one clear photo; crop unnecessary personal details before selecting it when possible.
3. Browser re-encodes as JPEG, removes EXIF, and resizes the longest edge to 2200 pixels. Source input limit is 25 MB; the prepared upload limit is 3 MB. JPG/PNG/WebP are supported server-side with MIME and signature checks. Unsupported HEIC gets an actionable conversion message. PDF and multi-page processing are deferred.
4. Optional explicit consent permits sending the photo to OpenAI for analysis. Analysis is limited to ten attempts per authenticated user per hour, with a 45-second upstream timeout. The image is untrusted data, with no tool execution. Structured output is validated and whitelisted before returning a draft. The API uses `store: false`; this does not imply zero provider retention under every account policy.
5. Correct any fields and confirm the selected student, school year, grade level, and grades. Any edit clears review confirmation. Nothing is persisted by analysis.
6. Save writes the private source, then atomically creates the reviewed digital card and academic summary. Failure is displayed instead of claiming success. Idempotent retries avoid duplicate summaries.

Saved records are labeled **Family reviewed**, not school-verified. Source viewing is authenticated and proxied with `no-store`, avoiding durable public/signed URLs. Existing authorized viewers may retain data already downloaded; revocation cannot erase those copies.

## Required migration and environment

Migration: `supabase/migrations/20261016120000_digital_report_cards.sql`.

Apply to a development/staging Supabase project before deploying the feature, verify with disposable accounts, then follow the normal production migration process. It has NOT been applied to any remote environment by this sprint.

The migration adds:

- `student_report_cards`, indexed by student/date and author.
- `report_card_analysis_limits`, with private per-user quota counters.
- Private `report-card-sources` storage bucket and restrictive access policies. This separate bucket avoids the broader legacy `user-uploads` permissions. Sources intentionally do not appear as ordinary entries in the generic document list.
- Narrow access, save, and analysis-reservation RPCs.
- Restrictive report-card write checks on legacy `academic_records` and `uploaded_files` to prevent other roles adding report cards through old clients.

The existing canonical academic records and schema-alignment migrations are prerequisites. This migration preserves existing rows and references. It runs in a transaction; the SQL test harness checks it against an isolated minimal canonical schema, not a copy of production. A staging run with the full migration history is still required.

For automatic analysis, configure server-only `OPENAI_API_KEY` and `REPORT_CARD_ANALYSIS_MODEL` (a Responses API vision model supporting structured outputs). Neither value is public or bundled into mobile. No provider call or live OCR accuracy evaluation was performed on the provided report-card image. Without these settings, the page clearly offers manual entry and photo attachment rather than claiming that analysis occurred.

Reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [image inputs](https://developers.openai.com/api/docs/guides/images-vision).

## Validation and rollout

Automated coverage includes normalized grades/blanks, academic-year boundaries, role allowlist, extraction failure/refusal/partial output, API review and authorization gates, save failure and idempotency, plus `supabase/tests/report_cards.sql` for actual PostgreSQL policies and RPC behavior. Run the SQL file only in a disposable fixture database; it rolls back its fixture inserts. It must never run on production.

The browser QA harness renders the real Grades component with synthetic API responses at 1440px and 390px. It is not a live Supabase end-to-end test. Verify these on staging before enabling:

- Parent captures a real test document; AI draft is checked against the source course by course.
- The linked student sees the same saved digital card and source.
- A different parent/student and all excluded roles cannot read or add it, including direct API and storage requests.
- Unlinking the parent removes access immediately; switching students never carries a draft or old records into the new profile.
- The saved academic summary updates dashboard status after refresh.
- Deleting a disposable account removes its owned student source photos and academic data. Account deletion now includes saved report-card sources in its cleanup.

Follow-ups: native iOS camera/review screen; multi-page/PDF support; image crop/rotation controls; revision history/edit/delete for saved cards; source-quality confidence and diverse district evaluation; orphan-source retention cleanup for interrupted requests. Unsaved storage objects can remain after a process interruption or access revocation, so operations should remove unreferenced source objects after a grace period before broad rollout. Do not implement grade trends or GPA conversions until the school grading rules are defined.
