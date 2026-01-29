// Persistent store using Vercel Postgres for data + Vercel Blob for images
// Migrated from Blob JSON storage to Drizzle ORM/Postgres

import { del } from '@vercel/blob'
import { db, quizzes, questions, participants, answers, submissions } from './db'
import { eq } from 'drizzle-orm'

export interface Quiz {
  id: string
  title: string
  description?: string
  code: string
  status: 'draft' | 'collecting' | 'active' | 'closed'
  adminPin: string
  createdAt: string
  questions: Question[]
  participants: Participant[]
  submissionToken?: string
  submissions: Submission[]
}

export interface Question {
  id: string
  imageUrl: string
  answer: string
  order: number
}

export interface Participant {
  id: string
  name: string
  score: number
  total: number
  timeTaken?: number
  createdAt: string
  answers: Answer[]
}

export interface Answer {
  id: string
  questionId: string
  guess: string
  correct: boolean
}

export interface Submission {
  id: string
  name: string
  imageUrl: string
  createdAt: string
}

function genId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// Valid state transitions
const VALID_TRANSITIONS: Record<Quiz['status'], Quiz['status'][]> = {
  draft: ['collecting'],
  collecting: ['closed'],
  closed: ['active', 'collecting'],
  active: ['closed'],
}

// Convert database quiz record to interface Quiz with nested data
function mapQuizFromDb(
  quiz: typeof quizzes.$inferSelect,
  questionList: (typeof questions.$inferSelect)[],
  participantList: (typeof participants.$inferSelect & { answers: (typeof answers.$inferSelect)[] })[],
  submissionList: (typeof submissions.$inferSelect)[]
): Quiz {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description ?? undefined,
    code: quiz.code,
    status: quiz.status,
    adminPin: quiz.adminPin,
    createdAt: quiz.createdAt.toISOString(),
    submissionToken: quiz.submissionToken ?? undefined,
    questions: questionList.map(q => ({
      id: q.id,
      imageUrl: q.imageUrl,
      answer: q.answer,
      order: q.order,
    })),
    participants: participantList.map(p => ({
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
    })),
    submissions: submissionList.map(s => ({
      id: s.id,
      name: s.name,
      imageUrl: s.imageUrl,
      createdAt: s.createdAt.toISOString(),
    })),
  }
}

// Load quiz with all nested relations from Postgres
async function loadQuizWithRelations(quizId: string): Promise<Quiz | null> {
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
    with: {
      questions: {
        orderBy: (q, { asc }) => [asc(q.order)],
      },
      participants: {
        with: {
          answers: true,
        },
      },
      submissions: {
        orderBy: (s, { asc }) => [asc(s.createdAt)],
      },
    },
  })

  if (!quiz) return null

  return mapQuizFromDb(
    quiz,
    quiz.questions,
    quiz.participants.map(p => ({ ...p, answers: p.answers })),
    quiz.submissions
  )
}

export const store = {
  async createQuiz(title: string, description: string | undefined, adminPin: string): Promise<Quiz> {
    // Generate unique code
    let code = genCode()
    let existingQuiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.code, code),
    })
    while (existingQuiz) {
      code = genCode()
      existingQuiz = await db.query.quizzes.findFirst({
        where: eq(quizzes.code, code),
      })
    }

    const id = genId()
    const now = new Date()

    await db.insert(quizzes).values({
      id,
      title,
      description: description ?? null,
      code,
      status: 'draft',
      adminPin,
      createdAt: now,
    })

    // Return the full Quiz object with empty arrays
    return {
      id,
      title,
      description,
      code,
      status: 'draft',
      adminPin,
      createdAt: now.toISOString(),
      questions: [],
      participants: [],
      submissions: [],
    }
  },

  async getQuiz(id: string): Promise<Quiz | null> {
    return loadQuizWithRelations(id)
  },

  async getQuizByCode(code: string): Promise<Quiz | null> {
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.code, code.toUpperCase()),
    })
    if (!quiz) return null
    return loadQuizWithRelations(quiz.id)
  },

  async updateQuizStatus(id: string, status: Quiz['status']): Promise<Quiz | null> {
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, id),
    })
    if (!quiz) return null

    // Validate state transition
    const allowedTransitions = VALID_TRANSITIONS[quiz.status]
    if (!allowedTransitions.includes(status)) return null

    await db.update(quizzes)
      .set({ status })
      .where(eq(quizzes.id, id))

    return loadQuizWithRelations(id)
  },

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
  },

  async removeQuestion(quizId: string, questionId: string): Promise<boolean> {
    // Verify quiz and question exist
    const question = await db.query.questions.findFirst({
      where: eq(questions.id, questionId),
    })
    if (!question || question.quizId !== quizId) return false

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
  },

  async submitAnswers(quizId: string, name: string, guesses: Record<string, string>, timeTaken: number): Promise<Participant | null> {
    const quiz = await loadQuizWithRelations(quizId)
    if (!quiz) return null

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
  },

  async getParticipant(quizId: string, participantId: string): Promise<Participant | null> {
    const participant = await db.query.participants.findFirst({
      where: eq(participants.id, participantId),
      with: {
        answers: true,
      },
    })

    if (!participant || participant.quizId !== quizId) return null

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
  },

  async saveAnswer(
    quizId: string,
    name: string,
    questionId: string,
    guess: string
  ): Promise<{ participantId: string; correct: boolean } | null> {
    // Verify quiz exists and is active
    const quiz = await loadQuizWithRelations(quizId)
    if (!quiz || quiz.status !== 'active') return null

    // Find the question to check correctness
    const question = quiz.questions.find(q => q.id === questionId)
    if (!question) return null

    const correct = guess.toLowerCase().trim() === question.answer.toLowerCase().trim()

    // Find or create participant (case-insensitive name match)
    const allParticipants = await db.query.participants.findMany({
      where: eq(participants.quizId, quizId),
    })
    let participant = allParticipants.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    )

    const now = new Date()
    let participantId: string

    if (participant) {
      participantId = participant.id
    } else {
      // Create new participant with initial values
      participantId = genId()
      await db.insert(participants).values({
        id: participantId,
        quizId,
        name,
        score: 0,
        total: quiz.questions.length,
        createdAt: now,
      })
    }

    // Check if answer already exists for this question
    const existingAnswers = await db.query.answers.findMany({
      where: eq(answers.participantId, participantId),
    })
    const existingAnswer = existingAnswers.find(a => a.questionId === questionId)

    if (existingAnswer) {
      // Update existing answer
      await db.update(answers)
        .set({ guess, correct })
        .where(eq(answers.id, existingAnswer.id))
    } else {
      // Create new answer
      await db.insert(answers).values({
        id: genId(),
        participantId,
        questionId,
        guess,
        correct,
      })
    }

    // Recalculate and update score
    const allAnswers = await db.query.answers.findMany({
      where: eq(answers.participantId, participantId),
    })
    const newScore = allAnswers.filter(a => a.correct).length

    await db.update(participants)
      .set({ score: newScore })
      .where(eq(participants.id, participantId))

    return { participantId, correct }
  },

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
  },

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
  },

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
  },

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
  },

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
  },

  async deleteSubmission(quizId: string, submissionId: string, adminPin: string): Promise<boolean> {
    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId),
    })
    if (!quiz) return false
    if (quiz.adminPin !== adminPin) return false
    if (quiz.status !== 'collecting') return false

    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
    })
    if (!submission || submission.quizId !== quizId) return false

    // Delete from database
    await db.delete(submissions).where(eq(submissions.id, submissionId))

    // Delete image from Vercel Blob (STORE-03: images stay on Blob)
    try {
      await del(submission.imageUrl)
    } catch {
      /* blob may already be gone */
    }

    return true
  },

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
  },

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
  },

  async deleteQuizAsSuperAdmin(quizId: string): Promise<boolean> {
    const quiz = await loadQuizWithRelations(quizId)
    if (!quiz) return false

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
  },

  async getAllQuizzesWithStats(): Promise<{
    id: string
    title: string
    code: string
    status: Quiz['status']
    createdAt: string
    submissionCount: number
    participantCount: number
  }[]> {
    // Fetch all quizzes with counts using subqueries for efficiency
    const allQuizzes = await db.query.quizzes.findMany({
      orderBy: (q, { desc }) => [desc(q.createdAt)],
    })

    // Get counts for each quiz
    const results = await Promise.all(
      allQuizzes.map(async (quiz) => {
        const [submissionList, participantList] = await Promise.all([
          db.query.submissions.findMany({
            where: eq(submissions.quizId, quiz.id),
            columns: { id: true },
          }),
          db.query.participants.findMany({
            where: eq(participants.quizId, quiz.id),
            columns: { id: true },
          }),
        ])

        return {
          id: quiz.id,
          title: quiz.title,
          code: quiz.code,
          status: quiz.status,
          createdAt: quiz.createdAt.toISOString(),
          submissionCount: submissionList.length,
          participantCount: participantList.length,
        }
      })
    )

    return results
  },
}
