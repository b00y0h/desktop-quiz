'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateQuiz() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || undefined, adminPin: pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Store pin in sessionStorage for admin access
      sessionStorage.setItem(`quiz-pin-${data.id}`, pin)
      router.push(`/admin/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        <Link href="/" className="text-surface-400 hover:text-surface-200 mb-8 inline-block">← Back</Link>
        <h1 className="text-3xl font-bold mb-2">Create a Quiz</h1>
        <p className="text-surface-400 mb-8">Set up your desktop guessing game</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-2">Quiz Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Team Desktop Challenge"
              required
              className="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-2">Admin PIN * (4 digits)</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              required
              maxLength={4}
              className="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition text-center text-2xl tracking-[0.5em] font-mono"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !title || pin.length !== 4}
            className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 rounded-xl text-lg font-semibold transition-all"
          >
            {loading ? 'Creating...' : 'Create Quiz →'}
          </button>
        </form>
      </div>
    </div>
  )
}
