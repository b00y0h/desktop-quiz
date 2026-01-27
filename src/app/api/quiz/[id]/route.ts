import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const quiz = await store.getQuiz(id)
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const pin = req.nextUrl.searchParams.get('pin')
    const isAdmin = pin === quiz.adminPin
    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      code: quiz.code,
      status: quiz.status,
      questionCount: quiz.questions.length,
      questions: isAdmin ? quiz.questions : quiz.questions.map(q => ({
        id: q.id,
        imageUrl: q.imageUrl,
        order: q.order,
      })),
      names: quiz.questions.map(q => q.answer),
      submissionToken: isAdmin ? quiz.submissionToken : undefined,
      submissionCount: isAdmin ? quiz.submissions.length : undefined,
    })
  } catch (err) {
    console.error('Get quiz error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { status, pin, action } = await req.json()
    const quiz = await store.getQuiz(id)
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (pin !== quiz.adminPin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })

    if (action === 'generateSubmissionToken') {
      const token = await store.generateSubmissionToken(id, pin)
      if (!token) return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
      return NextResponse.json({ token, submissionUrl: `/submit/${token}` })
    }

    if (status) await store.updateQuizStatus(id, status)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update quiz error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
