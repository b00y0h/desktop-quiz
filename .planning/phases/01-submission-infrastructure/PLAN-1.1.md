---
wave: 1
depends_on: []
files_modified:
  - src/lib/store.ts
  - src/app/api/quiz/[id]/route.ts
  - src/app/admin/[id]/page.tsx
autonomous: true
---

# Plan 1.1: Submission Link Generation and Management UI

## Goal
Enable admin to generate a unique submission link for a quiz and copy it to clipboard, so workers can later visit that link to submit desk photos.

## Context
Currently the Quiz model has no concept of a "submission link" or "collecting" state. The admin dashboard shows a play link (via quiz code) but not a submission link. We need to:
1. Add a `submissionToken` field to Quiz that serves as the unique submission link identifier
2. Add a new quiz status value `collecting` for the submission phase
3. Add store methods to generate/retrieve submission tokens
4. Add an API endpoint to look up a quiz by submission token
5. Add UI in the admin dashboard to generate and copy the submission link

## Tasks

<task id="1.1.1">
**Add submission infrastructure to data model**

In `src/lib/store.ts`:
- Add `submissionToken?: string` field to the `Quiz` interface
- Add `submissions: Submission[]` array to the `Quiz` interface
- Add new `Submission` interface: `{ id: string, name: string, imageUrl: string, createdAt: string }`
- Update `status` type to include `'collecting'`: `'draft' | 'collecting' | 'active' | 'closed'`
- Add `generateSubmissionToken(quizId: string, adminPin: string)` method to store that:
  - Validates admin PIN
  - Generates a random token via `genId()`
  - Sets quiz status to `'collecting'`
  - Initializes empty `submissions` array if not present
  - Saves and returns the token
- Add `getQuizBySubmissionToken(token: string)` method that finds quiz by token
- Initialize `submissions: []` in `createQuiz`
</task>

<task id="1.1.2">
**Add API endpoint for submission token lookup**

Create `src/app/api/submit/[token]/route.ts`:
- `GET`: Look up quiz by submission token via `store.getQuizBySubmissionToken(token)`
  - Return 404 if not found
  - Return 410 (Gone) if quiz status is not `'collecting'`
  - Return `{ quizId, quizTitle, submissionCount }` on success
- Follow existing API patterns: `export const dynamic = 'force-dynamic'`, async params

Also update `src/app/api/quiz/[id]/route.ts` PATCH handler:
- Add support for `action: 'generateSubmissionToken'` in request body
- Validate PIN, call `store.generateSubmissionToken()`, return the token and submission URL path
</task>

<task id="1.1.3">
**Add submission link UI to admin dashboard**

In `src/app/admin/[id]/page.tsx`:
- Add `submissionToken` to the `QuizData` interface
- Add `submissions` count tracking
- When quiz is in `'draft'` status, show a "Start Collecting Submissions" button that:
  - Calls PATCH `/api/quiz/${id}` with `{ action: 'generateSubmissionToken', pin }`
  - On success, updates local state with the token
- When quiz has a `submissionToken`, show the submission link with a copy button
  - Link format: `${origin}/submit/${token}`
  - Copy button with copied feedback (reuse existing pattern)
- Update status colors to include `collecting: 'bg-blue-500/20 text-blue-400'`
- Update status descriptions for the collecting state
- Show submission count when in collecting state
</task>

## Verification

1. Admin dashboard shows "Start Collecting Submissions" button for draft quizzes
2. Clicking the button transitions quiz to `collecting` status and displays submission link
3. Admin can copy submission link to clipboard with one click
4. GET `/api/submit/{token}` returns quiz info for valid tokens
5. GET `/api/submit/{token}` returns 410 for non-collecting quizzes
6. Quiz data model correctly stores `submissionToken` and `submissions` array

## must_haves
- Admin can generate a unique submission link from the admin dashboard (SUB-01)
- Admin can copy submission link to clipboard with one click (SUB-02)
- Submission token is persisted in quiz data and retrievable via API
- Quiz transitions to 'collecting' status when submission link is generated
