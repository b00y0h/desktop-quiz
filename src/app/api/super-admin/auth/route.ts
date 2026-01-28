import { NextRequest, NextResponse } from 'next/server'
import {
  verifyMasterPin,
  verifySuperAdminSession,
  hashPin,
  SUPER_ADMIN_COOKIE,
  SESSION_COOKIE_OPTIONS,
  isSuperAdminConfigured,
} from '@/lib/super-admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/super-admin/auth
 * Authenticate with master PIN, sets session cookie on success.
 * Body: { pin: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Check if super admin is configured
    if (!isSuperAdminConfigured()) {
      return NextResponse.json(
        { error: 'Super admin not configured' },
        { status: 503 }
      )
    }

    const { pin } = await req.json()

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { error: 'PIN required' },
        { status: 400 }
      )
    }

    // Verify PIN matches env var
    if (!verifyMasterPin(pin)) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Create session response with cookie
    const response = NextResponse.json({ success: true })

    response.cookies.set(
      SUPER_ADMIN_COOKIE,
      hashPin(pin),
      SESSION_COOKIE_OPTIONS
    )

    return response
  } catch (err) {
    console.error('Super admin auth error:', err)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/super-admin/auth
 * Check if current session is authenticated.
 * Returns { authenticated: boolean }
 */
export async function GET() {
  try {
    if (!isSuperAdminConfigured()) {
      return NextResponse.json({ authenticated: false, configured: false })
    }

    const isAuthenticated = await verifySuperAdminSession()
    return NextResponse.json({ authenticated: isAuthenticated, configured: true })
  } catch (err) {
    console.error('Super admin session check error:', err)
    return NextResponse.json({ authenticated: false, configured: true })
  }
}

/**
 * DELETE /api/super-admin/auth
 * Logout - clear session cookie.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SUPER_ADMIN_COOKIE)
  return response
}
