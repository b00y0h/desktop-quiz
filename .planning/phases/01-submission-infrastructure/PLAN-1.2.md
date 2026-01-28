---
wave: 2
depends_on: ["1.1"]
files_modified:
  - src/app/submit/[token]/page.tsx
  - src/app/api/submit/[token]/route.ts
  - src/lib/store.ts
autonomous: true
---

# Plan 1.2: Worker Submission Page with Name Validation and Photo Upload

## Goal
Build the worker-facing submission page where workers visit the submission link, enter their name, upload a desk photo, and see a confirmation.

## Context
Plan 1.1 established the submission token, data model (`Submission` interface, `submissions` array), and the GET endpoint for token lookup. Now we need:
1. A POST endpoint for workers to submit name + photo
2. A client-side submission page at `/submit/[token]`
3. Confirmation UI after successful submission

## Tasks

<task id="1.2.1">
**Add submission POST endpoint**

In `src/app/api/submit/[token]/route.ts` (created in 1.1.2), add:
- `POST` handler that accepts `multipart/form-data` with fields: `name` (string), `file` (image)
- Validate token exists and quiz is in `collecting` status (return 410 if not)
- Validate name is non-empty (return 400)
- Validate file is present and is an image (return 400)
- Upload image to Vercel Blob via `put()` (reuse pattern from upload route)
- Add store method `addSubmission(quizId: string, name: string, imageUrl: string)` that:
  - Creates a `Submission` object with `genId()`, name, imageUrl, createdAt
  - Pushes to `quiz.submissions` array
  - Saves quiz
  - Returns the submission
- Return `{ success: true, submission: { id, name } }` on success
</task>

<task id="1.2.2">
**Build worker submission page**

Create `src/app/submit/[token]/page.tsx` as a `'use client'` component:
- On mount, fetch `GET /api/submit/${token}` to validate token
  - If 404: show "Invalid submission link" error
  - If 410: show "Submissions are closed" message
  - If success: show submission form
- Submission form contains:
  - Quiz title header
  - Name input field (required, trimmed)
  - File upload for desk photo (accept="image/*", required)
  - Image preview after file selection
  - "Submit" button (disabled while uploading)
  - Loading/uploading state indicator
- On submit:
  - POST to `/api/submit/${token}` with FormData (name + file)
  - On success: transition to confirmation view
  - On error: show error message
- Confirmation view (WORK-02):
  - "Submission received!" heading
  - Show the submitted name and photo thumbnail
  - "You're all set" message
  - No navigation needed (workers don't need to go elsewhere)
- Style with existing dark theme and Tailwind classes (surface-*, primary-*, rounded-xl, etc.)
</task>

## Verification

1. Worker visits `/submit/{valid-token}` and sees submission form with quiz title
2. Worker enters name, selects photo, sees image preview
3. Worker clicks Submit, sees loading state, then confirmation page
4. Worker visiting invalid token sees error message
5. Worker visiting token for non-collecting quiz sees "closed" message
6. Submission is persisted in quiz data (verifiable via admin API)

## must_haves
- Worker can visit submission link, enter name, upload desk photo (WORK-01)
- Worker sees confirmation page after successful submission (WORK-02)
- Photo is uploaded to Vercel Blob and URL stored in submission
- Invalid/expired tokens show appropriate error messages
