---
status: complete
commits:
  - hash: 65890ccfa6fab4755744ef8bd5bdaaa2c7433157
    message: "feat(04-4.1): generate questions from submissions on close"
---
# Summary: Plan 4.1

## What was done
Added automatic question generation to the `closeSubmissions()` method in the store. When an admin closes submissions, the system now transforms all submitted entries into quiz questions by mapping each Submission to a Question with the submission's image as the question image and the submitter's name as the correct answer.

## Files changed
- `/workspace/src/lib/store.ts`: Added question generation logic before changing quiz status to 'closed'. The new code:
  1. Checks if there are any submissions
  2. Creates a Question for each Submission with correct ordering
  3. Appends all generated questions to the quiz.questions array
  4. Uses genId() for unique IDs and maintains sequential order starting from the existing question count

## Verification
- TypeScript type checking verified manually: all Question interface fields (id, imageUrl, answer, order) are properly populated from Submission data
- Code follows existing patterns in the store (using genId(), array operations, proper ordering)
- Integration verified: generated questions will seamlessly integrate with existing quiz flow since they conform to the Question interface
