'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface LeaderboardEntry {
  id: string
  name: string
  score: number
  total: number
  timeTaken?: number
}

interface LeaderboardData {
  title: string
  code: string
  leaderboard: LeaderboardEntry[]
}

export default function LeaderboardPage() {
  const params = useParams()
  const code = params.code as string
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        // First get quiz ID from code
        const quizRes = await fetch(`/api/quiz/code/${code}`)
        if (!quizRes.ok) {
          setError('Quiz not found')
          return
        }
        const quiz = await quizRes.json()

        // Then get results
        const resultsRes = await fetch(`/api/quiz/${quiz.id}/results`)
        if (!resultsRes.ok) {
          setError('Could not load leaderboard')
          return
        }
        const results = await resultsRes.json()
        setData({
          title: results.title,
          code: results.code,
          leaderboard: results.leaderboard.filter((p: LeaderboardEntry) => p.timeTaken != null),
        })
      } catch {
        setError('Failed to load leaderboard')
      }
    }

    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [code])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-red-400 text-lg">{error}</p>
          <Link href="/" className="text-primary-400 hover:text-primary-300 mt-4 inline-block">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center text-surface-400">Loading...</div>
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-2">{data.title}</h1>
        <p className="text-surface-400">Leaderboard</p>
      </div>

      {data.leaderboard.length === 0 ? (
        <p className="text-surface-400 text-center py-8">No one has completed the quiz yet!</p>
      ) : (
        <div className="space-y-3">
          {data.leaderboard.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                i === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                i === 1 ? 'bg-gray-400/10 border-gray-400/20' :
                i === 2 ? 'bg-amber-600/10 border-amber-600/20' :
                'bg-surface-900 border-surface-700'
              }`}
            >
              <span className="text-2xl w-10 text-center">{medals[i] || `#${i + 1}`}</span>
              <span className="flex-1 font-semibold text-lg">{p.name}</span>
              <span className="text-primary-400 font-bold text-lg">{p.score}/{p.total}</span>
              {p.timeTaken != null && (
                <span className="text-surface-400 text-sm">{p.timeTaken}s</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center space-y-4">
        <p className="text-surface-500 text-sm">Updates automatically every 5 seconds</p>
        <Link
          href={`/play/${code}`}
          className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition"
        >
          Take the Quiz
        </Link>
      </div>
    </div>
  )
}
