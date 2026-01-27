import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const quiz = await store.getQuizBySubmissionToken(token)

    if (!quiz) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (quiz.status !== 'collecting') {
      return NextResponse.json({ error: 'Submission period ended' }, { status: 410 })
    }

    return NextResponse.json({
      quizId: quiz.id,
      quizTitle: quiz.title,
      submissionCount: quiz.submissions.length,
    })
  } catch (err) {
    console.error('Get submission token error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
