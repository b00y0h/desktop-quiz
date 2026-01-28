# Summary: Plan 6.2 - Question and Submission Management

## Status: Complete

## What Was Done
Rewrote question and submission management methods in store.ts:

1. **addQuestion** - Inserts to questions table, calculates next order from existing questions
2. **removeQuestion** - Deletes question, reorders remaining questions sequentially
3. **generateSubmissionToken** - Updates quiz with token and status='collecting'
4. **getQuizBySubmissionToken** - Direct lookup by quiz ID prefix, fallback for legacy tokens
5. **addSubmission** - Inserts to submissions table
6. **hasSubmissionName** - Queries submissions table for case-insensitive name match
7. **deleteSubmission** - Deletes from Postgres AND calls del() for Blob image
8. **closeSubmissions** - Generates questions from submissions, updates status to 'closed'

## Requirements Addressed
- STORE-01: Store layer uses Postgres instead of Blob JSON
- STORE-02: All store methods maintain same interface
- STORE-03: Image URLs continue pointing to Vercel Blob

## Commits
- fce590d: feat(6): migrate store.ts from Blob JSON to Postgres/Drizzle

## must_haves Verification
- [x] addQuestion inserts to questions table (STORE-01)
- [x] removeQuestion deletes from questions table and reorders (STORE-01)
- [x] generateSubmissionToken updates quiz with token and status (STORE-01)
- [x] getQuizBySubmissionToken finds quiz from Postgres (STORE-01)
- [x] addSubmission inserts to submissions table (STORE-01)
- [x] hasSubmissionName queries submissions table (STORE-01)
- [x] deleteSubmission deletes from Postgres AND calls del() for Blob image (STORE-01, STORE-03)
- [x] closeSubmissions generates questions from submissions (STORE-01, STORE-02)
