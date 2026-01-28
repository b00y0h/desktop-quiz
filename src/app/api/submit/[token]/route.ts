import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { put } from '@vercel/blob'
import { validateImageFile } from '@/lib/image-validation'

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

    const submittedCookie = req.cookies.get(`submitted-${quiz.id}`)
    const submittedId = submittedCookie?.value
    const alreadySubmitted = !!submittedId && quiz.submissions.some(s => s.id === submittedId)

    const body = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      submissionCount: quiz.submissions.length,
      names: quiz.submissions.map(s => s.name),
      alreadySubmitted,
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    // Clear stale cookie if submission was deleted by admin
    if (submittedId && !alreadySubmitted) {
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
      headers['Set-Cookie'] = `submitted-${quiz.id}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    }

    return new Response(JSON.stringify(body), { status: 200, headers })
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

    const submittedCookie = req.cookies.get(`submitted-${quiz.id}`)
    if (submittedCookie?.value) {
      return NextResponse.json({ error: 'You have already submitted' }, { status: 403 })
    }

    const formData = await req.formData()
    const name = formData.get('name') as string | null
    const file = formData.get('file') as File | null

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (name.trim().length > 50) {
      return NextResponse.json({ error: 'Name must be 50 characters or fewer' }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9 '.\\-]+$/.test(name.trim())) {
      return NextResponse.json({ error: 'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    const validationError = validateImageFile(file)
    if (validationError) {
      return NextResponse.json(validationError, { status: 400 })
    }

    const hasDuplicate = await store.hasSubmissionName(quiz.id, name.trim())
    if (hasDuplicate) {
      return NextResponse.json({ error: 'Name already taken' }, { status: 409 })
    }

    const blob = await put(`quiz-images/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type,
    })

    const submission = await store.addSubmission(quiz.id, name.trim(), blob.url)

    if (!submission) {
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    const cookieName = `submitted-${quiz.id}`
    const cookieValue = submission.id
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    const setCookie = `${cookieName}=${cookieValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`

    return new Response(JSON.stringify({
      success: true,
      submission: {
        id: submission.id,
        name: submission.name,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setCookie,
      },
    })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
