# Concerns

## Data Integrity
- **Race conditions:** Read-modify-write on Vercel Blob with no locking. Concurrent participants submitting simultaneously could lose data.
- **No data validation on read:** JSON parsed without schema validation — corrupt blobs would crash silently.

## Security
- **PIN in query params:** Admin PIN passed as URL query parameter on GET requests (visible in logs, browser history).
- **No rate limiting:** API routes have no throttling — susceptible to brute-force PIN guessing (only 10,000 possible 4-digit PINs).
- **No CSRF protection:** API mutations use simple POST with no CSRF tokens.
- **Answers exposed in API:** The `/api/quiz/code/[code]` endpoint returns `names` (which are the answers) — by design, but names list reveals all possible answers.

## Performance
- **Full quiz load on every operation:** `loadQuiz` reads the entire quiz JSON for every store operation. Large quizzes with many participants could become slow.
- **`loadAllQuizzes` scans all blobs:** `getQuizByCode` and `createQuiz` load every quiz to scan — O(n) on total quiz count.
- **No caching layer:** Every request hits Vercel Blob directly.

## UX
- **No offline support or error recovery:** Network failures during image upload or quiz submission show generic errors.
- **No question reordering:** Admin can add/remove but not reorder questions.
- **No edit capability:** Can't edit question answer text after creation.
- **Data resets on redeploy:** Noted in UI footer — Vercel Blob data persists, but this warning suggests ephemeral deployment expectation.

## Scalability
- **Single JSON blob per quiz:** As participant count grows, the blob grows unboundedly.
- **No pagination:** Leaderboard and results load all participants at once.
