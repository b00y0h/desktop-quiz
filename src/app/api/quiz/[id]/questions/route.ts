import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { imageUrl, answer, pin } = await req.json()
    const quiz = await store.getQuiz(id)
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    if (pin !== quiz.adminPin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })
    if (!imageUrl || !answer) return NextResponse.json({ error: 'Image and answer required' }, { status: 400 })
    const question = await store.addQuestion(id, imageUrl, answer)
    if (!question) return NextResponse.json({ error: 'Failed to add question' }, { status: 500 })
    return NextResponse.json(question)
  } catch (err) {
    console.error('Add question error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { questionId, pin } = await req.json()
    const quiz = await store.getQuiz(id)
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (pin !== quiz.adminPin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })
    await store.removeQuestion(id, questionId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete question error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
