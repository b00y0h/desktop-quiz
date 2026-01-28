const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
])

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif',
])

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export interface ImageValidationError {
  error: string
}

export function validateImageFile(file: File): ImageValidationError | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: `Invalid file type "${file.type}". Allowed: JPEG, PNG, GIF, WebP, AVIF.` }
  }

  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { error: `Invalid file extension "${ext}". Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}.` }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return { error: `File too large (${sizeMB} MB). Maximum is 5 MB.` }
  }

  return null
}

/** Client-side accept string for file inputs */
export const IMAGE_ACCEPT = ALLOWED_MIME_TYPES.size
  ? Array.from(ALLOWED_MIME_TYPES).join(',')
  : 'image/*'
