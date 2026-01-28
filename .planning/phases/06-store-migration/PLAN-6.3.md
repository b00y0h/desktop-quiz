---
wave: 3
depends_on: ["6.2"]
files_modified:
  - src/lib/store.ts
autonomous: true
---

# Plan 6.3: Participant Operations and Quiz Deletion

## Goal
Complete the store migration by rewriting participant-related methods and the quiz deletion method, then verify the complete store works end-to-end.

## Context
This plan completes the store migration with:
- Participant methods: `submitAnswers`, `getParticipant`, `getLeaderboard`
- Cleanup method: `deleteQuiz`

Key considerations:
- `submitAnswers` has complex logic for replacing existing submissions (allow retakes)
- `submitAnswers` needs to insert into both `participants` and `answers` tables
- `deleteQuiz` must delete images from Vercel Blob before deleting quiz data

## Tasks

<task id="6.3.1">
**Rewrite submitAnswers method**

Handle answer submission with retake support:

```typescript
async submitAnswers(quizId: string, name: string, guesses: Record<string, string>, timeTaken: number): Promise<Participant | null> {
  const quiz = await loadQuizWithRelations(quizId)
  if (!quiz) return null

  // Check if participant already exists (for retakes)
  const existingParticipant = await db.query.participants.findFirst({
    where: and(
      eq(participants.quizId, quizId),
      // Case-insensitive name match
    ),
  })

  // Find existing participant with case-insensitive name match
  const allParticipants = await db.query.participants.findMany({
    where: eq(participants.quizId, quizId),
  })
  const existing = allParticipants.find(
    p => p.name.toLowerCase() === name.toLowerCase()
  )

  // Calculate score
  const answerList: { id: string; questionId: string; guess: string; correct: boolean }[] = []
  let score = 0

  for (const question of quiz.questions) {
    const guess = guesses[question.id] || ''
    const correct = guess.toLowerCase().trim() === question.answer.toLowerCase().trim()
    if (correct) score++
    answerList.push({
      id: genId(),
      questionId: question.id,
      guess,
      correct,
    })
  }

  const now = new Date()
  let participantId: string

  if (existing) {
    // Update existing participant (retake)
    participantId = existing.id

    await db.update(participants)
      .set({
        score,
        total: quiz.questions.length,
        timeTaken,
        createdAt: now,
      })
      .where(eq(participants.id, participantId))

    // Delete old answers
    await db.delete(answers).where(eq(answers.participantId, participantId))
  } else {
    // Create new participant
    participantId = genId()

    await db.insert(participants).values({
      id: participantId,
      quizId,
      name,
      score,
      total: quiz.questions.length,
      timeTaken,
      createdAt: now,
    })
  }

  // Insert new answers
  for (const answer of answerList) {
    await db.insert(answers).values({
      id: answer.id,
      participantId,
      questionId: answer.questionId,
      guess: answer.guess,
      correct: answer.correct,
    })
  }

  return {
    id: participantId,
    name,
    score,
    total: quiz.questions.length,
    timeTaken,
    createdAt: now.toISOString(),
    answers: answerList,
  }
}
```
</task>

<task id="6.3.2">
**Rewrite getParticipant method**

Get a single participant with their answers:

```typescript
async getParticipant(quizId: string, participantId: string): Promise<Participant | null> {
  const participant = await db.query.participants.findFirst({
    where: and(
      eq(participants.id, participantId),
      eq(participants.quizId, quizId)
    ),
    with: {
      answers: true,
    },
  })

  if (!participant) return null

  return {
    id: participant.id,
    name: participant.name,
    score: participant.score,
    total: participant.total,
    timeTaken: participant.timeTaken ?? undefined,
    createdAt: participant.createdAt.toISOString(),
    answers: participant.answers.map(a => ({
      id: a.id,
      questionId: a.questionId,
      guess: a.guess,
      correct: a.correct,
    })),
  }
}
```
</task>

<task id="6.3.3">
**Rewrite getLeaderboard method**

Get sorted leaderboard for a quiz:

```typescript
async getLeaderboard(quizId: string): Promise<Participant[]> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  })
  if (!quiz) return []

  const participantList = await db.query.participants.findMany({
    where: eq(participants.quizId, quizId),
    with: {
      answers: true,
    },
  })

  // Map to interface type
  const mapped = participantList.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    total: p.total,
    timeTaken: p.timeTaken ?? undefined,
    createdAt: p.createdAt.toISOString(),
    answers: p.answers.map(a => ({
      id: a.id,
      questionId: a.questionId,
      guess: a.guess,
      correct: a.correct,
    })),
  }))

  // Sort by score (descending), then by timeTaken (ascending)
  return mapped.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return (a.timeTaken || 9999) - (b.timeTaken || 9999)
  })
}
```
</task>

<task id="6.3.4">
**Rewrite deleteQuiz method**

Delete quiz and all associated images from Blob:

```typescript
async deleteQuiz(quizId: string, adminPin: string): Promise<boolean> {
  const quiz = await loadQuizWithRelations(quizId)
  if (!quiz) return false
  if (quiz.adminPin !== adminPin) return false

  // Collect all image URLs to delete from Blob (STORE-03)
  const imageUrls: string[] = [
    ...quiz.questions.map(q => q.imageUrl),
    ...quiz.submissions.map(s => s.imageUrl),
  ]

  // Delete quiz from database (cascade deletes all related records)
  await db.delete(quizzes).where(eq(quizzes.id, quizId))

  // Delete all associated images from Vercel Blob
  for (const url of imageUrls) {
    try {
      await del(url)
    } catch {
      /* blob may already be gone */
    }
  }

  return true
}
```
</task>

<task id="6.3.5">
**Final cleanup and verification build**

1. Remove any remaining dead code from the old Blob implementation:
   - Remove `QUIZ_PREFIX` constant if still present
   - Remove `saveQuiz`, `loadQuiz`, `loadAllQuizzes` functions if still present

2. Verify the file structure is clean:
   - Imports at top
   - Helper functions (genId, genCode, mapQuizFromDb, loadQuizWithRelations)
   - VALID_TRANSITIONS constant
   - Interface definitions
   - store object with all methods

3. Run build to verify everything compiles:
   ```bash
   npm run build
   ```

4. Verify no TypeScript errors related to store.ts
</task>

## Verification

1. Run `npx next build` to verify TypeScript compiles without errors
2. Verify all participant methods are rewritten (`submitAnswers`, `getParticipant`, `getLeaderboard`)
3. Verify `deleteQuiz` deletes from Postgres and calls `del()` for Blob images
4. Verify no Blob-specific code remains for quiz data (only image deletion)
5. Verify the store interface is unchanged (same method signatures)

## must_haves
- [ ] submitAnswers inserts/updates participants and answers tables (STORE-01)
- [ ] submitAnswers preserves retake logic (replace existing participant by name) (STORE-02)
- [ ] getParticipant queries from Postgres with answers (STORE-01)
- [ ] getLeaderboard queries and sorts from Postgres (STORE-01)
- [ ] deleteQuiz deletes from Postgres AND calls del() for all Blob images (STORE-01, STORE-03)
- [ ] No Blob JSON code remains for quiz data storage (STORE-01)
- [ ] All store method signatures unchanged (STORE-02)
- [ ] Build succeeds with no TypeScript errors (STORE-02)
