'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const res = await fetch('/api/super-admin/auth')
      const data = await res.json()
      if (!data.configured) {
        setError('Super admin not configured. Set SUPER_ADMIN_PIN environment variable.')
        setAuthenticated(false)
        return
      }
      setAuthenticated(data.authenticated)
    } catch {
      setAuthenticated(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (res.ok) {
        setAuthenticated(true)
        setPin('')
      } else {
        const data = await res.json()
        setError(data.error || 'Authentication failed')
      }
    } catch {
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/super-admin/auth', { method: 'DELETE' })
    setAuthenticated(false)
    router.push('/')
  }

  // Loading state
  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-surface-400">Loading...</div>
      </div>
    )
  }

  // Login form
  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <h1 className="text-2xl font-bold mb-2 text-center">Super Admin</h1>
          <p className="text-surface-400 text-center mb-6">Enter master PIN to access</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Master PIN"
              className="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-center text-2xl tracking-[0.3em] font-mono focus:border-primary-500 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition"
            >
              {loading ? 'Authenticating...' : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Authenticated - render children with header
  return (
    <div className="min-h-screen">
      <header className="border-b border-surface-800 bg-surface-900/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold">Super Admin</span>
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
              Admin
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-surface-400 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
