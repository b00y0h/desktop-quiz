import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const quiz = await store.getQuizByCode(code)
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Guard: Only allow access when quiz is active
    if (quiz.status === 'draft' || quiz.status === 'collecting') {
      return NextResponse.json(
        { error: 'Quiz is not yet available', status: quiz.status },
        { status: 403 }
      )
    }
    if (quiz.status === 'closed') {
      return NextResponse.json(
        { error: 'Quiz is not yet ready to play. Submissions are closed but quiz has not been published.', status: quiz.status },
        { status: 403 }
      )
    }

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      status: quiz.status,
      questionCount: quiz.questions.length,
      questions: quiz.questions.map(q => ({ id: q.id, imageUrl: q.imageUrl, order: q.order })),
      names: [...quiz.questions.map(q => q.answer)].sort(() => Math.random() - 0.5),
    })
  } catch (err) {
    console.error('Get quiz by code error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
