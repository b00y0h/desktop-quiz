import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

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
