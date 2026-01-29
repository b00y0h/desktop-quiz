import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, questionId, guess } = await req.json()

    if (!name || !questionId || guess === undefined) {
      return NextResponse.json({ error: 'Name, questionId, and guess are required' }, { status: 400 })
    }

    const quiz = await store.getQuiz(id)
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }
    if (quiz.status !== 'active') {
      return NextResponse.json({ error: 'Quiz is not accepting answers' }, { status: 403 })
    }

    const result = await store.saveAnswer(id, name, questionId, guess)
    if (!result) {
      return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Save answer error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
