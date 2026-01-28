---
wave: 2
depends_on: ["6.1"]
files_modified:
  - src/lib/store.ts
autonomous: true
---

# Plan 6.2: Question and Submission Management

## Goal
Rewrite the question and submission management methods in store.ts to use Drizzle/Postgres, maintaining the exact same interface for API route compatibility.

## Context
This plan continues the store migration by converting:
- Question methods: `addQuestion`, `removeQuestion`
- Submission methods: `addSubmission`, `hasSubmissionName`, `deleteSubmission`, `generateSubmissionToken`, `getQuizBySubmissionToken`, `closeSubmissions`

Key considerations:
- `deleteSubmission` must still delete images from Vercel Blob
- `closeSubmissions` generates questions from submissions (complex logic to preserve)
- `generateSubmissionToken` changes quiz status to 'collecting'

## Tasks

<task id="6.2.1">
**Rewrite addQuestion method**

Insert a new question into the questions table:

```typescript
async addQuestion(quizId: string, imageUrl: string, answer: string): Promise<Question | null> {
  // Verify quiz exists
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  })
  if (!quiz) return null

  // Get current max order
  const existingQuestions = await db.query.questions.findMany({
    where: eq(questions.quizId, quizId),
    orderBy: (q, { desc }) => [desc(q.order)],
    limit: 1,
  })
  const nextOrder = existingQuestions.length > 0 ? existingQuestions[0].order + 1 : 0

  const id = genId()
  await db.insert(questions).values({
    id,
    quizId,
    imageUrl,
    answer,
    order: nextOrder,
  })

  return {
    id,
    imageUrl,
    answer,
    order: nextOrder,
  }
}
```
</task>

<task id="6.2.2">
**Rewrite removeQuestion method**

Delete question and reorder remaining questions:

```typescript
async removeQuestion(quizId: string, questionId: string): Promise<boolean> {
  // Verify quiz and question exist
  const question = await db.query.questions.findFirst({
    where: and(
      eq(questions.id, questionId),
      eq(questions.quizId, quizId)
    ),
  })
  if (!question) return false

  // Delete the question (cascade will handle related answers)
  await db.delete(questions).where(eq(questions.id, questionId))

  // Reorder remaining questions
  const remainingQuestions = await db.query.questions.findMany({
    where: eq(questions.quizId, quizId),
    orderBy: (q, { asc }) => [asc(q.order)],
  })

  for (let i = 0; i < remainingQuestions.length; i++) {
    if (remainingQuestions[i].order !== i) {
      await db.update(questions)
        .set({ order: i })
        .where(eq(questions.id, remainingQuestions[i].id))
    }
  }

  return true
}
```
</task>

<task id="6.2.3">
**Rewrite generateSubmissionToken method**

Generate token and update quiz status:

```typescript
async generateSubmissionToken(quizId: string, adminPin: string): Promise<string | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  })
  if (!quiz) return null
  if (quiz.adminPin !== adminPin) return null

  // Token format: {quizId}:{randomPart} - allows direct lookup without scan
  const randomPart = genId()
  const token = `${quizId}:${randomPart}`

  await db.update(quizzes)
    .set({
      submissionToken: token,
      status: 'collecting',
    })
    .where(eq(quizzes.id, quizId))

  return token
}
```
</task>

<task id="6.2.4">
**Rewrite getQuizBySubmissionToken method**

Find quiz by submission token:

```typescript
async getQuizBySubmissionToken(token: string): Promise<Quiz | null> {
  // Token format: {quizId}:{randomPart}
  // Direct lookup by quiz ID for efficiency
  const colonIndex = token.indexOf(':')
  if (colonIndex > 0) {
    const quizId = token.substring(0, colonIndex)
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    })
    if (quiz && quiz.submissionToken === token) {
      return loadQuizWithRelations(quizId)
    }
    return null
  }

  // Fallback for legacy tokens without quiz ID prefix
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.submissionToken, token),
  })
  if (!quiz) return null
  return loadQuizWithRelations(quiz.id)
}
```
</task>

<task id="6.2.5">
**Rewrite addSubmission method**

Insert a new submission:

```typescript
async addSubmission(quizId: string, name: string, imageUrl: string): Promise<Submission | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  })
  if (!quiz) return null

  const id = genId()
  const now = new Date()

  await db.insert(submissions).values({
    id,
    quizId,
    name,
    imageUrl,
    createdAt: now,
  })

  return {
    id,
    name,
    imageUrl,
    createdAt: now.toISOString(),
  }
}
```
</task>

<task id="6.2.6">
**Rewrite hasSubmissionName method**

Check if a name already exists for a quiz's submissions:

```typescript
async hasSubmissionName(quizId: string, name: string): Promise<boolean> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  })
  if (!quiz) return false

  const normalizedName = name.trim().toLowerCase()
  const existingSubmissions = await db.query.submissions.findMany({
    where: eq(submissions.quizId, quizId),
  })

  return existingSubmissions.some(
    s => s.name.trim().toLowerCase() === normalizedName
  )
}
```
</task>

<task id="6.2.7">
**Rewrite deleteSubmission method**

Delete submission from Postgres and image from Blob:

```typescript
async deleteSubmission(quizId: string, submissionId: string, adminPin: string): Promise<boolean> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  })
  if (!quiz) return false
  if (quiz.adminPin !== adminPin) return false
  if (quiz.status !== 'collecting') return false

  const submission = await db.query.submissions.findFirst({
    where: and(
      eq(submissions.id, submissionId),
      eq(submissions.quizId, quizId)
    ),
  })
  if (!submission) return false

  // Delete from database
  await db.delete(submissions).where(eq(submissions.id, submissionId))

  // Delete image from Vercel Blob (STORE-03: images stay on Blob)
  try {
    await del(submission.imageUrl)
  } catch {
    /* blob may already be gone */
  }

  return true
}
```
</task>

<task id="6.2.8">
**Rewrite closeSubmissions method**

Close submissions and generate questions from them:

```typescript
async closeSubmissions(quizId: string, adminPin: string, preloadedQuiz?: Quiz): Promise<Quiz | null> {
  // Use preloaded quiz or fetch fresh
  let quiz: Quiz | null
  if (preloadedQuiz) {
    quiz = preloadedQuiz
  } else {
    quiz = await loadQuizWithRelations(quizId)
  }
  if (!quiz) return null
  if (quiz.adminPin !== adminPin) return null

  // Accept both 'collecting' and 'draft' - for consistency with original
  if (quiz.status !== 'collecting' && quiz.status !== 'draft') return null

  // Generate questions from submissions (skip those already converted)
  const existingImageUrls = new Set(quiz.questions.map(q => q.imageUrl))
  const newSubmissions = quiz.submissions.filter(s => !existingImageUrls.has(s.imageUrl))

  if (newSubmissions.length > 0) {
    const startOrder = quiz.questions.length
    const newQuestions = newSubmissions.map((submission, index) => ({
      id: genId(),
      quizId,
      imageUrl: submission.imageUrl,
      answer: submission.name,
      order: startOrder + index,
    }))

    // Insert all new questions
    for (const q of newQuestions) {
      await db.insert(questions).values(q)
    }
  }

  // Update status to closed
  await db.update(quizzes)
    .set({ status: 'closed' })
    .where(eq(quizzes.id, quizId))

  // Return updated quiz
  return loadQuizWithRelations(quizId)
}
```
</task>

## Verification

1. Run `npx next build` to verify TypeScript compiles without errors
2. Verify all question methods (`addQuestion`, `removeQuestion`) are rewritten
3. Verify all submission methods are rewritten
4. Verify `deleteSubmission` still calls `del()` from Vercel Blob for images
5. Verify `closeSubmissions` preserves the question generation logic

## must_haves
- [ ] addQuestion inserts to questions table (STORE-01)
- [ ] removeQuestion deletes from questions table and reorders (STORE-01)
- [ ] generateSubmissionToken updates quiz with token and status (STORE-01)
- [ ] getQuizBySubmissionToken finds quiz from Postgres (STORE-01)
- [ ] addSubmission inserts to submissions table (STORE-01)
- [ ] hasSubmissionName queries submissions table (STORE-01)
- [ ] deleteSubmission deletes from Postgres AND calls del() for Blob image (STORE-01, STORE-03)
- [ ] closeSubmissions generates questions from submissions (STORE-01, STORE-02)
