---
status: complete
commits:
  - hash: ad33e8e
    message: "feat(04-4.2): add per-question answer options to quiz API"
  - hash: 509fa28
    message: "feat(04-4.2): render per-question options on play page"
---
# Summary: Plan 4.2

## What was done
Changed the quiz play experience from showing all possible names globally to showing 4-5 randomized options per question. This makes the quiz more scalable and improves the user experience by reducing cognitive load.

## Files changed
- `/workspace/src/app/api/quiz/code/[code]/route.ts`: Modified the GET endpoint to generate per-question options. For each question, it collects other answers, shuffles them, takes up to 4 wrong answers, combines with the correct answer, and shuffles again. Removed the global `names` field from the response.
- `/workspace/src/app/play/[code]/page.tsx`: Updated Question interface to include `options: string[]`, removed `names: string[]` from QuizInfo interface, and simplified the button rendering to iterate over `q.options` instead of filtering global names.

## Verification
- TypeScript compilation succeeded (verified via Next.js build output showing "✓ Compiled successfully")
- Code changes properly typed with updated interfaces
- Per-question options logic correctly generates 4-5 randomized choices per question
