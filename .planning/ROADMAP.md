# Roadmap — Milestone v1.1: Submission-Based Quiz Flow

## Overview
4 phases | 14 requirements | Quick depth

## Phases

### Phase 1: Submission Infrastructure
**Goal:** Enable workers to submit desk photos via a unique link with duplicate name prevention
**Requirements:** SUB-01, SUB-02, WORK-01, WORK-02, WORK-03
**Plans:**
1. Create submission link generation and management UI in admin dashboard
2. Build worker submission page with name validation and photo upload
3. Implement duplicate name detection and confirmation flow

**Success Criteria:**
1. Admin can generate and copy a unique submission link from the admin dashboard
2. Worker can visit the submission link, enter name, upload photo, and see confirmation
3. Worker attempting duplicate name sees warning and cannot submit
4. Admin can see submission count update after worker submits

### Phase 2: Submission Preview and Monitoring ✅
**Goal:** Give admin visibility into incoming submissions before closing
**Requirements:** SUB-03, SUB-04
**Plans:**
1. ~~Build submission preview UI in admin dashboard showing thumbnails and names~~
2. ~~Add real-time submission counter with refresh capability~~

**Success Criteria:**
1. ~~Admin can see how many submissions have been received without opening preview~~
2. ~~Admin can preview all submissions with names and photos in a gallery view~~
3. ~~Submission preview updates when admin refreshes the page~~
4. ~~Preview is accessible before submissions are closed~~

### Phase 3: State Management and Closing ✅
**Goal:** Enforce quiz state transitions from collecting → closed → playable
**Requirements:** STATE-01, STATE-02, STATE-03, STATE-04
**Plans:**
1. ~~Implement quiz state machine (collecting/closed/playable) in data model~~
2. ~~Add "Close Submissions" button to admin dashboard with state validation~~
3. ~~Add guards to prevent submissions after closing and playing before closing~~

**Success Criteria:**
1. ~~New quizzes start in "collecting submissions" state automatically~~
2. ~~Admin can close submissions via button, transitioning quiz to "closed" state~~
3. ~~Worker visiting submission link after closing sees "submissions closed" message~~
4. ~~Player attempting to play quiz before closing sees "quiz not ready" message~~
5. ~~Once closed, quiz becomes playable for participants~~

### Phase 4: Auto-Generation of Quiz Questions ✅
**Goal:** Automatically generate quiz questions from submissions when admin closes
**Requirements:** GEN-01, GEN-02, GEN-03
**Plans:**
1. ~~Build question generation algorithm that creates one question per submission~~
2. ~~Implement answer option randomization (4-5 names including correct answer)~~
3. ~~Integrate question generation into the "close submissions" workflow~~

**Success Criteria:**
1. ~~When admin closes submissions, questions automatically generate from all submissions~~
2. ~~Each submission becomes exactly one "Whose desk is this?" question with the desk photo~~
3. ~~Each question displays 4-5 randomized name choices including the correct answer~~
4. ~~Generated questions appear in admin dashboard and are playable by participants~~
5. ~~Questions can be played through the existing quiz flow without modification~~

## Dependency Graph

```
Phase 1 (Submission Infrastructure)
    ↓
Phase 2 (Submission Preview) — can work in parallel with Phase 3
    ↓
Phase 3 (State Management)
    ↓
Phase 4 (Auto-Generation) — depends on all previous phases
```

**Parallelization opportunity:** Phase 2 and Phase 3 can be developed in parallel after Phase 1 completes.

## Requirement Coverage

| REQ-ID | Phase | Description |
|--------|-------|-------------|
| SUB-01 | 1 | Admin can generate unique submission link |
| SUB-02 | 1 | Admin can copy submission link to clipboard |
| SUB-03 | 2 | Admin can see submission count |
| SUB-04 | 2 | Admin can preview submissions |
| WORK-01 | 1 | Worker can submit name and photo |
| WORK-02 | 1 | Worker sees confirmation after submission |
| WORK-03 | 1 | Duplicate names prevented |
| STATE-01 | 3 | Quiz enforces state transitions |
| STATE-02 | 3 | Admin can close submissions |
| STATE-03 | 3 | Workers cannot submit after closing |
| STATE-04 | 3 | Players cannot play until closed |
| GEN-01 | 4 | Questions auto-generate on close |
| GEN-02 | 4 | Each submission becomes one question |
| GEN-03 | 4 | Questions show 4-5 random name choices |

**Coverage verification:** All 14 requirements mapped ✓
