# Plan 3.2 Summary: Submission and Play Guards

## Status
✅ Complete

## Commits
1. `e2ccecc` - feat(03-3.2): add status guard to quiz code API
2. `f3b72b6` - feat(03-3.2): add status guard to quiz answer submission API
3. `3858e8c` - feat(03-3.2): add status-based error messages to play page
4. `b145943` - refactor(03-3.2): improve closed submission message clarity

## Changes Made

### Task 3.2.1: Quiz Code API Status Guard
**File**: `src/app/api/quiz/code/[code]/route.ts`
- Added guard to check quiz status before returning quiz data
- Returns 403 for `draft` and `collecting` states with message: "Quiz is not yet available"
- Returns 403 for `closed` state with message: "Quiz is not yet ready to play. Submissions are closed but quiz has not been published."
- Only allows access when quiz status is `active`

### Task 3.2.2: Answer Submission API Status Guard
**File**: `src/app/api/quiz/[id]/submit/route.ts`
- Updated existing status check to return 403 (was 400)
- Changed error message to: "Quiz is not accepting answers"
- Prevents answer submissions for non-active quizzes

### Task 3.2.3: Play Page Error Handling
**File**: `src/app/play/[code]/page.tsx`
- Enhanced `useEffect` to handle 403 status responses
- Added status-specific error messages:
  - For `collecting`/`draft`: "This quiz is still collecting submissions. Please wait for the organizer to publish it."
  - For `closed`: "This quiz is almost ready! The organizer needs to publish it before you can play."
- Added fallback error handling for fetch failures
- Messages display in existing dark-themed error UI

### Task 3.2.4: Submit Page Message Polish
**File**: `src/app/submit/[token]/page.tsx`
- Improved 410 error message from "Submissions are closed" to "Submissions for this quiz have been closed. Thank you!"
- More friendly and complete message for workers

## Verification Notes

### Security Guards In Place
- **Worker submission API**: Blocks non-collecting quizzes (410)
- **Worker submission page**: Shows clear closed message
- **Quiz code API**: Blocks non-active quizzes (403)
- **Answer submission API**: Blocks non-active quizzes (403)
- **Play page**: Shows status-appropriate messages

### State Flow Now Enforced
1. **Draft** → Workers cannot submit, players cannot play
2. **Collecting** → Workers can submit, players cannot play
3. **Closed** → Workers cannot submit, players cannot play (different message)
4. **Active** → Workers cannot submit, players can play

## Testing Approach
No automated tests (per project context). Guards rely on:
- API-level status checks (403/410 responses)
- Client-side error handling with status-specific messages
- Existing quiz state machine from Plan 3.1

## Dependencies
- Depends on Plan 3.1 (state machine and transitions)
- Enables future work on quiz publishing/activation

## Next Steps
Plan 3.2 is complete. Ready for Plan 3.3 or other phase work.
