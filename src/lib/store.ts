// Persistent store using Vercel Blob for data + images
// Each quiz is stored as a JSON blob, keyed by quiz ID

import { put, list, del } from '@vercel/blob'

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

const QUIZ_PREFIX = 'quiz-data/'

// Valid state transitions
const VALID_TRANSITIONS: Record<Quiz['status'], Quiz['status'][]> = {
  draft: ['collecting'],
  collecting: ['closed'],
  closed: ['active'],
  active: ['closed'],
}

async function saveQuiz(quiz: Quiz): Promise<void> {
  await put(`${QUIZ_PREFIX}${quiz.id}.json`, JSON.stringify(quiz), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

async function loadQuiz(id: string): Promise<Quiz | null> {
  try {
    const { blobs } = await list({ prefix: `${QUIZ_PREFIX}${id}.json` })
    if (blobs.length === 0) return null
    // Add cache buster to avoid stale reads
    const url = new URL(blobs[0].url)
    url.searchParams.set('_t', Date.now().toString())
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json() as Quiz
  } catch {
    return null
  }
}

async function loadAllQuizzes(): Promise<Quiz[]> {
  try {
    const { blobs } = await list({ prefix: QUIZ_PREFIX })
    const quizzes: Quiz[] = []
    for (const blob of blobs) {
      try {
        const url = new URL(blob.url)
        url.searchParams.set('_t', Date.now().toString())
        const res = await fetch(url.toString(), { cache: 'no-store' })
        if (res.ok) quizzes.push(await res.json() as Quiz)
      } catch { /* skip broken entries */ }
    }
    return quizzes
  } catch {
    return []
  }
}

export const store = {
  async createQuiz(title: string, description: string | undefined, adminPin: string): Promise<Quiz> {
    const allQuizzes = await loadAllQuizzes()
    let code = genCode()
    while (allQuizzes.some(q => q.code === code)) code = genCode()
    const quiz: Quiz = {
      id: genId(),
      title,
      description,
      code,
      status: 'draft',
      adminPin,
      createdAt: new Date().toISOString(),
      questions: [],
      participants: [],
      submissions: [],
    }
    await saveQuiz(quiz)
    return quiz
  },

  async getQuiz(id: string): Promise<Quiz | null> {
    return loadQuiz(id)
  },

  async getQuizByCode(code: string): Promise<Quiz | null> {
    const all = await loadAllQuizzes()
    return all.find(q => q.code === code.toUpperCase()) || null
  },

  async updateQuizStatus(id: string, status: Quiz['status']): Promise<Quiz | null> {
    const quiz = await loadQuiz(id)
    if (!quiz) return null
    // Validate state transition
    const allowedTransitions = VALID_TRANSITIONS[quiz.status]
    if (!allowedTransitions.includes(status)) return null
    quiz.status = status
    await saveQuiz(quiz)
    return quiz
  },

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
  },

  async removeQuestion(quizId: string, questionId: string): Promise<boolean> {
    const quiz = await loadQuiz(quizId)
    if (!quiz) return false
    const idx = quiz.questions.findIndex(x => x.id === questionId)
    if (idx === -1) return false
    quiz.questions.splice(idx, 1)
    quiz.questions.forEach((x, i) => x.order = i)
    await saveQuiz(quiz)
    return true
  },

  async submitAnswers(quizId: string, name: string, guesses: Record<string, string>, timeTaken: number): Promise<Participant | null> {
    const quiz = await loadQuiz(quizId)
    if (!quiz) return null

    // If name already used, replace their previous submission (allow retakes)
    const existingIdx = quiz.participants.findIndex(p => p.name.toLowerCase() === name.toLowerCase())

    const answers: Answer[] = []
    let score = 0
    for (const question of quiz.questions) {
      const guess = guesses[question.id] || ''
      const correct = guess.toLowerCase().trim() === question.answer.toLowerCase().trim()
      if (correct) score++
      answers.push({ id: genId(), questionId: question.id, guess, correct })
    }
    const participant: Participant = {
      id: existingIdx >= 0 ? quiz.participants[existingIdx].id : genId(),
      name,
      score,
      total: quiz.questions.length,
      timeTaken,
      createdAt: new Date().toISOString(),
      answers,
    }

    if (existingIdx >= 0) {
      quiz.participants[existingIdx] = participant
    } else {
      quiz.participants.push(participant)
    }
    await saveQuiz(quiz)
    return participant
  },

  async getParticipant(quizId: string, participantId: string): Promise<Participant | null> {
    const quiz = await loadQuiz(quizId)
    return quiz?.participants.find(p => p.id === participantId) || null
  },

  async getLeaderboard(quizId: string): Promise<Participant[]> {
    const quiz = await loadQuiz(quizId)
    if (!quiz) return []
    return [...quiz.participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.timeTaken || 9999) - (b.timeTaken || 9999)
    })
  },

  async generateSubmissionToken(quizId: string, adminPin: string): Promise<string | null> {
    const quiz = await loadQuiz(quizId)
    if (!quiz) return null
    if (quiz.adminPin !== adminPin) return null
    const token = genId()
    quiz.submissionToken = token
    quiz.status = 'collecting'
    if (!quiz.submissions) quiz.submissions = []
    await saveQuiz(quiz)
    return token
  },

  async getQuizBySubmissionToken(token: string): Promise<Quiz | null> {
    const all = await loadAllQuizzes()
    return all.find(q => q.submissionToken === token) || null
  },

  async addSubmission(quizId: string, name: string, imageUrl: string): Promise<Submission | null> {
    const quiz = await loadQuiz(quizId)
    if (!quiz) return null
    const submission: Submission = {
      id: genId(),
      name,
      imageUrl,
      createdAt: new Date().toISOString(),
    }
    quiz.submissions.push(submission)
    await saveQuiz(quiz)
    return submission
  },

  async hasSubmissionName(quizId: string, name: string): Promise<boolean> {
    const quiz = await loadQuiz(quizId)
    if (!quiz) return false
    const normalizedName = name.trim().toLowerCase()
    return quiz.submissions.some(s => s.name.trim().toLowerCase() === normalizedName)
  },

  async closeSubmissions(quizId: string, adminPin: string): Promise<Quiz | null> {
    const quiz = await loadQuiz(quizId)
    if (!quiz) return null
    if (quiz.adminPin !== adminPin) return null
    if (quiz.status !== 'collecting') return null

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

    quiz.status = 'closed'
    await saveQuiz(quiz)
    return quiz
  },
}
