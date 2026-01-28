---
wave: 2
depends_on: ["3.1"]
files_modified:
  - src/app/api/submit/[token]/route.ts
  - src/app/submit/[token]/page.tsx
  - src/app/api/quiz/code/[code]/route.ts
  - src/app/play/[code]/page.tsx
autonomous: true
---

# Plan 3.2: Submission and Play Guards

## Goal
Prevent workers from submitting after closing and prevent players from playing before the quiz is active.

## Context
After Plan 3.1, the quiz enforces state transitions and admin can close submissions. Now we need guards:
1. The submit API already checks `quiz.status !== 'collecting'` and returns 410 -- this is correct
2. The submit page already handles 410 by showing "Submissions are closed" -- this is correct
3. The play page and code API have NO status checks -- players can play during draft/collecting/closed states
4. The quiz submit answers API has NO status check -- answers can be submitted for non-active quizzes

We need to add guards for the play side.

## Tasks

<task id="3.2.1">
**Add status guard to quiz code API**

In `src/app/api/quiz/code/[code]/route.ts`:
- After loading the quiz, check `quiz.status`:
  - If status is `'draft'` or `'collecting'`: return JSON with `{ error: 'Quiz is not yet available', status: quiz.status }` and HTTP 403
  - If status is `'closed'`: return JSON with `{ error: 'Quiz is not yet ready to play. Submissions are closed but quiz has not been published.', status: quiz.status }` and HTTP 403
  - If status is `'active'`: proceed as normal (return quiz data)
- This ensures players can only access quiz data when the quiz is active
</task>

<task id="3.2.2">
**Add status guard to quiz answer submission API**

In `src/app/api/quiz/[id]/submit/route.ts`:
- At the start of the POST handler, load the quiz and check status
- If quiz status is not `'active'`, return `{ error: 'Quiz is not accepting answers' }` with HTTP 403
- This prevents answer submissions for non-active quizzes
</task>

<task id="3.2.3">
**Update play page to show appropriate messages for non-active quizzes**

In `src/app/play/[code]/page.tsx`:
- Update the error handling in the useEffect that fetches quiz data:
  - If the API returns a 403 error, check the response body for `status` field
  - If status is `collecting` or `draft`: show "This quiz is still collecting submissions. Please wait for the organizer to publish it."
  - If status is `closed`: show "This quiz is almost ready! The organizer needs to publish it before you can play."
- Style error messages consistently with the existing dark theme
- Ensure the user sees a clear, friendly message rather than a generic error
</task>

<task id="3.2.4">
**Update submit page to show clear closed message**

In `src/app/submit/[token]/page.tsx`:
- Verify the existing 410 handling shows a clear "Submissions are closed" message
- If the message is generic, update it to: "Submissions for this quiz have been closed. Thank you!"
- This is a verification/polish task -- the core guard already exists in the API
</task>

## Verification

1. Worker visiting submission link after closing sees "submissions closed" message (existing behavior confirmed)
2. Player visiting play link for a `collecting` quiz sees "not yet available" message
3. Player visiting play link for a `closed` quiz sees "not yet ready" message
4. Player visiting play link for an `active` quiz can play normally
5. Answer submission API rejects answers for non-active quizzes
6. Play page shows friendly, styled error messages for each state

## must_haves
- Workers cannot submit after submissions are closed (STATE-03)
- Players cannot play the quiz until it is published/active (STATE-04)
- Clear user-facing messages for each blocked state
- Answer submission API is guarded against non-active quizzes
