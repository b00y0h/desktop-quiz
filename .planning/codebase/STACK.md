# Stack

## Runtime & Framework
- **Next.js 14** — App Router with React Server Components support
- **React 19** — Client components with hooks (useState, useEffect, useCallback, useRef)
- **TypeScript 5.9** — Strict mode enabled

## Styling
- **Tailwind CSS 4** — Using `@import "tailwindcss"` with `@theme` directive for custom tokens
- **PostCSS** with `@tailwindcss/postcss` plugin
- Custom CSS animations (fade-in, pulse-glow)

## Data Storage
- **Vercel Blob** (`@vercel/blob` v2) — Used for both JSON data persistence and image uploads
- Quiz data stored as JSON blobs with `quiz-data/` prefix
- Images stored with `quiz-images/` prefix
- No traditional database — all data in blob storage

## Client Libraries
- **canvas-confetti** — Dynamically imported for celebration effects on quiz completion

## Build & Dev
- `next dev` / `next build` / `next start`
- No testing framework configured
- No linting configuration beyond default `next lint`

## Deployment
- Designed for **Vercel** (Vercel Blob dependency, `maxDuration` exports)
- `BLOB_READ_WRITE_TOKEN` environment variable required
