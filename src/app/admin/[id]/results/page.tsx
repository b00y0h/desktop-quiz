'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface LeaderboardEntry { id: string; name: string; score: number; total: number; answered: number; timeTaken?: number; createdAt: string }
interface AnswerDetail { participantId: string; participantName: string; guess: string; correct: boolean }
interface QuestionStat {
  questionId: string; imageUrl: string; answer: string; totalAnswers: number
  correctCount: number; correctPct: number; answers: AnswerDetail[]
}
interface ResultsData {
  title: string; code: string; status: string; totalParticipants: number
  avgScore: number; totalQuestions: number; leaderboard: LeaderboardEntry[]; questionStats: QuestionStat[]
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`
  return `${diffDays}d ago`
}

export default function ResultsPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<ResultsData | null>(null)
  const [expandedQ, setExpandedQ] = useState<string | null>(null)

  useEffect(() => {
    const load = () => fetch(`/api/quiz/${id}/results`).then(r => r.json()).then(setData)
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [id])

  if (!data) return <div className="min-h-screen flex items-center justify-center text-surface-400">Loading...</div>

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto animate-fade-in">
      <Link href={`/admin/${id}`} className="text-surface-400 hover:text-surface-200 text-sm">← Back to Editor</Link>
      <h1 className="text-3xl font-bold mt-4 mb-2">{data.title} — Results</h1>
      <p className="text-surface-400 mb-8">Code: {data.code} · {data.status}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Players', value: data.totalParticipants, icon: '👥' },
          { label: 'Avg Score', value: `${data.avgScore}/${data.totalQuestions}`, icon: '📊' },
          { label: 'Questions', value: data.totalQuestions, icon: '❓' },
        ].map(s => (
          <div key={s.label} className="p-5 bg-surface-900 rounded-xl border border-surface-700 text-center">
            <div className="text-3xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-surface-400 text-sm">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <h2 className="text-xl font-bold mb-4">🏆 Leaderboard</h2>
      {data.leaderboard.length === 0 ? (
        <p className="text-surface-400 text-center py-8">No participants yet. Share the quiz code!</p>
      ) : (
        <div className="space-y-2 mb-10">
          {data.leaderboard.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl border transition ${
              p.timeTaken == null ? 'bg-yellow-500/5 border-yellow-500/20' :
              i === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
              i === 1 ? 'bg-gray-400/10 border-gray-400/20' :
              i === 2 ? 'bg-amber-600/10 border-amber-600/20' :
              'bg-surface-900 border-surface-700'
            }`}>
              <span className="text-2xl w-10 text-center">
                {p.timeTaken == null ? '⏳' : (medals[i] || `#${i + 1}`)}
              </span>
              <span className="flex-1 font-semibold text-lg">{p.name}</span>
              {p.timeTaken != null ? (
                <>
                  <span className="text-primary-400 font-bold text-lg">{p.score}/{p.total}</span>
                  <span className="text-surface-400 text-sm">{p.timeTaken}s</span>
                  <span className="text-green-400 text-xs px-2 py-1 bg-green-400/10 rounded-full">
                    completed
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-surface-400 text-sm">
                    Q {p.answered}/{p.total}
                  </span>
                  <span className="text-green-400 text-sm">
                    {p.score} correct
                  </span>
                  <span className="text-yellow-400 text-xs px-2 py-1 bg-yellow-400/10 rounded-full animate-pulse">
                    in progress
                  </span>
                  <span className="text-surface-500 text-xs">started {formatTimeAgo(p.createdAt)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Question breakdown */}
      <h2 className="text-xl font-bold mb-4">📈 Question Breakdown</h2>
      <div className="space-y-3">
        {data.questionStats.map((q, i) => {
          const isExpanded = expandedQ === q.questionId
          return (
            <div key={q.questionId} className="bg-surface-900 rounded-xl border border-surface-700 overflow-hidden">
              <button
                onClick={() => setExpandedQ(isExpanded ? null : q.questionId)}
                className="w-full flex items-center gap-4 p-4 hover:bg-surface-800 transition text-left"
              >
                <img
                  src={q.imageUrl}
                  alt={q.answer}
                  className="w-16 h-12 object-cover rounded-lg border border-surface-600"
                />
                <span className="text-surface-400 font-mono w-8">#{i + 1}</span>
                <span className="flex-1 font-medium">{q.answer}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-surface-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all"
                      style={{ width: `${q.correctPct}%` }}
                    />
                  </div>
                  <span className="text-sm text-green-400 w-16">
                    {q.correctCount}/{q.totalAnswers}
                  </span>
                </div>
                <span className="text-sm text-surface-400 w-20 text-right">
                  {q.correctPct}% correct
                </span>
                <span className="text-surface-400">{isExpanded ? '▼' : '▶'}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-surface-700 p-4 bg-surface-950">
                  {q.answers.length === 0 ? (
                    <p className="text-surface-500 text-sm text-center py-2">No answers yet</p>
                  ) : (
                    <div className="grid gap-2">
                      {q.answers.map((a, idx) => (
                        <div
                          key={`${a.participantId}-${idx}`}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            a.correct
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-red-500/10 border border-red-500/30'
                          }`}
                        >
                          <span className={`text-lg ${a.correct ? 'text-green-400' : 'text-red-400'}`}>
                            {a.correct ? '✓' : '✗'}
                          </span>
                          <span className="font-medium flex-1">{a.participantName}</span>
                          <span className={`text-sm ${a.correct ? 'text-green-400' : 'text-red-400'}`}>
                            {a.guess}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
