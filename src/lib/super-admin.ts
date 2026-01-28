import { cookies } from 'next/headers'

export const SUPER_ADMIN_COOKIE = 'super-admin-session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours

/**
 * Verify the SUPER_ADMIN_PIN environment variable is set.
 * Returns false if not configured (disables super admin feature).
 */
export function isSuperAdminConfigured(): boolean {
  return !!process.env.SUPER_ADMIN_PIN && process.env.SUPER_ADMIN_PIN.length >= 4
}

/**
 * Verify PIN matches the master PIN from env var.
 */
export function verifyMasterPin(pin: string): boolean {
  if (!isSuperAdminConfigured()) return false
  return pin === process.env.SUPER_ADMIN_PIN
}

/**
 * Get the session token from cookies (for API routes).
 * Returns null if no valid session.
 */
export async function getSuperAdminSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get(SUPER_ADMIN_COOKIE)
  return session?.value ?? null
}

/**
 * Verify the current request has valid super admin session.
 * Checks cookie value matches expected session token.
 */
export async function verifySuperAdminSession(): Promise<boolean> {
  if (!isSuperAdminConfigured()) return false
  const session = await getSuperAdminSession()
  if (!session) return false
  // Session token is a hash of the PIN - verify it matches
  return session === hashPin(process.env.SUPER_ADMIN_PIN!)
}

/**
 * Generate session token from PIN (simple hash for cookie value).
 */
export function hashPin(pin: string): string {
  // Simple hash - not crypto-secure but sufficient for session token
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `sa-${Math.abs(hash).toString(36)}`
}

/**
 * Cookie options for setting super admin session.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_MAX_AGE,
  path: '/',
}
