# Phase 4 Research: Auto-Generation of Quiz Questions

**Date:** 2026-01-28
**Phase:** 4 - Auto-Generation of Quiz Questions
**Requirements:** GEN-01, GEN-02, GEN-03

## Objective
Research and document what needs to be known to automatically generate quiz questions from submissions when the admin closes submissions. Each submission should become one "Whose desk is this?" question with 4-5 randomized name choices.

---

## Current State Analysis

### Existing Data Model (from `/workspace/src/lib/store.ts`)

**Quiz interface:**
```typescript
export interface Quiz {
  id: string
  title: string
  description?: string
  code: string
  status: 'draft' | 'collecting' | 'active' | 'closed'
  adminPin: string
  createdAt: string
  questions: Question[]        // Existing questions array
  participants: Participant[]
  submissionToken?: string
  submissions: Submission[]    // Populated during collection phase
}

export interface Question {
  id: string
  imageUrl: string
  answer: string
  order: number
}

export interface Submission {
  id: string
  name: string
  imageUrl: string
  createdAt: string
}
```

**Key findings:**
- Questions and submissions use the same data structure (imageUrl + name/answer)
- Questions have an `order` field for sequencing
- Questions use `answer` field while submissions use `name` field
- Both are stored in the same Quiz blob
- Manual question creation already works via `store.addQuestion()`

### Existing Question Creation Flow

**Current manual flow:** Admin uploads image → API stores in Blob → `addQuestion()` appends to Quiz

**Relevant store method (lines 155-167):**
```typescript
async addQuestion(quizId: string, imageUrl: string, answer: string): Promise<Question | null> {
  const quiz = await loadQuiz(quizId)
  if (!quiz) return null
  const question: Question = {
    id: genId(),
    imageUrl,
    answer,
    order: quiz.questions.length,
  }
  quiz.questions.push(question)
  await saveQuiz(quiz)
  return question
}
```

**Pattern to follow:** Generate questions should follow the same structure but create multiple questions from submissions array.

### Existing Close Submissions Flow

**Current closeSubmissions method (lines 266-274):**
```typescript
async closeSubmissions(quizId: string, adminPin: string): Promise<Quiz | null> {
  const quiz = await loadQuiz(quizId)
  if (!quiz) return null
  if (quiz.adminPin !== adminPin) return null
  if (quiz.status !== 'collecting') return null
  quiz.status = 'closed'
  await saveQuiz(quiz)
  return quiz
}
```

**Key insight:** This is the hook point for auto-generation. Need to add question generation logic before status transition.

### Existing Answer Option Generation (Play Flow)

**Current implementation (lines 24-32 in `/workspace/src/app/api/quiz/code/[code]/route.ts`):**
```typescript
return NextResponse.json({
  id: quiz.id,
  title: quiz.title,
  description: quiz.description,
  status: quiz.status,
  questionCount: quiz.questions.length,
  questions: quiz.questions.map(q => ({ id: q.id, imageUrl: q.imageUrl, order: q.order })),
  names: [...quiz.questions.map(q => q.answer)].sort(() => Math.random() - 0.5),
})
```

**Current behavior:**
- Returns ALL question answers as name choices
- Randomizes the order with `.sort(() => Math.random() - 0.5)`
- Players see all names for every question
- Play page filters out already-used names per question (lines 161-169 in play page)

**Problem for Phase 4:**
- If we have 20 submissions, players would see 20 names per question
- Requirements specify 4-5 names per question
- Need to generate a **subset of names per question** instead of all names

---

## What Needs to Be Built

### 1. Question Generation Algorithm

**Core transformation:** `Submission[] → Question[]`

**Algorithm requirements:**
1. Create one question per submission (GEN-02)
2. Each question uses submission's imageUrl and name
3. Each question gets 4-5 answer options:
   - The correct answer (submission.name)
   - 3-4 random incorrect names from other submissions
4. Questions must be ordered consistently
5. Generate unique question IDs

**Implementation approach:**
```typescript
function generateQuestionsFromSubmissions(submissions: Submission[]): Question[] {
  return submissions.map((submission, index) => {
    // Get all other names for wrong answers
    const otherNames = submissions
      .filter(s => s.id !== submission.id)
      .map(s => s.name)

    // Randomly select 3-4 wrong answers
    const numWrongAnswers = Math.min(3, otherNames.length) // 3-4 depending on total
    const wrongAnswers = shuffleArray(otherNames).slice(0, numWrongAnswers)

    // Create question object
    return {
      id: genId(),
      imageUrl: submission.imageUrl,
      answer: submission.name,
      order: index,
    }
  })
}
```

**Question to resolve:** Where should we store the answer options?

**Options:**
1. **Store nothing (generate dynamically)** - Generate options on-the-fly when quiz is fetched for play
2. **Store options in Question interface** - Add `options: string[]` field to Question
3. **Store mapping separately** - Add `questionOptions: Record<questionId, string[]>` to Quiz

**Recommendation:** Option 1 (generate dynamically)
- Simpler data model (no schema changes)
- Options are deterministic (can regenerate anytime)
- Consistent with current approach (names randomized on fetch)
- Less storage overhead

### 2. Answer Option Generation Strategy

**Current problem:** Players see ALL names for every question

**New requirement:** Each question shows 4-5 names (correct + 3-4 wrong)

**Solution options:**

#### Option A: Generate per-question subsets dynamically
Store a subset of names per question when generating, then return those subsets in the play API.

**Pros:**
- Deterministic (same options every time)
- Can ensure good distribution

**Cons:**
- Requires schema change (Question needs `options` field)
- More complex data model

#### Option B: Generate random subsets on each quiz load
When player fetches quiz, randomly pick 3-4 wrong answers for each question.

**Pros:**
- No schema changes needed
- Simple implementation
- Options change each time (prevents memorization)

**Cons:**
- Non-deterministic (different options per attempt)
- Player retakes might see different options

#### Option C: Store per-question options in separate Quiz field
Add `questionOptions: Record<string, string[]>` to Quiz interface.

**Pros:**
- Deterministic
- No Question schema change
- Options stored separately from questions

**Cons:**
- More complex data structure
- Need to maintain sync between questions and options

**Recommendation:** Option B (generate random subsets on load)

**Rationale:**
- Simplest implementation
- No schema changes
- Quiz retakes already overwrite previous submission (existing behavior)
- Different options per attempt is actually a feature (prevents gaming)
- Consistent with existing randomization pattern

**Implementation pattern:**
```typescript
// In GET /api/quiz/code/[code] route
const questionsWithOptions = quiz.questions.map(q => {
  const allNames = quiz.questions.map(q => q.answer)
  const wrongAnswers = allNames
    .filter(name => name !== q.answer)
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(4, allNames.length - 1))

  const options = [q.answer, ...wrongAnswers]
    .sort(() => Math.random() - 0.5)

  return {
    id: q.id,
    imageUrl: q.imageUrl,
    order: q.order,
    options, // NEW: 4-5 names including correct answer
  }
})
```

### 3. Integration with Close Submissions Workflow

**Current flow:**
1. Admin clicks "Close Submissions" button
2. Frontend calls PATCH `/api/quiz/[id]` with `{ action: 'closeSubmissions', pin }`
3. Backend calls `store.closeSubmissions(quizId, pin)`
4. Store validates and sets status to 'closed'

**New flow (with auto-generation):**
1. Admin clicks "Close Submissions" button
2. Frontend calls PATCH `/api/quiz/[id]` with `{ action: 'closeSubmissions', pin }`
3. Backend calls `store.closeSubmissions(quizId, pin)`
4. **NEW:** Store generates questions from submissions **before** status transition
5. Store validates and sets status to 'closed'
6. Questions are now available for play

**Implementation location:** Inside `closeSubmissions()` method in store.ts

**Error handling considerations:**
- What if there are no submissions? (Don't generate, allow manual questions)
- What if there's only 1 submission? (Can't generate 4-5 options)
- What if questions already exist? (Append or replace?)

### 4. Play Page Adaptation

**Current play page behavior (lines 161-169 in `/workspace/src/app/play/[code]/page.tsx`):**
```tsx
{quiz.names.map(n => {
  const usedOnOther = Object.entries(guesses).some(
    ([qId, guess]) => qId !== q.id && guess === n
  )
  const isSelected = guesses[q.id] === n
  if (usedOnOther && !isSelected) return null  // Filter out used names
  return (
    <button onClick={() => selectAnswer(q.id, n)}>
      {n}
    </button>
  )
})}
```

**Current limitation:** This filters ALL names to prevent reuse, but with per-question options, we need different logic.

**New behavior needed:**
- Each question has its own `options` array (4-5 names)
- Don't filter by "used on other questions" (options are unique per question)
- Simply display the options for that question

**Changes needed:**
```tsx
// OLD: quiz.names (all names)
// NEW: q.options (per-question names)

{q.options.map(name => {
  const isSelected = guesses[q.id] === name
  return (
    <button onClick={() => selectAnswer(q.id, name)}>
      {name}
    </button>
  )
})}
```

**Interface change needed:**
```typescript
// In play page
interface Question {
  id: string
  imageUrl: string
  order: number
  options: string[]  // NEW
}
```

---

## Technical Patterns to Follow

### 1. Question Generation in Store Layer

Follow existing `addQuestion()` pattern:
- Generate in store, not in API route
- Use `genId()` for question IDs
- Use `order` field for sequencing
- Append to `quiz.questions` array
- Call `saveQuiz()` once at the end

### 2. Array Shuffling Utility

**Existing shuffle approach:**
```typescript
.sort(() => Math.random() - 0.5)
```

**Problem:** Not truly random, biased distribution
**Better approach:** Fisher-Yates shuffle

```typescript
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
```

**Decision:** Use existing `.sort()` approach for consistency, can optimize later.

### 3. Read-Modify-Write Pattern

Already used throughout store.ts:
```typescript
const quiz = await loadQuiz(quizId)
// modify quiz
await saveQuiz(quiz)
```

Follow this pattern for question generation.

### 4. Optimistic UI Updates

Admin dashboard uses optimistic updates (lines 108-128):
```typescript
setQuiz(prev => ({ ...prev, questions: [...prev.questions, newQuestion] }))
setTimeout(async () => {
  const updated = await loadQuiz(pin)
  if (updated) setQuiz(updated)
}, 2000)
```

**For closeSubmissions:** Already reloads quiz after closing (line 207-208)
```typescript
const updated = await loadQuiz(pin)
if (updated) setQuiz(updated)
```

No changes needed - existing reload will fetch newly generated questions.

---

## Implementation Plan Breakdown

### Plan 4.1: Generate Questions from Submissions in Store

**Goal:** Add question generation logic to `closeSubmissions()` method

**Files to modify:**
- `/workspace/src/lib/store.ts`

**Changes:**
1. Add helper function to generate questions from submissions
2. Modify `closeSubmissions()` to call generation before status transition
3. Append generated questions to existing questions array
4. Handle edge cases (0 submissions, 1 submission, existing questions)

**Edge case decisions:**
- 0 submissions: Don't generate, allow status transition (manual questions still work)
- 1 submission: Generate but can't provide wrong answers (only show correct answer?)
- 2-3 submissions: Generate with fewer options (2-4 options instead of 5)
- 4+ submissions: Generate with full 4-5 options
- Existing questions: Append generated questions, don't replace

### Plan 4.2: Add Per-Question Options to Play API

**Goal:** Return 4-5 name options per question instead of all names

**Files to modify:**
- `/workspace/src/app/api/quiz/code/[code]/route.ts`

**Changes:**
1. Change response from `names: string[]` to per-question `options: string[]`
2. For each question, generate 3-4 random wrong answers
3. Combine with correct answer and shuffle
4. Return in question object

**Considerations:**
- Maintain backward compatibility? No, this is a breaking change (intentional)
- Cache options? No, generate fresh each time
- Deterministic vs random? Random (better for retakes)

### Plan 4.3: Update Play Page for Per-Question Options

**Goal:** Display per-question options instead of all names

**Files to modify:**
- `/workspace/src/app/play/[code]/page.tsx`

**Changes:**
1. Update `Question` interface to include `options: string[]`
2. Change from `quiz.names.map()` to `q.options.map()`
3. Remove "usedOnOther" filtering logic (no longer needed)
4. Simplify option rendering (just show the options)

**Testing considerations:**
- Verify options are unique per question
- Verify correct answer is always included
- Verify 4-5 options displayed
- Verify selection still works
- Verify scoring still works (unchanged)

---

## Key Technical Decisions

### 1. When to Generate Questions?

**Decision:** During `closeSubmissions()` call (synchronous)

**Alternatives considered:**
- On first quiz fetch (lazy generation)
- Via separate "Generate Questions" button
- Background job after closing

**Rationale:**
- Synchronous is simplest
- Admin sees questions immediately after closing
- Matches requirement "auto-generate when admin closes"
- No additional UI needed

### 2. How Many Answer Options?

**Decision:** 4-5 options (1 correct + 3-4 wrong)

**Logic:**
- If 1 submission: Show only correct answer (no options needed)
- If 2-3 submissions: Show 2-4 options
- If 4+ submissions: Show 5 options (1 correct + 4 wrong)

**Alternative:** Always show exactly 5 options (pad with empty or repeat names)
**Rejected:** Weird UX, requirements say "4-5" not "exactly 5"

### 3. Deterministic vs Random Options?

**Decision:** Random (generate fresh on each quiz load)

**Rationale:**
- Simpler (no schema changes)
- Better for retakes (prevents memorization)
- Consistent with existing randomization pattern
- Requirement doesn't specify "same options each time"

**Tradeoff:** Player can't review exact options from previous attempt
**Acceptable:** They can see correct/incorrect answers in results

### 4. Append or Replace Questions?

**Decision:** Append generated questions to existing questions

**Rationale:**
- Admin might have manually added questions before collecting submissions
- Both flows should work (manual + auto-generated)
- Appending preserves admin work
- Questions use `order` field so sequencing still works

**Alternative:** Replace all questions
**Rejected:** Destructive, loses manual work, not required

### 5. Handle Mixed Workflows?

**Scenario:** Admin manually adds questions, then collects submissions, then closes

**Decision:** Allow both - generated questions append after manual questions

**Order:**
- Manual questions: order 0, 1, 2, ...
- Generated questions: order N, N+1, N+2, ... (where N = manual count)

**UI consideration:** Admin dashboard already shows all questions, no changes needed

---

## Edge Cases and Error Handling

### 1. Zero Submissions

**Scenario:** Admin closes submissions without any submissions

**Behavior:**
- Don't generate any questions
- Allow status transition to 'closed'
- Admin can still manually add questions
- Quiz can still be published

**Rationale:** Manual question flow should still work

### 2. One Submission

**Scenario:** Only one person submitted

**Options:**
- Skip generation (not enough for quiz)
- Generate questions anyway (no wrong answers available)
- Show error to admin

**Recommendation:** Generate questions anyway
- Show only the correct answer as an option
- Not ideal UX but technically valid
- Admin can add more questions manually if desired

**Alternative:** Skip generation, show admin message
**Rejected:** Requires additional UI, complicates flow

### 3. Duplicate Names

**Scenario:** Two submissions with same name (shouldn't happen due to Phase 1 validation)

**Current protection:** Duplicate name detection in submission flow (WORK-03)

**Fallback:** If duplicates somehow exist:
- Use all submissions (duplicates included)
- Question generation works normally
- Player might see same name twice in options (confusing but not broken)

**Prevention:** Existing validation should prevent this

### 4. Invalid Image URLs

**Scenario:** Submission imageUrl is broken or deleted

**Current behavior:** Play page shows broken image (`<img>` with alt text)

**No additional handling needed:** Same as existing question flow

### 5. Very Large Submission Sets

**Scenario:** 50+ submissions

**Concerns:**
- Question generation performance
- Quiz blob size
- Play page performance

**Analysis:**
- Generation: O(n²) but n is small (<100), acceptable
- Blob size: 50 questions × 200 bytes ≈ 10 KB, well under 4.5 MB limit
- Play performance: Already handles many questions (existing design)

**No special handling needed for MVP**

### 6. Concurrent Close Operations

**Scenario:** Admin clicks "Close Submissions" twice rapidly

**Current protection:** Button disabled during submission (phase 'submitting')

**Store-level protection:** Status check `if (quiz.status !== 'collecting')`
- Second call will fail (status already 'closed')
- Questions won't be duplicated

**No additional handling needed**

---

## Data Flow Diagrams

### Question Generation Flow

```
Admin clicks "Close Submissions"
    ↓
Frontend: PATCH /api/quiz/[id] { action: 'closeSubmissions' }
    ↓
Backend: store.closeSubmissions(quizId, pin)
    ↓
Store: loadQuiz(quizId)
    ↓
Store: validatePin + validateStatus
    ↓
Store: generateQuestionsFromSubmissions(quiz.submissions)  ← NEW
    ↓
    For each submission:
      - Create Question object
      - Set imageUrl = submission.imageUrl
      - Set answer = submission.name
      - Set order = index
      - Generate unique ID
    ↓
Store: quiz.questions.push(...newQuestions)  ← NEW
    ↓
Store: quiz.status = 'closed'
    ↓
Store: saveQuiz(quiz)
    ↓
Backend: return { success: true, status: 'closed', questionCount: quiz.questions.length }  ← NEW
    ↓
Frontend: reload quiz (existing behavior)
    ↓
Admin sees questions in dashboard
```

### Play Flow (Modified)

```
Player enters quiz code
    ↓
Frontend: GET /api/quiz/code/[code]
    ↓
Backend: load quiz + validate status
    ↓
Backend: for each question, generate 4-5 options:  ← MODIFIED
    - Get all other names
    - Randomly select 3-4 wrong answers
    - Add correct answer
    - Shuffle all 5 options
    ↓
Backend: return quiz with questions[].options
    ↓
Frontend: render questions with options
    ↓
Player selects answers (same as before)
    ↓
Frontend: POST /api/quiz/[id]/submit (unchanged)
    ↓
Backend: score answers (unchanged)
```

---

## Testing Strategy

### Manual Testing Checklist

**Setup:**
1. Create quiz
2. Generate submission token
3. Submit 5 test desk photos with different names
4. Click "Close Submissions"

**Test Cases:**

#### GEN-01: Auto-generate on close
- ✓ Verify questions appear in admin dashboard after closing
- ✓ Verify question count = submission count
- ✓ Verify each question has correct imageUrl from submission
- ✓ Verify each question has correct answer (submission name)

#### GEN-02: One question per submission
- ✓ If 5 submissions, verify exactly 5 questions generated
- ✓ If 10 submissions, verify exactly 10 questions generated
- ✓ Verify no duplicate questions

#### GEN-03: 4-5 random name choices
- ✓ Play the quiz and verify each question shows 4-5 names
- ✓ Verify correct answer is always included in options
- ✓ Verify wrong answers are from other submissions
- ✓ Verify options are randomized (different order each time)
- ✓ Take quiz twice and verify options may differ

#### Edge Cases:
- ✓ Zero submissions: verify quiz still closes, no questions generated
- ✓ One submission: verify question generated with limited options
- ✓ Two submissions: verify both questions have 2-3 options
- ✓ Mixed workflow: manually add 2 questions, submit 3 photos, verify 5 total questions

#### Integration:
- ✓ Answer all questions and verify scoring works correctly
- ✓ Submit answers and verify leaderboard works
- ✓ Verify admin can still manually add questions after auto-generation
- ✓ Verify quiz can be published and played normally

### No Automated Tests

Per `.planning/STATE.md`: "No testing framework configured; plans are autonomous"

Manual testing sufficient for MVP.

---

## Dependencies and Blockers

### Dependencies

**Required (all complete):**
- ✓ Phase 1: Submission infrastructure exists
- ✓ Phase 2: Submission preview working
- ✓ Phase 3: Close submissions workflow working
- ✓ Quiz model has `submissions[]` array
- ✓ Question model has all needed fields

### Blockers

**None identified**

### Risks

**Low risk:**
- Simple data transformation (submissions → questions)
- No new external dependencies
- Follows existing patterns

**Medium risk:**
- API response format change (breaking for play page)
- Requires coordinated changes across 3 files
- Edge cases with few submissions

**Mitigation:**
- Test with various submission counts
- Deploy all changes together (atomic)
- Manual testing before merge

---

## Performance Considerations

### Question Generation Performance

**Algorithm complexity:**
- Iterate over submissions: O(n)
- For each submission, create question: O(1)
- Overall: O(n)

**Expected n:** 10-50 submissions (team size)

**Time estimate:** <10ms for typical team

**No optimization needed for MVP**

### Option Generation Performance

**Algorithm complexity:**
- For each question: O(n)
- Filter other names: O(n)
- Shuffle and slice: O(n log n)
- Overall: O(n² log n)

**Expected n:** 10-50 questions

**Time estimate:** <100ms for typical team

**Acceptable for quiz load (one-time operation per player)**

### Storage Impact

**Before:** Quiz blob with submissions
- Example: 10 submissions × 200 bytes ≈ 2 KB

**After:** Quiz blob with submissions + questions
- Example: 10 submissions × 200 bytes + 10 questions × 200 bytes ≈ 4 KB

**Increase:** Roughly 2x (still well under 4.5 MB limit)

**No storage optimization needed**

### Client-Side Rendering

**Play page:** Already handles many questions

**No new performance concerns**

---

## Security Considerations

### Authentication

**Question generation:** Triggered by `closeSubmissions()` which validates admin PIN

**No new security risks**

### Data Validation

**Submission names:** Already validated in Phase 1 (duplicate prevention)

**Image URLs:** Already validated in upload flow

**No new validation needed**

### Injection Risks

**Names in questions:** Same as existing question flow (no script execution risk)

**Display context:** Already escaped in React JSX

**No new injection risks**

---

## Backward Compatibility

### Breaking Changes

**API response format change:**
- Old: `{ names: string[] }` (all names)
- New: `{ questions: Array<{ options: string[] }> }` (per-question options)

**Impact:** Play page must be updated in same deployment

**Mitigation:** Deploy API + frontend changes atomically (Next.js handles this)

### Non-Breaking Changes

**Store methods:** New behavior in `closeSubmissions()` is backward compatible
- Existing quizzes without submissions: no questions generated (same as before)
- Existing quizzes with manual questions: still work (append don't replace)

**Admin dashboard:** No changes needed (already displays all questions)

---

## Migration Considerations

### Existing Quizzes

**Scenario:** Quizzes created before Phase 4 deployment

**Behavior:**
- Manual questions still work (unchanged)
- If submissions exist and quiz reopened, can close again to generate
- No automatic migration needed

**Recommendation:** No migration required

### Data Schema

**No schema changes needed:**
- Question interface unchanged
- Submission interface unchanged
- Quiz interface unchanged

**Generation logic is pure transformation, no data migration**

---

## Alternative Approaches Considered

### Alternative 1: Store Answer Options in Question Model

**Approach:**
```typescript
interface Question {
  id: string
  imageUrl: string
  answer: string
  order: number
  options: string[]  // Store per-question options
}
```

**Pros:**
- Deterministic (same options every time)
- Faster quiz load (no generation needed)

**Cons:**
- Schema change required
- More storage overhead
- Options become stale if submissions added/removed
- Retakes see same options (enables memorization)

**Rejected:** Not worth the complexity for MVP

### Alternative 2: Separate "Generate Questions" Button

**Approach:** Admin manually triggers generation after closing

**Pros:**
- More explicit control
- Could regenerate if needed
- Could preview before generating

**Cons:**
- Extra step for admin (worse UX)
- Doesn't match requirement "auto-generate when admin closes"
- More UI complexity

**Rejected:** Requirement says "auto" not "manual"

### Alternative 3: Generate Minimum 5 Options Always

**Approach:** If fewer than 5 submissions, pad with duplicates or placeholders

**Example:** 3 submissions → show "Alice", "Bob", "Charlie", "Alice", "Bob" as options

**Pros:**
- Consistent option count
- Always 5 buttons

**Cons:**
- Confusing UX (duplicate names)
- Looks broken
- Not required by spec

**Rejected:** Variable option count is fine

---

## Future Enhancements (Out of Scope)

### 1. Question Difficulty Weighting

Add difficulty levels based on desk recognizability:
- Easy: Obvious personal items
- Hard: Minimal/generic desk

**Complexity:** Would require ML or manual tagging

### 2. Smart Option Selection

Instead of random wrong answers, pick "similar" desks:
- Same desk style
- Similar monitor setup
- Same office area

**Complexity:** Requires image analysis

### 3. Question Review Before Publishing

Show admin preview of generated questions with ability to:
- Edit options
- Remove bad questions
- Reorder questions

**Complexity:** New UI flow + state management

### 4. Regenerate Questions

Allow admin to regenerate questions with different random options

**Complexity:** New API action + button

### 5. Export/Import Questions

Download questions as JSON, edit offline, re-upload

**Complexity:** File handling + validation

**All deferred to future phases**

---

## Summary: What You Need to Know to Plan This Phase Well

### Core Problem

Transform `Submission[]` into `Question[]` when admin closes submissions, then modify play flow to show 4-5 options per question instead of all names.

### Key Implementation Points

1. **Modify `closeSubmissions()` in store.ts**
   - Add question generation logic before status transition
   - One question per submission
   - Append to existing questions array
   - Handle edge cases (0-3 submissions)

2. **Modify play API in `/api/quiz/code/[code]/route.ts`**
   - Change from returning `names: string[]` to per-question `options: string[]`
   - Generate 3-4 random wrong answers per question
   - Include correct answer and shuffle

3. **Modify play page in `/play/[code]/page.tsx`**
   - Update Question interface to include `options: string[]`
   - Change from `quiz.names.map()` to `q.options.map()`
   - Remove name filtering logic (no longer needed)

### Data Structures

**No schema changes required** - pure transformation of existing data

**Generation algorithm:**
```
For each submission:
  Create question with submission.imageUrl and submission.name
  Assign order = index
  Generate unique ID
Append all generated questions to quiz.questions[]
```

**Option generation algorithm (per question):**
```
Get all names from questions
Remove correct answer
Shuffle remaining names
Take first 3-4
Add correct answer back
Shuffle all options
Return 4-5 options
```

### Critical Files

1. `/workspace/src/lib/store.ts` - Add generation in `closeSubmissions()`
2. `/workspace/src/app/api/quiz/code/[code]/route.ts` - Change response format
3. `/workspace/src/app/play/[code]/page.tsx` - Update UI to use per-question options

### Testing Focus

- Various submission counts (0, 1, 2, 5, 10, 20)
- Mixed workflows (manual + auto-generated questions)
- Verify 4-5 options per question
- Verify correct answer always included
- Verify scoring still works
- Verify retakes work

### Complexity Assessment

**Low complexity:**
- Simple data transformation
- Follows existing patterns
- No new dependencies
- No schema changes

**Moderate coordination:**
- Changes across 3 files
- Breaking API change (coordinated deployment)
- Multiple edge cases

**Overall:** Medium complexity, high value

### Estimated Effort

- Backend (store + API): 2 hours
- Frontend (play page): 1 hour
- Testing: 1 hour
- Total: ~4 hours for complete phase

---

## References

### Code to Study

**Question creation pattern:**
- `/workspace/src/lib/store.ts` lines 155-167 (`addQuestion`)

**Close submissions flow:**
- `/workspace/src/lib/store.ts` lines 266-274 (`closeSubmissions`)

**Current play API:**
- `/workspace/src/app/api/quiz/code/[code]/route.ts` lines 24-32

**Current play page options:**
- `/workspace/src/app/play/[code]/page.tsx` lines 161-183

**Admin dashboard question display:**
- `/workspace/src/app/admin/[id]/page.tsx` lines 465-488

### Data Model References

- Quiz interface: `/workspace/src/lib/store.ts` lines 6-18
- Question interface: `/workspace/src/lib/store.ts` lines 20-25
- Submission interface: `/workspace/src/lib/store.ts` lines 44-49

### Randomization Pattern

Current approach: `.sort(() => Math.random() - 0.5)`
- Used in play API (line 31 of quiz code route)
- Simple, consistent with existing code
- Good enough for MVP (can optimize later with Fisher-Yates)

---

**Research Complete:** Ready to create detailed implementation plans.
