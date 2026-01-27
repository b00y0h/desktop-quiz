// In-memory store — data resets on serverless cold start
// For production, swap to a real database

export interface Quiz {
  id: string
  title: string
  description?: string
  code: string
  status: 'draft' | 'active' | 'closed'
  adminPin: string
  createdAt: string
  questions: Question[]
  participants: Participant[]
}

export interface Question {
  id: string
  imageData: string // base64 data URL or blob URL
  imageUrl?: string // Vercel Blob URL (preferred)
  answer: string    // correct person's name
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

function genId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// Global store survives across API calls in the same serverless instance
const globalStore = globalThis as unknown as { __quizStore?: Map<string, Quiz> }
if (!globalStore.__quizStore) {
  globalStore.__quizStore = new Map<string, Quiz>()
}
const quizzes = globalStore.__quizStore

export const store = {
  createQuiz(title: string, description: string | undefined, adminPin: string): Quiz {
    let code = genCode()
    while (Array.from(quizzes.values()).some(q => q.code === code)) code = genCode()
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
    }
    quizzes.set(quiz.id, quiz)
    return quiz
  },

  getQuiz(id: string): Quiz | undefined {
    return quizzes.get(id)
  },

  getQuizByCode(code: string): Quiz | undefined {
    return Array.from(quizzes.values()).find(q => q.code === code.toUpperCase())
  },

  updateQuizStatus(id: string, status: Quiz['status']): Quiz | undefined {
    const q = quizzes.get(id)
    if (q) q.status = status
    return q
  },

  addQuestion(quizId: string, imageData: string, answer: string, imageUrl?: string): Question | undefined {
    const q = quizzes.get(quizId)
    if (!q) return undefined
    const question: Question = {
      id: genId(),
      imageData: imageUrl || imageData,
      imageUrl,
      answer,
      order: q.questions.length,
    }
    q.questions.push(question)
    return question
  },

  removeQuestion(quizId: string, questionId: string): boolean {
    const q = quizzes.get(quizId)
    if (!q) return false
    const idx = q.questions.findIndex(x => x.id === questionId)
    if (idx === -1) return false
    q.questions.splice(idx, 1)
    q.questions.forEach((x, i) => x.order = i)
    return true
  },

  updateQuestion(quizId: string, questionId: string, answer: string): boolean {
    const q = quizzes.get(quizId)
    if (!q) return false
    const question = q.questions.find(x => x.id === questionId)
    if (!question) return false
    question.answer = answer
    return true
  },

  submitAnswers(quizId: string, name: string, guesses: Record<string, string>, timeTaken: number): Participant | undefined {
    const q = quizzes.get(quizId)
    if (!q) return undefined
    // Check if already submitted
    if (q.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) return undefined
    
    const answers: Answer[] = []
    let score = 0
    for (const question of q.questions) {
      const guess = guesses[question.id] || ''
      const correct = guess.toLowerCase().trim() === question.answer.toLowerCase().trim()
      if (correct) score++
      answers.push({ id: genId(), questionId: question.id, guess, correct })
    }
    const participant: Participant = {
      id: genId(),
      name,
      score,
      total: q.questions.length,
      timeTaken,
      createdAt: new Date().toISOString(),
      answers,
    }
    q.participants.push(participant)
    return participant
  },

  getParticipant(quizId: string, participantId: string): Participant | undefined {
    const q = quizzes.get(quizId)
    return q?.participants.find(p => p.id === participantId)
  },

  getLeaderboard(quizId: string): Participant[] {
    const q = quizzes.get(quizId)
    if (!q) return []
    return [...q.participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return (a.timeTaken || 9999) - (b.timeTaken || 9999)
    })
  },
}
