import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const name = req.nextUrl.searchParams.get('name')

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const completed = await store.hasCompletedQuiz(id, name)
    return NextResponse.json({ completed })
  } catch (err) {
    console.error('Check completion error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
