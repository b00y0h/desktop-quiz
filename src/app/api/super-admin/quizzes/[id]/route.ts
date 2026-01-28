// src/app/api/super-admin/quizzes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { store } from '@/lib/store'
import { verifySuperAdminSession, isSuperAdminConfigured } from '@/lib/super-admin'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/super-admin/quizzes/[id]
 * Delete a quiz as super admin (bypasses quiz PIN).
 * Requires super admin session.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Delete quiz (bypasses quiz-specific PIN, super admin has master access)
    const deleted = await store.deleteQuizAsSuperAdmin(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Super admin delete quiz error:', err)
    return NextResponse.json(
      { error: 'Failed to delete quiz' },
      { status: 500 }
    )
  }
}
