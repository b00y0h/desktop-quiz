# Plan 1.2 Summary: Worker Submission Page with Name Validation and Photo Upload

**Completed:** 2026-01-27

## Overview
Built the worker-facing submission page where workers can visit a submission link, enter their name, upload a desk photo, and receive confirmation. This completes the worker submission flow for the quiz application.

## Tasks Completed

### Task 1.2.1: Add submission POST endpoint
**Commit:** `790d4a7` - feat(01-1.2): add submission POST endpoint

**Files Modified:**
- `src/lib/store.ts` - Added `addSubmission()` method to store
- `src/app/api/submit/[token]/route.ts` - Added POST handler

**Changes:**
- Added `addSubmission(quizId, name, imageUrl)` method to store that:
  - Creates a new Submission object with generated ID
  - Adds submission to quiz.submissions array
  - Saves quiz and returns the submission
- Implemented POST handler in submit route that:
  - Validates token exists and quiz is in 'collecting' status (returns 410 if not)
  - Validates name is non-empty (returns 400 if missing)
  - Validates file is present and is an image type (returns 400 if invalid)
  - Uploads image to Vercel Blob storage using `put()` API
  - Calls `store.addSubmission()` to save the submission
  - Returns `{ success: true, submission: { id, name } }` on success

### Task 1.2.2: Build worker submission page
**Commit:** `dcbc697` - feat(01-1.2): build worker submission page

**Files Created:**
- `src/app/submit/[token]/page.tsx` - Worker submission page component

**Features Implemented:**
- Token validation on mount via GET `/api/submit/${token}`
  - Shows "Invalid submission link" for 404
  - Shows "Submissions are closed" for 410
  - Shows submission form for successful validation
- Submission form with:
  - Quiz title header
  - Name input field (required, trimmed)
  - File upload for desk photo (accept="image/*", required)
  - Image preview after file selection using URL.createObjectURL
  - Submit button (disabled while uploading)
  - Loading/uploading state indicators
  - Error message display
- Form submission flow:
  - Creates FormData with name and file
  - POSTs to `/api/submit/${token}`
  - Transitions to confirmation view on success
  - Displays error messages on failure
- Confirmation view:
  - "Submission received!" heading
  - Displays submitted name and photo thumbnail
  - "You're all set" message
- Styled with dark theme using Tailwind classes:
  - `bg-surface-dark`, `bg-surface` for containers
  - `text-primary`, `bg-primary` for interactive elements
  - `rounded-xl` for consistent border radius
  - Gradient background matching app theme

## Technical Implementation

### State Management
- Used React hooks (useState, useEffect) for component state
- Separate states for token validation, form inputs, upload status, and confirmation
- Loading states for async operations

### Form Handling
- Controlled inputs for name field
- File input with preview generation
- FormData API for multipart/form-data submission
- Validation before and after submission

### Error Handling
- Network errors caught and displayed
- API errors (404, 410, 400) mapped to user-friendly messages
- Form validation with inline error messages

### Image Preview
- Used URL.createObjectURL for client-side preview
- Same preview URL reused in confirmation view
- Object-fit cover for consistent image display

## Files Modified Summary
- Modified: 2 files (store.ts, submit route)
- Created: 1 file (submit page component)
- Total lines added: ~289 lines

## Next Steps
Plan 1.3 will implement the submission-to-questions converter, allowing admins to transform collected desk photos into quiz questions with automatic answer assignment.
