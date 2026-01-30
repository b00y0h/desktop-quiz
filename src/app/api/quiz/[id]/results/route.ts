import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const quiz = await store.getQuiz(id)
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
    const leaderboard = await store.getLeaderboard(id)
    const totalParticipants = quiz.participants.length
    const avgScore = totalParticipants > 0
      ? quiz.participants.reduce((s, p) => s + p.score, 0) / totalParticipants
      : 0

    const questionStats = quiz.questions.map(q => {
      // Get all answers for this question with participant info
      const answersWithNames = quiz.participants.flatMap(p =>
        p.answers
          .filter(a => a.questionId === q.id)
          .map(a => ({
            participantId: p.id,
            participantName: p.name,
            guess: a.guess,
            correct: a.correct,
          }))
      )
      const correctCount = answersWithNames.filter(a => a.correct).length
      return {
        questionId: q.id,
        imageUrl: q.imageUrl,
        answer: q.answer,
        totalAnswers: answersWithNames.length,
        correctCount,
        correctPct: answersWithNames.length > 0 ? Math.round((correctCount / answersWithNames.length) * 100) : 0,
        // Individual answers for real-time tracking
        answers: answersWithNames,
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
        createdAt: p.createdAt,
      })),
      questionStats,
    })
  } catch (err) {
    console.error('Results error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
