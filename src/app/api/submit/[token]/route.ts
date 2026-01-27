import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { put } from '@vercel/blob'

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

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const quiz = await store.getQuizBySubmissionToken(token)

    if (!quiz) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (quiz.status !== 'collecting') {
      return NextResponse.json({ error: 'Submission period ended' }, { status: 410 })
    }

    const formData = await req.formData()
    const name = formData.get('name') as string | null
    const file = formData.get('file') as File | null

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    const blob = await put(`quiz-images/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type,
    })

    const submission = await store.addSubmission(quiz.id, name.trim(), blob.url)

    if (!submission) {
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        name: submission.name,
      },
    })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
