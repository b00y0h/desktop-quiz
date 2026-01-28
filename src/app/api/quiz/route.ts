import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const ids = req.nextUrl.searchParams.get('ids')
    if (!ids) {
      return NextResponse.json({ error: 'ids parameter required' }, { status: 400 })
    }
    const idList = ids.split(',').filter(Boolean)
    const quizzes = await Promise.all(
      idList.map(async (id) => {
        const quiz = await store.getQuiz(id)
        if (!quiz) return null
        return {
          id: quiz.id,
          title: quiz.title,
          code: quiz.code,
          status: quiz.status,
          questionCount: quiz.questions.length,
          submissionCount: quiz.submissions.length,
          submissionToken: quiz.submissionToken,
        }
      })
    )
    return NextResponse.json(quizzes.filter(Boolean))
  } catch (err) {
    console.error('Get quizzes error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, description, adminPin } = await req.json()
    if (!title || !adminPin || adminPin.length !== 4) {
      return NextResponse.json({ error: 'Title and 4-digit PIN required' }, { status: 400 })
    }
    const quiz = await store.createQuiz(title, description, adminPin)
    return NextResponse.json({ id: quiz.id, code: quiz.code })
  } catch (err) {
    console.error('Create quiz error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
