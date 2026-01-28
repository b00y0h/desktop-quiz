---
wave: 2
depends_on:
  - PLAN-4.1.md
files_modified:
  - src/app/api/quiz/code/[code]/route.ts
  - src/app/play/[code]/page.tsx
autonomous: true
---

# Plan 4.2: Per-Question Answer Options in API and Play Page

## Goal
Change the play API to return 4-5 randomized name options per question (instead of all names globally), and update the play page to render per-question options.

## Tasks

<task id="1">
Modify the GET handler in `/workspace/src/app/api/quiz/code/[code]/route.ts`.

Replace the current response that returns a flat `names` array with per-question `options`. For each question:
1. Collect all question answers (names)
2. Filter out the current question's correct answer
3. Shuffle the remaining names and take up to 4 wrong answers
4. Combine with correct answer, shuffle again
5. Return as `options: string[]` on each question object

Change the questions mapping from:
```typescript
questions: quiz.questions.map(q => ({ id: q.id, imageUrl: q.imageUrl, order: q.order })),
names: [...quiz.questions.map(q => q.answer)].sort(() => Math.random() - 0.5),
```

To:
```typescript
questions: quiz.questions.map(q => {
  const otherNames = quiz.questions
    .map(oq => oq.answer)
    .filter(name => name !== q.answer)
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
  const options = [q.answer, ...otherNames].sort(() => Math.random() - 0.5)
  return { id: q.id, imageUrl: q.imageUrl, order: q.order, options }
}),
```

Remove the `names` field from the response entirely.
</task>

<task id="2">
Update the play page `/workspace/src/app/play/[code]/page.tsx`.

1. Update the Question interface to add `options: string[]`
2. Remove `names` from the quiz state interface
3. Replace `quiz.names.map(n => ...)` answer button rendering with `q.options.map(name => ...)`
4. Remove the "usedOnOther" filtering logic since each question now has its own independent options
5. Simplify the button rendering to just show all options for the current question

The answer buttons for each question should simply iterate `q.options` and render a button for each, with selected state highlighting. No cross-question filtering needed.
</task>

## Verification

1. Run `npx next build` to verify no TypeScript errors
2. Read the modified API route and confirm:
   - No `names` field in response
   - Each question has `options` array with correct answer + up to 4 wrong answers
   - Options are shuffled
3. Read the modified play page and confirm:
   - Uses `q.options` not `quiz.names`
   - No cross-question name filtering logic remains
   - Selected answer highlighting still works

## must_haves
- [ ] Each question shows 4-5 randomized name choices including correct answer (GEN-03)
- [ ] Correct answer is always included in options
- [ ] Options are shuffled so correct answer position varies
- [ ] Play page renders per-question options (not global names list)
- [ ] With fewer than 5 total submissions, fewer options shown gracefully
- [ ] Answer selection and scoring still work correctly
