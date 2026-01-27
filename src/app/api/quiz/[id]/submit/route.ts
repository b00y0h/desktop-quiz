import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, guesses, timeTaken } = await req.json()
    if (!name || !guesses) return NextResponse.json({ error: 'Name and guesses required' }, { status: 400 })
    const quiz = await store.getQuiz(id)
    if (!quiz) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (quiz.status !== 'active') return NextResponse.json({ error: 'Quiz not active' }, { status: 400 })
    const participant = await store.submitAnswers(id, name, guesses, timeTaken || 0)
    if (!participant) return NextResponse.json({ error: 'Name already used in this quiz' }, { status: 409 })
    return NextResponse.json({ participantId: participant.id, score: participant.score, total: participant.total })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
