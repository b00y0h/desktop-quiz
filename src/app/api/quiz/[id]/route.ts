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
    const response = NextResponse.json({
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
      submissions: isAdmin ? quiz.submissions : undefined,
    })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (err) {
    console.error('Get quiz error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { status, pin, action, submissionId } = await req.json()
    const quiz = await store.getQuiz(id)
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (pin !== quiz.adminPin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })

    if (action === 'generateSubmissionToken') {
      const token = await store.generateSubmissionToken(id, pin)
      if (!token) return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
      return NextResponse.json({ token, submissionUrl: `/submit/${token}` })
    }

    if (action === 'deleteSubmission') {
      if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })
      const deleted = await store.deleteSubmission(id, submissionId, pin)
      if (!deleted) return NextResponse.json({ error: 'Submission not found or quiz not collecting' }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'closeSubmissions') {
      const result = await store.closeSubmissions(id, pin)
      if (!result) return NextResponse.json({ error: 'Quiz not in collecting state or invalid PIN' }, { status: 400 })
      return NextResponse.json({ success: true, status: 'closed' })
    }

    if (status) {
      const result = await store.updateQuizStatus(id, status)
      if (!result) return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update quiz error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { pin } = await req.json()
    const deleted = await store.deleteQuiz(id, pin)
    if (!deleted) return NextResponse.json({ error: 'Not found or invalid PIN' }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete quiz error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
