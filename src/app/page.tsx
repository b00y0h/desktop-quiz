'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface QuizSummary {
  id: string
  title: string
  code: string
  status: string
  questionCount: number
  submissionCount: number
  submissionToken?: string
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-surface-700 text-surface-300' },
  collecting: { label: 'Collecting', className: 'bg-yellow-500/20 text-yellow-400' },
  closed: { label: 'Closed', className: 'bg-blue-500/20 text-blue-400' },
  active: { label: 'Active', className: 'bg-green-500/20 text-green-400' },
}

export default function Home() {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    async function loadQuizzes() {
      try {
        const saved = JSON.parse(localStorage.getItem('my-quizzes') || '[]') as string[]
        if (saved.length === 0) {
          setLoading(false)
          return
        }
        const res = await fetch(`/api/quiz?ids=${saved.join(',')}`)
        if (res.ok) {
          const data = await res.json() as QuizSummary[]
          setQuizzes(data)
          // Clean up localStorage — remove IDs that no longer exist
          const validIds = data.map(q => q.id)
          const cleaned = saved.filter(id => validIds.includes(id))
          if (cleaned.length !== saved.length) {
            localStorage.setItem('my-quizzes', JSON.stringify(cleaned))
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    loadQuizzes()
  }, [])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDelete = async (quiz: QuizSummary) => {
    const pin = prompt(`Enter admin PIN to delete "${quiz.title}":`)
    if (!pin) return
    try {
      const res = await fetch(`/api/quiz/${quiz.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (res.ok) {
        setQuizzes(prev => prev.filter(q => q.id !== quiz.id))
        const saved = JSON.parse(localStorage.getItem('my-quizzes') || '[]') as string[]
        localStorage.setItem('my-quizzes', JSON.stringify(saved.filter(id => id !== quiz.id)))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete')
      }
    } catch {
      alert('Network error')
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center animate-fade-in w-full max-w-2xl">
        <div className="text-7xl mb-6">🖥️</div>
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
          Desktop Quiz
        </h1>
        <p className="text-surface-200 text-lg mb-8 max-w-md mx-auto">
          Can you guess whose desktop belongs to whom? Create a quiz or join one!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link
            href="/create"
            className="px-8 py-4 bg-primary-600 hover:bg-primary-500 rounded-xl text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-primary-600/25"
          >
            Create Quiz
          </Link>
          <Link
            href="/play"
            className="px-8 py-4 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl text-lg font-semibold transition-all hover:scale-105"
          >
            Join Quiz
          </Link>
        </div>

        {!loading && quizzes.length > 0 && (
          <div className="text-left">
            <h2 className="text-xl font-semibold text-surface-200 mb-4">Your Quizzes</h2>
            <div className="space-y-3">
              {quizzes.map(quiz => {
                const badge = STATUS_BADGES[quiz.status] || STATUS_BADGES.draft
                return (
                  <div key={quiz.id} className="bg-surface-800 border border-surface-700 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">{quiz.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-surface-400 text-sm">
                          Code: <span className="font-mono text-surface-300">{quiz.code}</span>
                          {' · '}
                          {quiz.submissionCount} submissions · {quiz.questionCount} questions
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link
                        href={`/admin/${quiz.id}`}
                        className="text-sm px-3 py-1.5 bg-primary-600/20 text-primary-400 hover:bg-primary-600/30 rounded-lg transition"
                      >
                        Admin
                      </Link>
                      <button
                        onClick={() => copyToClipboard(`${origin}/play?code=${quiz.code}`, `play-${quiz.id}`)}
                        className="text-sm px-3 py-1.5 bg-surface-700 text-surface-300 hover:bg-surface-600 rounded-lg transition"
                      >
                        {copied === `play-${quiz.id}` ? 'Copied!' : 'Copy Play Link'}
                      </button>
                      {quiz.submissionToken && (
                        <button
                          onClick={() => copyToClipboard(`${origin}/submit/${quiz.submissionToken}`, `submit-${quiz.id}`)}
                          className="text-sm px-3 py-1.5 bg-surface-700 text-surface-300 hover:bg-surface-600 rounded-lg transition"
                        >
                          {copied === `submit-${quiz.id}` ? 'Copied!' : 'Copy Submit Link'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(quiz)}
                        className="text-sm px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <p className="absolute bottom-6 text-surface-700 text-sm">
        Demo mode — data resets on redeploy
      </p>
    </div>
  )
}
