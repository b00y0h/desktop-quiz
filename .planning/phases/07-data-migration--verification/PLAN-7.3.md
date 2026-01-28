---
plan: "07.3"
title: "Functional Verification - End-to-End Testing"
wave: 3
depends_on: ["07.2"]
files_modified: []
autonomous: true
---

# Plan 7.3: Functional Verification - End-to-End Testing

## Objective
Verify all quiz functionality works correctly after the migration by testing the complete user flows: quiz creation, photo submission, quiz playing, and results viewing.

## must_haves
- [ ] Creating a new quiz works correctly (VER-01)
- [ ] Submitting photos via submission token works (VER-01)
- [ ] Closing submissions generates questions from submissions (VER-01)
- [ ] Playing a quiz and submitting answers works (VER-01)
- [ ] Leaderboard displays correct scores (VER-01)
- [ ] Existing migrated quizzes are playable (VER-01)
- [ ] No stale read issues on any operation (VER-02)
- [ ] Quiz deletion removes data and images correctly

## Tasks

<task id="1" description="Test new quiz creation flow">
**Test: Create a new quiz**

1. Navigate to the quiz creation page (or use API)
2. Create a quiz with:
   - Title: "Migration Test Quiz"
   - Description: "Testing after migration"
   - Admin PIN: "1234"

**Expected results:**
- Quiz created successfully
- Unique 6-character code generated
- Status starts as 'draft'
- Quiz retrievable by code and ID
- No CDN stale read issues (immediate visibility)

**Verification commands:**
```bash
# Via API (adjust to your environment)
curl -X POST http://localhost:3000/api/quiz \
  -H "Content-Type: application/json" \
  -d '{"title":"Migration Test Quiz","description":"Testing after migration","adminPin":"1234"}'
```

Record the quiz ID and code for subsequent tests.
</task>

<task id="2" description="Test photo submission flow" depends_on="1">
**Test: Submit photos via submission token**

1. Generate submission token for the test quiz (admin action)
2. Use the submission token URL
3. Submit a test photo with name "Test Person"

**Expected results:**
- Submission token generated successfully
- Quiz status changes to 'collecting'
- Photo uploaded to Vercel Blob
- Submission appears in quiz data
- No duplicate name checking fails incorrectly

**Verification:**
```sql
-- Check submissions for quiz
SELECT * FROM submissions WHERE quiz_id = '[quiz-id]';

-- Check quiz status updated
SELECT status, submission_token FROM quizzes WHERE id = '[quiz-id]';
```
</task>

<task id="3" description="Test closing submissions" depends_on="2">
**Test: Close submissions and generate questions**

1. As admin, close submissions for the test quiz
2. Verify questions are generated from submissions

**Expected results:**
- Status changes to 'closed'
- Questions created from submissions
- Image URLs in questions match submission image URLs
- Answer text matches submission names
- Question order is sequential

**Verification:**
```sql
-- Check questions created
SELECT id, image_url, answer, "order"
FROM questions
WHERE quiz_id = '[quiz-id]'
ORDER BY "order";

-- Verify image URLs match submissions
SELECT q.image_url as q_url, s.image_url as s_url
FROM questions q
JOIN submissions s ON q.image_url = s.image_url
WHERE q.quiz_id = '[quiz-id]';
```
</task>

<task id="4" description="Test playing quiz and submitting answers" depends_on="3">
**Test: Play quiz and submit answers**

1. Activate the quiz (status: active)
2. Join as participant using quiz code
3. Answer all questions
4. Submit with name "Test Player"

**Expected results:**
- Quiz playable via code lookup
- Questions displayed with images (from Blob)
- Answers submitted and scored correctly
- Participant record created
- Answer records created for each question
- Time taken recorded

**Verification:**
```sql
-- Check participant created
SELECT * FROM participants WHERE quiz_id = '[quiz-id]';

-- Check answers recorded
SELECT a.* FROM answers a
JOIN participants p ON a.participant_id = p.id
WHERE p.quiz_id = '[quiz-id]';
```
</task>

<task id="5" description="Test leaderboard and results" depends_on="4">
**Test: Verify leaderboard displays correctly**

1. View leaderboard for the test quiz
2. Submit as a second player with different answers
3. Verify sorting (by score, then time)

**Expected results:**
- Leaderboard shows all participants
- Scores calculated correctly
- Sorted by score (descending), then time (ascending)
- Participant can view their individual results

**Verification via API:**
```bash
curl http://localhost:3000/api/quiz/[quiz-id]/leaderboard
```

Check response has participants sorted correctly.
</task>

<task id="6" description="Test existing migrated quiz playability">
**Test: Play a quiz that was migrated from Blob**

1. Pick an existing migrated quiz (not the test one)
2. Attempt to play it if active, or activate it
3. Verify all data accessible

**Expected results:**
- Quiz loads with all original data
- Questions display with original images
- Original participants visible
- No errors accessing migrated data

This confirms the migration preserved all functionality.
</task>

<task id="7" description="Test quiz deletion" depends_on="5">
**Test: Delete quiz removes all data**

1. Delete the test quiz using admin PIN
2. Verify all related data removed

**Expected results:**
- Quiz record deleted from quizzes table
- All questions deleted (cascade)
- All submissions deleted (cascade)
- All participants deleted (cascade)
- All answers deleted (cascade)
- Images deleted from Vercel Blob

**Verification:**
```sql
-- All should return 0 rows
SELECT COUNT(*) FROM quizzes WHERE id = '[quiz-id]';
SELECT COUNT(*) FROM questions WHERE quiz_id = '[quiz-id]';
SELECT COUNT(*) FROM submissions WHERE quiz_id = '[quiz-id]';
SELECT COUNT(*) FROM participants WHERE quiz_id = '[quiz-id]';
```
</task>

<task id="8" description="Test no CDN stale read issues">
**Test: Verify immediate consistency (VER-02)**

Perform rapid read-after-write operations:

1. Create a quiz
2. Immediately read it back by ID
3. Immediately read it back by code
4. Add a question
5. Immediately read quiz and verify question present

**Expected results:**
- All reads return up-to-date data
- No stale/cached responses
- Direct database queries provide immediate consistency

This is the key benefit of migrating from Blob to Postgres - no more CDN caching issues.
</task>

## Verification

1. **All CRUD operations work**: Create, read, update, delete quiz
2. **Submission flow complete**: Token generation, photo upload, close submissions
3. **Play flow complete**: Join quiz, answer questions, view results
4. **Leaderboard works**: Scores calculated and sorted correctly
5. **Migrated data works**: Existing quizzes playable
6. **Deletion cascades**: All related records removed
7. **No stale reads**: Immediate consistency on all operations
