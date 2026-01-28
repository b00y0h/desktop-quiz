'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface QuizStats {
  id: string
  title: string
  code: string
  status: 'draft' | 'collecting' | 'active' | 'closed'
  createdAt: string
  submissionCount: number
  participantCount: number
}

export default function SuperAdminDashboard() {
  const [quizzes, setQuizzes] = useState<QuizStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadQuizzes()
  }, [])

  async function loadQuizzes() {
    try {
      const res = await fetch('/api/super-admin/quizzes')
      if (!res.ok) {
        if (res.status === 401) {
          // Will be handled by layout
          return
        }
        throw new Error('Failed to load quizzes')
      }
      const data = await res.json()
      setQuizzes(data.quizzes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  async function deleteQuiz(id: string, title: string) {
    // Confirmation dialog (MGMT-03)
    const confirmed = confirm(
      `Delete quiz "${title}"?\n\nThis will permanently remove the quiz, all submissions, questions, participant data, and associated images. This cannot be undone.`
    )
    if (!confirmed) return

    try {
      const res = await fetch(`/api/super-admin/quizzes/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete quiz')
        return
      }

      // Remove from local state
      setQuizzes(prev => prev.filter(q => q.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete quiz')
    }
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-500/20 text-yellow-400',
    collecting: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    closed: 'bg-red-500/20 text-red-400',
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="text-surface-400">Loading quizzes...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">All Quizzes</h1>
          <p className="text-surface-400 mt-1">
            {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} in system
          </p>
        </div>
        <button
          onClick={loadQuizzes}
          className="px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-lg text-sm transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="text-center py-16 text-surface-400">
          <p>No quizzes in the system yet.</p>
        </div>
      ) : (
        <div className="bg-surface-900 rounded-xl border border-surface-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 text-left text-surface-400 text-sm">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Submissions</th>
                <th className="px-4 py-3 font-medium text-right">Participants</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition">
                  <td className="px-4 py-3">
                    <span className="font-medium">{quiz.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-primary-400 font-mono">{quiz.code}</code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[quiz.status]}`}>
                      {quiz.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {quiz.submissionCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {quiz.participantCount}
                  </td>
                  <td className="px-4 py-3 text-surface-400 text-sm">
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/${quiz.id}`}
                        className="text-primary-400 hover:text-primary-300 text-sm transition"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => deleteQuiz(quiz.id, quiz.title)}
                        className="text-red-400 hover:text-red-300 text-sm transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
