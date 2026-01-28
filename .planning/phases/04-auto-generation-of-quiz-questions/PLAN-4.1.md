---
wave: 1
depends_on: []
files_modified:
  - src/lib/store.ts
autonomous: true
---

# Plan 4.1: Generate Questions from Submissions on Close

## Goal
When admin closes submissions, automatically generate one quiz question per submission by transforming `Submission[]` into `Question[]` and appending them to `quiz.questions`.

## Tasks

<task id="1">
Add question generation logic to `closeSubmissions()` in `/workspace/src/lib/store.ts`.

Before `quiz.status = 'closed'`, add:

```typescript
// Generate questions from submissions
if (quiz.submissions.length > 0) {
  const startOrder = quiz.questions.length
  const generatedQuestions: Question[] = quiz.submissions.map((submission, index) => ({
    id: genId(),
    imageUrl: submission.imageUrl,
    answer: submission.name,
    order: startOrder + index,
  }))
  quiz.questions.push(...generatedQuestions)
}
```

This handles all edge cases:
- 0 submissions: no questions generated, status still transitions
- 1+ submissions: one question per submission
- Existing manual questions: generated questions append after them (order continues from `quiz.questions.length`)
</task>

## Verification

1. Read `closeSubmissions()` in store.ts and confirm:
   - Question generation happens before status transition
   - Each submission maps to exactly one question with matching `imageUrl` and `answer`
   - `order` starts from existing question count (supports mixed manual + auto)
   - Empty submissions array produces no questions
   - `genId()` used for unique IDs

2. Run `npx next build` to verify no TypeScript errors

## must_haves
- [ ] One question generated per submission (GEN-01, GEN-02)
- [ ] Question uses submission.imageUrl and submission.name as answer
- [ ] Generated questions append after any existing manual questions
- [ ] Zero submissions produces zero questions without error
- [ ] Generation happens during closeSubmissions(), not as separate step
