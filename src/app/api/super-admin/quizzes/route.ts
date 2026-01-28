import { NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { verifySuperAdminSession, isSuperAdminConfigured } from '@/lib/super-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/super-admin/quizzes
 * Returns all quizzes with stats. Requires super admin session.
 */
export async function GET() {
  try {
    // Check configuration
    if (!isSuperAdminConfigured()) {
      return NextResponse.json(
        { error: 'Super admin not configured' },
        { status: 503 }
      )
    }

    // Verify session
    const isAuthenticated = await verifySuperAdminSession()
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch all quizzes with stats
    const quizzes = await store.getAllQuizzesWithStats()

    const response = NextResponse.json({ quizzes })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response
  } catch (err) {
    console.error('Super admin quizzes error:', err)
    return NextResponse.json(
      { error: 'Failed to load quizzes' },
      { status: 500 }
    )
  }
}
