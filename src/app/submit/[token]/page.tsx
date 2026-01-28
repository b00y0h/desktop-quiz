'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { validateImageFile, IMAGE_ACCEPT } from '@/lib/image-validation'

interface TokenInfo {
  quizId: string
  quizTitle: string
  submissionCount: number
  names: string[]
  alreadySubmitted: boolean
}

interface SubmissionResult {
  id: string
  name: string
}

export default function SubmitPage() {
  const params = useParams()
  const token = params.token as string

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  const [submitted, setSubmitted] = useState(false)
  const [submittedName, setSubmittedName] = useState('')
  const [submittedImageUrl, setSubmittedImageUrl] = useState('')

  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/submit/${token}`)
        if (res.status === 404) {
          setError('Invalid submission link')
        } else if (res.status === 410) {
          setError('Submissions for this quiz have been closed. Thank you!')
        } else if (res.ok) {
          const data = await res.json()
          // If server says not already submitted, clear any stale cookie
          // so POST won't be blocked (handles admin-delete resubmission)
          if (!data.alreadySubmitted && data.quizId) {
            document.cookie = `submitted-${data.quizId}=; Path=/; Max-Age=0`
          }
          setTokenInfo(data)
        } else {
          setError('Failed to validate submission link')
        }
      } catch (err) {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    validateToken()
  }, [token])

  const checkDuplicateName = (inputName: string) => {
    if (!inputName.trim() || !tokenInfo?.names) {
      setDuplicateWarning(false)
      return
    }
    const normalizedInput = inputName.trim().toLowerCase()
    const isDuplicate = tokenInfo.names.some(n => n.trim().toLowerCase() === normalizedInput)
    setDuplicateWarning(isDuplicate)
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    checkDuplicateName(newName)
  }

  const handleNameBlur = () => {
    checkDuplicateName(name)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validationError = validateImageFile(selectedFile)
      if (validationError) {
        setUploadError(validationError.error)
        e.target.value = ''
        return
      }
      setUploadError(null)
      setFile(selectedFile)
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)

    if (!name.trim()) {
      setUploadError('Name is required')
      return
    }

    if (name.trim().length > 50) {
      setUploadError('Name must be 50 characters or fewer')
      return
    }

    if (!/^[a-zA-Z0-9 '.\-]+$/.test(name.trim())) {
      setUploadError('Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods')
      return
    }

    if (!file) {
      setUploadError('Photo is required')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('file', file)

      const res = await fetch(`/api/submit/${token}`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setSubmittedName(data.submission.name)
        setSubmittedImageUrl(previewUrl || '')
        setSubmitted(true)
      } else if (res.status === 403) {
        setUploadError('You have already submitted')
      } else if (res.status === 409) {
        setUploadError('Name already taken')
        setDuplicateWarning(true)
      } else {
        const data = await res.json()
        setUploadError(data.error || 'Submission failed')
      }
    } catch (err) {
      setUploadError('Network error')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-surface-dark rounded-xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{error}</h1>
          <p className="text-gray-400">Please check your submission link and try again.</p>
        </div>
      </div>
    )
  }

  if (tokenInfo?.alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-surface-dark rounded-xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Already Submitted</h1>
          <p className="text-gray-400">You have already submitted a photo for this quiz.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-surface-dark rounded-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Submission received!</h1>
            <p className="text-gray-400">You&apos;re all set</p>
          </div>

          <div className="bg-surface rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-2">Name</p>
            <p className="text-white font-medium">{submittedName}</p>
          </div>

          {submittedImageUrl && (
            <div className="bg-surface rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-2">Photo</p>
              <img
                src={submittedImageUrl}
                alt="Submitted desk photo"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-surface-dark rounded-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-2">{tokenInfo?.quizTitle}</h1>
        <p className="text-gray-400 mb-6">Submit your desk photo</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              required
              maxLength={50}
              className="w-full px-4 py-3 bg-surface rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your name"
            />
            {duplicateWarning && (
              <p className="text-yellow-400 text-sm mt-2">
                This name is already taken. Please use a different name.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-300 mb-2">
              Desk Photo
            </label>
            <input
              id="file"
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={handleFileChange}
              required
              className="w-full px-4 py-3 bg-surface rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {previewUrl && (
            <div className="bg-surface rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-2">Preview</p>
              <img
                src={previewUrl}
                alt="Photo preview"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {uploadError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{uploadError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || duplicateWarning}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}
