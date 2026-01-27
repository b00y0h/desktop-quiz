'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

interface Question { id: string; imageUrl: string; order: number }
interface QuizInfo { id: string; title: string; status: string; questions: Question[]; names: string[] }

type Phase = 'name' | 'playing' | 'submitting' | 'results'

export default function PlayQuiz() {
  const params = useParams()
  const code = params.code as string
  const [quiz, setQuiz] = useState<QuizInfo | null>(null)
  const [phase, setPhase] = useState<Phase>('name')
  const [name, setName] = useState('')
  const [currentQ, setCurrentQ] = useState(0)
  const [guesses, setGuesses] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score: number; total: number; participantId: string } | null>(null)
  const [leaderboard, setLeaderboard] = useState<{ name: string; score: number; total: number; timeTaken?: number }[]>([])
  const [error, setError] = useState('')
  const startTime = useRef(0)

  useEffect(() => {
    fetch(`/api/quiz/code/${code}`).then(r => r.json()).then(d => {
      if (d.error) setError(d.error)
      else setQuiz(d)
    })
  }, [code])

  function startQuiz(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTime.current = Date.now()
    setPhase('playing')
  }

  function selectAnswer(questionId: string, person: string) {
    setGuesses(prev => ({ ...prev, [questionId]: person }))
    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQ < (quiz?.questions.length || 0) - 1) {
        setCurrentQ(prev => prev + 1)
      }
    }, 300)
  }

  async function submitQuiz() {
    if (!quiz) return
    setPhase('submitting')
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000)
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), guesses, timeTaken }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setPhase('playing'); return }
      setResult(data)
      // Fire confetti
      try {
        const confetti = (await import('canvas-confetti')).default
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })
      } catch {}
      // Load leaderboard
      const lbRes = await fetch(`/api/quiz/${quiz.id}/results`)
      const lbData = await lbRes.json()
      setLeaderboard(lbData.leaderboard || [])
      setPhase('results')
    } catch {
      setError('Failed to submit')
      setPhase('playing')
    }
  }

  if (error && !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  if (!quiz) return <div className="min-h-screen flex items-center justify-center text-surface-400">Loading...</div>

  // NAME ENTRY
  if (phase === 'name') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in text-center">
          <div className="text-6xl mb-4">🖥️</div>
          <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
          <p className="text-surface-400 mb-1">{quiz.questions.length} desktop screenshots to guess</p>
          <p className="text-surface-400 mb-8 text-sm">Choose wisely — you only get one shot!</p>
          <form onSubmit={startQuiz} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full px-4 py-4 bg-surface-900 border border-surface-700 rounded-xl text-center text-xl focus:border-primary-500 focus:outline-none"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={!name.trim()} className="w-full py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-xl text-lg font-semibold transition-all glow">
              Start Quiz 🚀
            </button>
          </form>
        </div>
      </div>
    )
  }

  // PLAYING
  if (phase === 'playing' || phase === 'submitting') {
    const q = quiz.questions[currentQ]
    const allAnswered = quiz.questions.every(x => guesses[x.id])
    const isLast = currentQ === quiz.questions.length - 1

    return (
      <div className="min-h-screen flex flex-col p-4 max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-surface-400 mb-2">
            <span>Question {currentQ + 1} of {quiz.questions.length}</span>
            <span>{Object.keys(guesses).length}/{quiz.questions.length} answered</span>
          </div>
          <div className="w-full bg-surface-800 rounded-full h-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-300"
              style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex flex-col animate-fade-in" key={q.id}>
          <div className="relative rounded-xl overflow-hidden border border-surface-700 mb-4 bg-surface-900">
            <img src={q.imageUrl} alt={`Desktop ${currentQ + 1}`} className="w-full h-auto max-h-[50vh] object-contain" />
          </div>

          {/* Name options */}
          <p className="text-surface-400 text-sm mb-3">Whose desktop is this?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {quiz.names.map(n => (
              <button
                key={n}
                onClick={() => selectAnswer(q.id, n)}
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  guesses[q.id] === n
                    ? 'bg-primary-600 border-primary-500 text-white scale-[1.02]'
                    : 'bg-surface-900 border-surface-700 hover:border-primary-500 hover:bg-surface-800'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-auto">
            <button
              onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
              disabled={currentQ === 0}
              className="px-5 py-3 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl disabled:opacity-30 transition"
            >
              ← Prev
            </button>
            {!isLast ? (
              <button
                onClick={() => setCurrentQ(prev => prev + 1)}
                className="flex-1 py-3 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl transition"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={!allAnswered || phase === 'submitting'}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-semibold transition"
              >
                {phase === 'submitting' ? 'Submitting...' : `Submit (${Object.keys(guesses).length}/${quiz.questions.length})`}
              </button>
            )}
          </div>

          {/* Question dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {quiz.questions.map((x, i) => (
              <button
                key={x.id}
                onClick={() => setCurrentQ(i)}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentQ ? 'bg-primary-500 scale-125' :
                  guesses[x.id] ? 'bg-primary-400/50' : 'bg-surface-700'
                }`}
              />
            ))}
          </div>
          {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
        </div>
      </div>
    )
  }

  // RESULTS
  if (phase === 'results' && result) {
    const pct = Math.round((result.score / result.total) * 100)
    const emoji = pct === 100 ? '🎉' : pct >= 70 ? '🔥' : pct >= 50 ? '👍' : pct >= 30 ? '😅' : '💀'
    const medals = ['🥇', '🥈', '🥉']

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg animate-fade-in text-center">
          <div className="text-7xl mb-4">{emoji}</div>
          <h1 className="text-4xl font-bold mb-2">
            {result.score}/{result.total}
          </h1>
          <p className="text-surface-400 text-lg mb-8">
            {pct === 100 ? 'Perfect score! You know your team!' :
             pct >= 70 ? 'Great job!' :
             pct >= 50 ? 'Not bad!' :
             'Better luck next time!'}
          </p>

          {/* Leaderboard */}
          <div className="bg-surface-900 rounded-xl border border-surface-700 p-5 text-left">
            <h2 className="text-lg font-bold mb-4 text-center">🏆 Leaderboard</h2>
            <div className="space-y-2">
              {leaderboard.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                  p.name.toLowerCase() === name.trim().toLowerCase() ? 'bg-primary-600/20 border border-primary-500/30' : ''
                }`}>
                  <span className="text-lg w-8 text-center">{medals[i] || `#${i + 1}`}</span>
                  <span className="flex-1 font-medium">{p.name}</span>
                  <span className="text-primary-400 font-bold">{p.score}/{p.total}</span>
                  {p.timeTaken != null && <span className="text-surface-400 text-xs">{p.timeTaken}s</span>}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="mt-8 px-6 py-3 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-xl transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return null
}
