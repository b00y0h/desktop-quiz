---
wave: 3
depends_on: ["1.2"]
files_modified:
  - src/app/api/submit/[token]/route.ts
  - src/app/submit/[token]/page.tsx
  - src/lib/store.ts
  - src/app/admin/[id]/page.tsx
autonomous: true
---

# Plan 1.3: Duplicate Name Detection and Admin Submission Count

## Goal
Prevent workers from submitting duplicate names and show admin the submission count updating after submissions.

## Context
Plans 1.1 and 1.2 established the full submission flow. Now we need:
1. Server-side duplicate name checking
2. Client-side duplicate name warning before upload
3. Admin dashboard showing live submission count

## Tasks

<task id="1.3.1">
**Add duplicate name detection to API and store**

In `src/lib/store.ts`:
- Add `hasSubmissionName(quizId: string, name: string): Promise<boolean>` method that checks if any submission in the quiz has the same name (case-insensitive trim comparison)

In `src/app/api/submit/[token]/route.ts`:
- In GET handler: add `names: quiz.submissions.map(s => s.name)` to response (list of already-taken names)
- In POST handler: before saving, check `store.hasSubmissionName()` — return 409 (Conflict) with `{ error: 'Name already taken' }` if duplicate
</task>

<task id="1.3.2">
**Add client-side duplicate name warning**

In `src/app/submit/[token]/page.tsx`:
- Store the list of taken names from the GET response
- On name input blur or before submit, check if entered name matches any taken name (case-insensitive)
- If duplicate detected: show warning message "This name is already taken. Please use a different name."
- Disable submit button when name is duplicate
- Also handle 409 response from POST as a fallback (in case names list was stale)
</task>

<task id="1.3.3">
**Show submission count in admin dashboard**

In `src/app/admin/[id]/page.tsx`:
- Add `submissionCount` to the `QuizData` interface
- In the API response (already returned `questionCount`), ensure `submissionCount` is included

In `src/app/api/quiz/[id]/route.ts` GET handler:
- Add `submissionCount: quiz.submissions?.length ?? 0` to the response

In admin dashboard UI:
- When quiz status is `collecting`, show "X submissions received" counter
- Add a "Refresh" button next to the counter that re-fetches quiz data
- The counter updates when admin clicks refresh (manual refresh per requirements — no real-time)
</task>

## Verification

1. Worker entering a name already used by another submission sees "Name already taken" warning
2. Worker with duplicate name cannot submit (button disabled + server rejects with 409)
3. Worker with unique name can submit successfully
4. Admin sees submission count on dashboard when quiz is in collecting state
5. Admin can click Refresh to see updated submission count after new submissions arrive
6. Duplicate check is case-insensitive ("Alice" matches "alice")

## must_haves
- Duplicate names are prevented with warning to worker (WORK-03)
- Server-side enforcement of unique names (409 response)
- Admin can see submission count update after worker submits (SUB-01 success criteria #4)
- Case-insensitive name comparison
