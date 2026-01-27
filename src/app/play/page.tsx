'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PlayPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch(`/api/quiz/code/${code.toUpperCase()}`)
    if (!res.ok) { setError('Quiz not found'); return }
    const data = await res.json()
    if (data.status !== 'active') { setError('This quiz is not active'); return }
    router.push(`/play/${code.toUpperCase()}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in text-center">
        <Link href="/" className="text-surface-400 hover:text-surface-200 text-sm">← Back</Link>
        <div className="text-6xl mt-6 mb-4">🎮</div>
        <h1 className="text-3xl font-bold mb-2">Join a Quiz</h1>
        <p className="text-surface-400 mb-8">Enter the 6-character quiz code</p>
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ABC123"
            maxLength={6}
            className="w-full px-4 py-4 bg-surface-900 border border-surface-700 rounded-xl text-center text-3xl tracking-[0.3em] font-mono focus:border-primary-500 focus:outline-none uppercase"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-xl text-lg font-semibold transition-all"
          >
            Join →
          </button>
        </form>
      </div>
    </div>
  )
}
