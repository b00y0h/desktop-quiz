import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quiz = store.getQuiz(id)
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
      imageData: q.imageData,
      order: q.order,
    })),
    names: quiz.questions.map(q => q.answer),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status, pin } = await req.json()
  const quiz = store.getQuiz(id)
  if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (pin !== quiz.adminPin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })
  if (status) store.updateQuizStatus(id, status)
  return NextResponse.json({ success: true })
}
