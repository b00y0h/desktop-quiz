# Conventions

## Code Style
- All page components are client-side (`'use client'` directive)
- Interfaces defined inline at top of files (no shared types file except store.ts)
- Arrow functions for handlers, regular `function` for named page exports (`export default function`)
- Error handling: try/catch with console.error + user-facing error state

## Naming
- Pages: PascalCase component names matching route purpose (e.g., `CreateQuiz`, `PlayQuiz`, `AdminQuiz`)
- API routes: `route.ts` with exported HTTP method functions (`GET`, `POST`, `PATCH`, `DELETE`)
- Store functions: camelCase (e.g., `createQuiz`, `getQuizByCode`, `submitAnswers`)
- IDs: random base36 strings via `genId()`
- Quiz codes: 6-char uppercase alphanumeric (excluding ambiguous chars like O, 0, I, 1)

## UI Patterns
- Dark theme by default (`className="dark"` on `<html>`)
- Custom color tokens: `primary-*` (indigo) and `surface-*` (slate) scales
- Consistent component structure: centered layouts, rounded corners (`rounded-xl`), border styling
- Loading states: simple text ("Loading...") or disabled buttons
- Error display: red-400 text below forms
- Animations: fade-in on page load, glow effect on primary CTA

## State Management
- React `useState` for all local state (no global state library)
- `sessionStorage` for admin PIN persistence
- Server state fetched via `fetch()` in `useEffect` or event handlers
- Optimistic UI updates with delayed server reconciliation

## API Patterns
- All routes use `NextRequest`/`NextResponse`
- Async params pattern: `{ params }: { params: Promise<{ id: string }> }`
- PIN auth via query param (GET) or request body (mutations)
- Consistent error response shape: `{ error: string }`
