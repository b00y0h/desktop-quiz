---
wave: 1
depends_on: []
files_modified:
  - src/app/api/quiz/[id]/route.ts
  - src/app/admin/[id]/page.tsx
autonomous: true
---

# Plan 2.1: Submission Preview UI and Counter

## Goal
Give admins visibility into incoming submissions by showing a gallery of submitted names and photos, plus a visible submission counter — all accessible before submissions are closed.

## Context
Phase 1 established the submission infrastructure. The admin API already returns `submissionCount` but not the actual submission data. The admin dashboard shows the count inline with the submission link section. We need to:
1. Include `submissions` array in the admin API response (backend is almost done)
2. Build a gallery UI showing submission thumbnails and names
3. Ensure the counter is prominently visible without needing to open a preview

The gallery should appear between the submission link section and the "Add Desktop Screenshot" section in the admin dashboard.

## Tasks

<task id="2.1.1">
**Include submissions array in admin API response**

In `src/app/api/quiz/[id]/route.ts` GET handler:
- When `isAdmin` is true, add `submissions: quiz.submissions` to the response JSON
- The submissions array contains `{ id, name, imageUrl, createdAt }` objects
- Non-admin responses should NOT include submissions data

Update the response object (around line 14-29) to add after `submissionCount`:
```
submissions: isAdmin ? quiz.submissions : undefined,
```
</task>

<task id="2.1.2">
**Add Submission interface and extend QuizData in admin page**

In `src/app/admin/[id]/page.tsx`:

The admin page defines its own local interfaces (line 6-7) rather than importing from store. Follow this existing pattern:

- Add a `Submission` interface after the `Question` interface (after line 6):
  ```ts
  interface Submission { id: string; name: string; imageUrl: string; createdAt: string }
  ```
- Extend the `QuizData` interface (line 7) to add `submissions?: Submission[]` after `submissionCount`:
  ```ts
  interface QuizData { id: string; title: string; code: string; status: string; questions: Question[]; questionCount: number; submissionToken?: string; submissionCount?: number; submissions?: Submission[] }
  ```
- No other state changes needed — submissions come from `quiz` state which is already refreshed via `loadQuiz`
</task>

<task id="2.1.3">
**Build submission preview gallery in admin dashboard**

In `src/app/admin/[id]/page.tsx`, add a new section **after** the submission link block (`{quiz.submissionToken && (...)}` ending at line 350) and **before** the "Add question" section (`{/* Add question */}` at line 352).

**Visibility condition:** Show whenever `quiz.submissionToken` exists (any status after token generation — collecting, active, or closed). Admin should always be able to see submissions once collection has started.

```tsx
{quiz.submissionToken && (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">
        Submissions ({quiz.submissions?.length ?? quiz.submissionCount ?? 0})
      </h2>
      <button
        onClick={async () => {
          const updated = await loadQuiz(pin)
          if (updated) setQuiz(updated)
        }}
        className="px-3 py-1 bg-surface-800 hover:bg-surface-700 border border-surface-700 rounded text-sm transition"
      >
        Refresh
      </button>
    </div>
    {(!quiz.submissions || quiz.submissions.length === 0) ? (
      <p className="text-surface-400 text-center py-8">
        No submissions yet. Share the submission link to start collecting.
      </p>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {quiz.submissions.map(sub => (
          <div key={sub.id} className="bg-surface-900 rounded-xl border border-surface-700 overflow-hidden">
            <img
              src={sub.imageUrl}
              alt={`${sub.name}'s submission`}
              className="w-full h-32 object-cover"
              onError={e => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).alt = 'Failed to load' }}
            />
            <p className="p-3 text-sm font-medium truncate">{sub.name}</p>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

**Key details:**
- Reuses the same `loadQuiz(pin)` refresh pattern already used in the submission count refresh button (line 331-334)
- `truncate` class handles long name truncation via CSS ellipsis
- `onError` handler on `<img>` gracefully handles broken image URLs
- Count in header uses `submissions.length` (preferred) with fallback to `submissionCount`
- Responsive grid: 2 cols mobile, 3 tablet, 4 desktop
</task>

## Verification

1. Admin API returns `submissions` array when authenticated with PIN
2. Non-admin API requests do NOT include submissions data
3. Admin dashboard shows submission gallery whenever `quiz.submissionToken` exists (collecting, active, or closed states)
4. Gallery displays each submission's photo as thumbnail and name below it
5. Gallery uses responsive grid: 2 cols on mobile, 3 on tablet, 4 on desktop
6. Empty state message shows when there are zero submissions
7. Refresh button in gallery header reloads submission data and gallery updates correctly
8. Submission count is visible in gallery header without needing to expand anything
9. Broken image URLs show gracefully (onError handler clears src)
10. Long submission names are truncated with ellipsis (CSS `truncate` class)
11. Gallery works correctly with large numbers of submissions (20+)

## must_haves
- Admin can see how many submissions have been received without opening preview (SUB-03)
- Admin can preview all submissions with names and photos in a gallery view (SUB-04)
- Submission preview updates when admin clicks Refresh button
- Gallery is visible whenever submissionToken exists (not just during collecting state)
