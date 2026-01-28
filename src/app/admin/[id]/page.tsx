'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Question { id: string; imageUrl: string; answer: string; order: number }
interface Submission { id: string; name: string; imageUrl: string; createdAt: string }
interface QuizData { id: string; title: string; code: string; status: string; questions: Question[]; questionCount: number; submissionToken?: string; submissionCount?: number; submissions?: Submission[] }

export default function AdminQuiz() {
  const params = useParams()
  const id = params.id as string
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [pin, setPin] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [newAnswer, setNewAnswer] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [submissionCopied, setSubmissionCopied] = useState(false)

  const loadQuiz = useCallback(async (adminPin: string) => {
    try {
      const res = await fetch(`/api/quiz/${id}?pin=${adminPin}`)
      if (!res.ok) return null
      return await res.json() as QuizData
    } catch (err) {
      console.error('Failed to load quiz:', err)
      return null
    }
  }, [id])

  useEffect(() => {
    const savedPin = sessionStorage.getItem(`quiz-pin-${id}`)
    if (savedPin) {
      setPin(savedPin)
      setAuthenticated(true)
      loadQuiz(savedPin).then(q => q && setQuiz(q))
    }
  }, [id, loadQuiz])

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = await loadQuiz(pinInput)
    if (data) {
      setPin(pinInput)
      setQuiz(data)
      setAuthenticated(true)
      sessionStorage.setItem(`quiz-pin-${id}`, pinInput)
    } else {
      setError('Invalid PIN or quiz not found')
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setError('No file selected'); return }
    if (!newAnswer.trim()) { setError('Enter a name before uploading'); return }

    setUploading(true)
    setError('')

    try {
      // Step 1: Upload image to Vercel Blob
      console.log('Uploading image...')
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      
      if (!uploadRes.ok) {
        const errBody = await uploadRes.text()
        console.error('Upload failed:', uploadRes.status, errBody)
        setError(`Upload failed: ${uploadRes.status} - ${errBody}`)
        setUploading(false)
        return
      }

      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.url
      if (!imageUrl) {
        setError('Upload succeeded but no URL returned')
        setUploading(false)
        return
      }
      console.log('Image uploaded:', imageUrl)

      // Step 2: Add question to quiz
      console.log('Adding question...')
      const addRes = await fetch(`/api/quiz/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, answer: newAnswer.trim(), pin }),
      })

      if (!addRes.ok) {
        const errBody = await addRes.text()
        console.error('Add question failed:', addRes.status, errBody)
        setError(`Add question failed: ${addRes.status} - ${errBody}`)
        setUploading(false)
        return
      }

      const questionData = await addRes.json()
      console.log('Question added:', questionData)

      // Step 3: Optimistically update UI immediately
      setNewAnswer('')
      setQuiz(prev => {
        if (!prev) return prev
        const newQuestion = {
          id: questionData.id,
          imageUrl: questionData.imageUrl || imageUrl,
          answer: questionData.answer || newAnswer.trim(),
          order: questionData.order ?? prev.questions.length,
        }
        return {
          ...prev,
          questions: [...prev.questions, newQuestion],
          questionCount: prev.questions.length + 1,
        }
      })

      // Also reload from server after a delay to ensure consistency
      setTimeout(async () => {
        const updated = await loadQuiz(pin)
        if (updated) setQuiz(updated)
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Upload/add error:', message)
      setError(`Error: ${message}`)
    }

    setUploading(false)
    // Reset file input
    if (e.target) e.target.value = ''
  }

  async function removeQuestion(questionId: string) {
    // Optimistically remove from UI
    setQuiz(prev => {
      if (!prev) return prev
      const filtered = prev.questions.filter(q => q.id !== questionId)
      filtered.forEach((q, i) => q.order = i)
      return { ...prev, questions: filtered, questionCount: filtered.length }
    })
    try {
      await fetch(`/api/quiz/${id}/questions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, pin }),
      })
      // Reload after delay for consistency
      setTimeout(async () => {
        const updated = await loadQuiz(pin)
        if (updated) setQuiz(updated)
      }, 2000)
    } catch (err) {
      setError(`Remove failed: ${err instanceof Error ? err.message : String(err)}`)
      // Revert on error
      const updated = await loadQuiz(pin)
      if (updated) setQuiz(updated)
    }
  }

  async function toggleStatus() {
    try {
      const newStatus = quiz?.status === 'active' ? 'closed' : 'active'
      await fetch(`/api/quiz/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, pin }),
      })
      const updated = await loadQuiz(pin)
      if (updated) setQuiz(updated)
    } catch (err) {
      setError(`Status change failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/play/${quiz?.code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function startCollectingSubmissions() {
    try {
      const res = await fetch(`/api/quiz/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateSubmissionToken', pin }),
      })
      if (!res.ok) {
        setError('Failed to generate submission link')
        return
      }
      const data = await res.json()
      setQuiz(prev => prev ? { ...prev, submissionToken: data.token, status: 'collecting', submissionCount: 0 } : prev)
    } catch (err) {
      setError(`Failed to generate link: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function copySubmissionLink() {
    const url = `${window.location.origin}/submit/${quiz?.submissionToken}`
    navigator.clipboard.writeText(url)
    setSubmissionCopied(true)
    setTimeout(() => setSubmissionCopied(false), 2000)
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <h1 className="text-2xl font-bold mb-6 text-center">Enter Admin PIN</h1>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              value={pinInput}
              onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              className="w-full px-4 py-3 bg-surface-900 border border-surface-700 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:border-primary-500 focus:outline-none"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" className="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold transition">
              Unlock
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!quiz) return <div className="min-h-screen flex items-center justify-center"><div className="text-surface-400">Loading...</div></div>

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-500/20 text-yellow-400',
    collecting: 'bg-blue-500/20 text-blue-400',
    active: 'bg-green-500/20 text-green-400',
    closed: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-surface-400 hover:text-surface-200 text-sm">← Home</Link>
          <h1 className="text-3xl font-bold mt-2">{quiz.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[quiz.status]}`}>
              {quiz.status}
            </span>
            <span className="text-surface-400 font-mono text-lg">Code: {quiz.code}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink} className="px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-lg text-sm transition">
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <Link href={`/admin/${id}/results`} className="px-4 py-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded-lg text-sm transition">
            Results
          </Link>
        </div>
      </div>

      {/* Status control */}
      <div className="mb-8 p-4 bg-surface-900 rounded-xl border border-surface-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">
              {quiz.status === 'draft' && 'Draft - Add questions then publish'}
              {quiz.status === 'collecting' && 'Collecting Submissions - Share the link below'}
              {quiz.status === 'active' && 'Live - Participants can join'}
              {quiz.status === 'closed' && 'Closed - No more submissions'}
            </p>
            <p className="text-surface-400 text-sm mt-1">
              Share link: {typeof window !== 'undefined' ? window.location.origin : ''}/play/{quiz.code}
            </p>
          </div>
          <button
            onClick={toggleStatus}
            disabled={quiz.status === 'draft' && quiz.questions.length === 0}
            className={`px-5 py-2 rounded-lg font-semibold transition ${
              quiz.status === 'active'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-green-600 hover:bg-green-500'
            } disabled:opacity-30`}
          >
            {quiz.status === 'active' ? 'Close Quiz' : 'Publish Quiz'}
          </button>
        </div>
      </div>

      {/* Submission link section */}
      {quiz.status === 'draft' && (
        <div className="mb-8 p-4 bg-surface-900 rounded-xl border border-surface-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Start Collecting Desktop Submissions</p>
              <p className="text-surface-400 text-sm mt-1">
                Generate a unique link for people to submit their desktop screenshots
              </p>
            </div>
            <button
              onClick={startCollectingSubmissions}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition"
            >
              Start Collecting Submissions
            </button>
          </div>
        </div>
      )}

      {quiz.submissionToken && (
        <div className="mb-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="font-medium text-blue-400 mb-2">Submission Link</p>
              <code className="text-sm bg-surface-900 px-3 py-2 rounded block break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/submit/{quiz.submissionToken}
              </code>
              {quiz.status === 'collecting' && quiz.submissionCount !== undefined && (
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-surface-400 text-sm">
                    Submissions received: {quiz.submissionCount}
                  </p>
                  <button
                    onClick={async () => {
                      const updated = await loadQuiz(pin)
                      if (updated) setQuiz(updated)
                    }}
                    className="px-3 py-1 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded text-xs transition"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={copySubmissionLink}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition whitespace-nowrap"
            >
              {submissionCopied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Add question */}
      <div className="mb-8 p-5 bg-surface-900 rounded-xl border border-surface-700 border-dashed">
        <h2 className="text-lg font-semibold mb-4">Add Desktop Screenshot</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newAnswer}
            onChange={e => setNewAnswer(e.target.value)}
            placeholder="Person's name (e.g. Alice)"
            className="flex-1 px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl focus:border-primary-500 focus:outline-none"
          />
          <label className={`px-6 py-3 rounded-xl font-semibold cursor-pointer text-center transition ${
            newAnswer.trim() && !uploading ? 'bg-primary-600 hover:bg-primary-500' : 'bg-surface-700 opacity-50 cursor-not-allowed'
          }`}>
            {uploading ? 'Uploading...' : 'Upload Image'}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={!newAnswer.trim() || uploading}
              className="hidden"
            />
          </label>
        </div>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>

      {/* Questions list */}
      <h2 className="text-lg font-semibold mb-4">Questions ({quiz.questions.length})</h2>
      {quiz.questions.length === 0 ? (
        <div className="text-center py-16 text-surface-400">
          <p>No questions yet. Upload desktop screenshots above!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {quiz.questions.sort((a, b) => a.order - b.order).map((q, i) => (
            <div key={q.id} className="flex items-center gap-4 p-4 bg-surface-900 rounded-xl border border-surface-700">
              <span className="text-2xl font-bold text-surface-700 w-8">#{i + 1}</span>
              <img src={q.imageUrl} alt="" className="w-24 h-16 object-cover rounded-lg" />
              <div className="flex-1">
                <p className="font-medium">Answer: <span className="text-primary-400">{q.answer}</span></p>
              </div>
              <button
                onClick={() => removeQuestion(q.id)}
                className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
