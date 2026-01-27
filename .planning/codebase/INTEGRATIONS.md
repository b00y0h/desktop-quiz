# Integrations

## External Services

### Vercel Blob Storage
- **Purpose:** Primary data store for quiz JSON + image uploads
- **SDK:** `@vercel/blob` v2 — `put`, `list`, `del` functions
- **Auth:** `BLOB_READ_WRITE_TOKEN` env var (auto-configured on Vercel)
- **Access:** All blobs are `public` access
- **Patterns:**
  - JSON data: `quiz-data/{id}.json` (overwritable, no random suffix)
  - Images: `quiz-images/{timestamp}-{filename}` (random suffix by default)
  - Cache-busting: Appends `_t` query param + `cache: 'no-store'` on reads

## Internal APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/quiz` | POST | Create new quiz |
| `/api/quiz/[id]` | GET | Get quiz (admin view with PIN, player view without) |
| `/api/quiz/[id]` | PATCH | Update quiz status (requires PIN) |
| `/api/quiz/[id]/questions` | POST | Add question (requires PIN) |
| `/api/quiz/[id]/questions` | DELETE | Remove question (requires PIN) |
| `/api/quiz/[id]/submit` | POST | Submit quiz answers |
| `/api/quiz/[id]/results` | GET | Get leaderboard and question stats |
| `/api/quiz/code/[code]` | GET | Lookup quiz by 6-char code |
| `/api/upload` | POST | Upload image to Vercel Blob |

## Authentication
- Simple 4-digit PIN per quiz (admin access)
- PIN stored in `sessionStorage` on client
- PIN passed as query param (GET) or request body (POST/PATCH/DELETE)
- No user accounts, sessions, or OAuth
