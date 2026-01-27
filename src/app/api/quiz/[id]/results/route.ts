import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quiz = store.getQuiz(id)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  
  const leaderboard = store.getLeaderboard(id)
  const totalParticipants = quiz.participants.length
  const avgScore = totalParticipants > 0
    ? quiz.participants.reduce((s, p) => s + p.score, 0) / totalParticipants
    : 0

  // Per-question stats
  const questionStats = quiz.questions.map(q => {
    const answers = quiz.participants.flatMap(p => p.answers.filter(a => a.questionId === q.id))
    const correctCount = answers.filter(a => a.correct).length
    return {
      questionId: q.id,
      answer: q.answer,
      totalAnswers: answers.length,
      correctCount,
      correctPct: answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0,
    }
  })

  return NextResponse.json({
    title: quiz.title,
    code: quiz.code,
    status: quiz.status,
    totalParticipants,
    avgScore: Math.round(avgScore * 10) / 10,
    totalQuestions: quiz.questions.length,
    leaderboard: leaderboard.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      total: p.total,
      timeTaken: p.timeTaken,
    })),
    questionStats,
  })
}
