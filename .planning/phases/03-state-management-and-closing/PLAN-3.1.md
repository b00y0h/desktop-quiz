---
wave: 1
depends_on: []
files_modified:
  - src/lib/store.ts
  - src/app/api/quiz/[id]/route.ts
  - src/app/admin/[id]/page.tsx
autonomous: true
---

# Plan 3.1: Quiz State Machine and Close Submissions Button

## Goal
Enforce quiz state transitions (collecting -> closed -> active) and add a "Close Submissions" button to the admin dashboard that transitions the quiz from collecting to closed.

## Context
Currently:
- Quiz status type is `'draft' | 'collecting' | 'active' | 'closed'`
- `updateQuizStatus` sets any status without validation
- `toggleStatus` in admin UI freely toggles between active/closed
- No state transition validation exists

We need:
1. A state machine that enforces valid transitions: draft -> collecting -> closed -> active -> closed
2. A "Close Submissions" admin button that transitions collecting -> closed
3. After closing, the "Publish Quiz" button transitions closed -> active (making it playable)
4. Prevent invalid transitions at the store level

## Tasks

<task id="3.1.1">
**Add state transition validation to store**

In `src/lib/store.ts`:
- Add a `VALID_TRANSITIONS` map defining allowed state changes:
  - `draft` -> `collecting`
  - `collecting` -> `closed`
  - `closed` -> `active`
  - `active` -> `closed`
- Update `updateQuizStatus` to validate the transition:
  - Load the quiz, check current status
  - If the requested transition is not in `VALID_TRANSITIONS[currentStatus]`, return null
  - Otherwise proceed with the update
- Add a `closeSubmissions(quizId: string, adminPin: string)` method:
  - Load quiz, validate PIN
  - Verify quiz is in `collecting` status (return null otherwise)
  - Set status to `closed`
  - Save and return the quiz
</task>

<task id="3.1.2">
**Add close submissions API action**

In `src/app/api/quiz/[id]/route.ts` PATCH handler:
- Add handling for `action: 'closeSubmissions'`:
  - Call `store.closeSubmissions(id, pin)`
  - Return 400 if result is null (quiz not in collecting state or bad PIN)
  - Return `{ success: true, status: 'closed' }` on success
- Update the existing `status` update path to use the validated `updateQuizStatus` (which now validates transitions)
  - Return 400 with error message if transition is invalid
</task>

<task id="3.1.3">
**Add Close Submissions button and update admin UI state flow**

In `src/app/admin/[id]/page.tsx`:
- Add a `closeSubmissions` async function:
  - Call PATCH `/api/quiz/${id}` with `{ action: 'closeSubmissions', pin }`
  - On success, reload quiz state
  - On error, show error message
- Update the status control section:
  - When `collecting`: show "Close Submissions" button (red/orange) instead of the generic toggle
  - When `closed`: show "Publish Quiz" button that transitions to `active`
  - When `active`: show "Close Quiz" button (existing behavior)
  - When `draft`: show "Start Collecting Submissions" button (existing behavior, keep as-is)
- Update status descriptions:
  - `collecting`: "Collecting Submissions - Share the link below"
  - `closed`: "Submissions Closed - Ready to publish"
  - `active`: "Live - Participants can join"
- Update `toggleStatus` to use proper transitions:
  - From `closed` -> `active` (publish)
  - From `active` -> `closed` (close quiz)
  - Remove ability to go from `draft` -> `active` directly (must go through collecting first)
</task>

## Verification

1. Admin sees "Close Submissions" button when quiz is in `collecting` state
2. Clicking "Close Submissions" transitions quiz to `closed` state
3. Admin sees "Publish Quiz" button when quiz is in `closed` state
4. Clicking "Publish Quiz" transitions quiz to `active` state
5. Invalid state transitions are rejected by the API (e.g., draft -> active directly)
6. Status descriptions update correctly for each state

## must_haves
- Quiz enforces state transitions: collecting -> closed -> playable (STATE-01)
- Admin can close submissions via a button on the admin dashboard (STATE-02)
- State transitions are validated server-side to prevent invalid jumps
- Quiz flow: draft -> collecting -> closed -> active is enforced
