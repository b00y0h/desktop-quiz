import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function POST(req: NextRequest) {
  const { title, description, adminPin } = await req.json()
  if (!title || !adminPin || adminPin.length !== 4) {
    return NextResponse.json({ error: 'Title and 4-digit PIN required' }, { status: 400 })
  }
  const quiz = store.createQuiz(title, description, adminPin)
  return NextResponse.json({ id: quiz.id, code: quiz.code })
}
