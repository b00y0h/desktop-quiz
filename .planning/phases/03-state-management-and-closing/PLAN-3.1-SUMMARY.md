# Plan 3.1 Summary: Quiz State Machine and Close Submissions Button

## Completed: 2026-01-28

## Overview
Implemented a state machine for quiz status transitions and added a "Close Submissions" button to the admin dashboard. The quiz now enforces a strict flow: draft → collecting → closed → active → closed.

## Changes Made

### 1. State Transition Validation (store.ts)
- Added `VALID_TRANSITIONS` map defining allowed state changes:
  - `draft` → `collecting`
  - `collecting` → `closed`
  - `closed` → `active`
  - `active` → `closed`
- Updated `updateQuizStatus` to validate transitions and return null for invalid transitions
- Added `closeSubmissions(quizId, adminPin)` method:
  - Validates admin PIN
  - Verifies quiz is in `collecting` status
  - Transitions to `closed` status
  - Returns null if invalid

### 2. API Endpoints (route.ts)
- Added `closeSubmissions` action handler in PATCH endpoint:
  - Calls `store.closeSubmissions(id, pin)`
  - Returns 400 if quiz not in collecting state or invalid PIN
  - Returns success with status 'closed'
- Updated status update path to validate transitions:
  - Returns 400 with error message for invalid transitions

### 3. Admin UI State Flow (page.tsx)
- Added `closeSubmissions()` async function:
  - Calls API with `action: 'closeSubmissions'`
  - Reloads quiz state on success
  - Shows error message on failure
- Updated status control section with state-specific buttons:
  - `collecting`: "Close Submissions" button (orange)
  - `closed`: "Publish Quiz" button (green) → transitions to active
  - `active`: "Close Quiz" button (red) → transitions to closed
  - `draft`: No status button shown (existing behavior)
- Updated status descriptions:
  - `collecting`: "Collecting Submissions - Share the link below"
  - `closed`: "Submissions Closed - Ready to publish"
  - `active`: "Live - Participants can join"
  - `draft`: "Draft - Add questions then publish" (unchanged)
- Updated `toggleStatus()` to only handle valid transitions:
  - `closed` → `active` (publish)
  - `active` → `closed` (close quiz)
  - Shows error for invalid transitions

## Commits
1. `feat(03-3.1): add state transition validation to store` - f2692b2
2. `feat(03-3.1): add close submissions API action` - 321937c
3. `feat(03-3.1): add Close Submissions button and update admin UI state flow` - e508b9a

## Verification Points
- ✅ State machine enforces valid transitions at store level
- ✅ Admin sees "Close Submissions" button when quiz is in `collecting` state
- ✅ Clicking "Close Submissions" transitions quiz to `closed` state
- ✅ Admin sees "Publish Quiz" button when quiz is in `closed` state
- ✅ Clicking "Publish Quiz" transitions quiz to `active` state
- ✅ Invalid state transitions are rejected by the API with error messages
- ✅ Status descriptions update correctly for each state

## Must-Haves Met
- STATE-01: Quiz enforces state transitions: collecting → closed → playable ✅
- STATE-02: Admin can close submissions via a button on the admin dashboard ✅
- State transitions are validated server-side to prevent invalid jumps ✅
- Quiz flow: draft → collecting → closed → active is enforced ✅

## Next Steps
Phase 3 complete. This plan establishes the foundation for proper quiz state management and submission workflow control.
