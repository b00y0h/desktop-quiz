# Phase 2 Research: Submission Preview and Monitoring

**Date:** 2026-01-28
**Phase:** 2 - Submission Preview and Monitoring
**Requirements:** SUB-03, SUB-04

## Objective
Research and document what needs to be known to implement a submission preview UI that allows admins to see all incoming submissions (names + photos) in a gallery view before closing the quiz.

---

## Current State Analysis

### Existing Data Model (from `/workspace/src/lib/store.ts`)

The `Submission` interface and storage already exist:
```typescript
export interface Submission {
  id: string
  name: string
  imageUrl: string
  createdAt: string
}

export interface Quiz {
  // ... other fields
  submissions: Submission[]
  submissionToken?: string
  status: 'draft' | 'collecting' | 'active' | 'closed'
}
```

**Key findings:**
- Submissions are already stored with full data (id, name, imageUrl, createdAt)
- Submissions are part of the Quiz blob structure
- No additional backend changes needed for data storage

### Existing API Endpoints

#### Admin Quiz API (`/workspace/src/app/api/quiz/[id]/route.ts`)
```typescript
// GET /api/quiz/[id]?pin=XXXX
// Returns for authenticated admins:
{
  submissionToken?: string,
  submissionCount: quiz.submissions.length  // Already available!
}
```

**Current limitation:** The API returns `submissionCount` but NOT the actual submission details (names + imageUrls).

#### Submission API (`/workspace/src/app/api/submit/[token]/route.ts`)
```typescript
// GET /api/submit/[token]
// Returns:
{
  quizId: string,
  quizTitle: string,
  submissionCount: number,
  names: string[]  // Only names, no photos
}
```

**Current limitation:** This endpoint is designed for workers to check duplicate names, not for admin preview.

### Existing Admin Dashboard (`/workspace/src/app/admin/[id]/page.tsx`)

**Current features:**
- Shows submission count when `quiz.submissionCount` is defined (line 325-340)
- Has a "Refresh" button that calls `loadQuiz(pin)` to update the count
- Displays submission link when `quiz.submissionToken` exists

**Missing features:**
- No UI to display submission thumbnails
- No gallery view for previewing submissions
- No way to see individual submission photos

---

## What Needs to Be Built

### 1. Backend API Enhancement

**New endpoint or enhancement needed:**

**Option A:** Enhance existing GET `/api/quiz/[id]?pin=XXXX`
- Add `submissions: Submission[]` to the response for authenticated admins
- Simple approach, minimal API changes
- Reuses existing `loadQuiz()` function on client

**Option B:** Create new GET `/api/quiz/[id]/submissions?pin=XXXX`
- Dedicated endpoint for fetching submissions
- Cleaner separation of concerns
- Could be useful for future features (filtering, pagination)

**Recommendation:** Option A (enhance existing endpoint)
- Simpler implementation
- Consistent with existing patterns (admin sees more data when authenticated)
- No changes needed to client `loadQuiz()` function

**Implementation:**
```typescript
// In /workspace/src/app/api/quiz/[id]/route.ts
return NextResponse.json({
  // ... existing fields
  submissionToken: isAdmin ? quiz.submissionToken : undefined,
  submissionCount: isAdmin ? quiz.submissions.length : undefined,
  submissions: isAdmin ? quiz.submissions : undefined,  // NEW
})
```

### 2. Frontend UI Components

**Component structure:**

```
Admin Dashboard (/workspace/src/app/admin/[id]/page.tsx)
└── Submission Preview Section (new)
    ├── Header ("Submissions: X")
    ├── Refresh button (already exists, just move/reuse)
    └── Gallery Grid
        └── Submission Cards (thumbnail + name)
```

**UI Requirements:**

1. **Gallery View:**
   - Grid layout (responsive: 2 cols mobile, 3-4 cols desktop)
   - Each card shows:
     - Thumbnail image (aspect ratio preserved)
     - Participant name
     - Optional: submission timestamp
   - Empty state: "No submissions yet"

2. **Visibility:**
   - Only shown when `quiz.submissionToken` exists (submission link generated)
   - Shown in all states: collecting, closed, active
   - Accessible before closing (key requirement SUB-04)

3. **Refresh Capability:**
   - Reuse existing refresh button logic
   - Manual refresh (no auto-polling needed based on requirements)

**Design considerations:**
- Similar styling to existing question list (lines 387-403 in admin page)
- Use existing color scheme (surface-900, surface-700, primary-400)
- Consistent with results page gallery patterns

### 3. Data Flow

**Sequence:**
1. Admin dashboard loads → calls `loadQuiz(pin)`
2. API returns quiz with `submissions: Submission[]` (if admin)
3. React state updates: `quiz.submissions` available
4. Submission preview section renders with gallery
5. Admin clicks refresh → repeat steps 1-4

**TypeScript interface updates needed:**
```typescript
// In /workspace/src/app/admin/[id]/page.tsx
interface Question { id: string; imageUrl: string; answer: string; order: number }
interface Submission { id: string; name: string; imageUrl: string; createdAt: string }  // NEW
interface QuizData {
  // ... existing fields
  submissionCount?: number
  submissions?: Submission[]  // NEW
}
```

---

## Technical Patterns to Follow

### 1. Existing Gallery Pattern (Results Page)

Reference: `/workspace/src/app/admin/[id]/results/page.tsx`
- Grid with cards
- Status indicators with color coding
- Responsive spacing with Tailwind

### 2. Image Display Pattern (Admin Dashboard)

Reference: Lines 390 in `/workspace/src/app/admin/[id]/page.tsx`
```tsx
<img src={q.imageUrl} alt="" className="w-24 h-16 object-cover rounded-lg" />
```
- Use `object-cover` to maintain aspect ratio
- Rounded corners for modern look
- Consistent sizing

### 3. Optimistic Updates with Delayed Reconciliation

Reference: Lines 123-127 in admin page
```typescript
// Optimistically update UI immediately
setQuiz(prev => ({ ...prev, /* changes */ }))

// Reload after delay for consistency
setTimeout(async () => {
  const updated = await loadQuiz(pin)
  if (updated) setQuiz(updated)
}, 2000)
```
- Not needed for submission preview (read-only view)
- But useful pattern to remember for future work

### 4. Conditional Rendering Based on Status

Reference: Lines 317-350 in admin page
```tsx
{quiz.submissionToken && (
  <div className="mb-8 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
    {/* Submission link display */}
  </div>
)}
```
- Use similar pattern for preview section
- Show only when submissions are being collected

---

## Implementation Plan

### Plan 2.1: Add Submissions to Admin API Response

**Files to modify:**
- `/workspace/src/app/api/quiz/[id]/route.ts` (GET handler)

**Changes:**
1. Add `submissions` field to response when admin authenticated
2. Return full submission array with id, name, imageUrl, createdAt

**Testing:**
- Verify submissions appear in API response when PIN provided
- Verify submissions NOT in response when PIN missing/incorrect
- Test with 0, 1, and multiple submissions

### Plan 2.2: Build Submission Preview UI

**Files to modify:**
- `/workspace/src/app/admin/[id]/page.tsx`

**Changes:**
1. Update `QuizData` interface to include `submissions?: Submission[]`
2. Add new section after submission link display (around line 350)
3. Create gallery grid with submission cards
4. Show thumbnail + name for each submission
5. Include empty state for no submissions
6. Reuse existing refresh button (move from submission count to preview section)

**Layout suggestion:**
```
[Submission Link Section]
  ↓
[Submission Preview Section] ← NEW
  Header: "Preview Submissions (X)"  [Refresh button]
  Gallery: [Card] [Card] [Card]
  ↓
[Add Question Section]
  ↓
[Questions List]
```

**UI details:**
- Gallery grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`
- Card: Photo thumbnail (h-32) above name label
- Rounded borders, surface-900 background
- Hover effects for better UX

---

## Key Technical Decisions

### 1. Where to Place Preview UI?
**Decision:** Between submission link section and "Add Question" section
**Rationale:**
- Logical flow: generate link → see submissions → add questions
- Keeps submission-related features grouped together
- Doesn't disrupt existing question management workflow

### 2. Auto-refresh vs Manual Refresh?
**Decision:** Manual refresh only (reuse existing button)
**Rationale:**
- Requirement says "admin refreshes the page" (manual action)
- Consistent with existing submission count behavior
- Avoids unnecessary API load
- Simple implementation (already have refresh logic)

### 3. Full Submission Details or Just Name + Photo?
**Decision:** Start with name + photo only, timestamp optional
**Rationale:**
- Requirements specify "name + photo"
- Timestamp adds minimal value for preview
- Can add later if needed
- Keeps UI clean and focused

### 4. Pagination/Limits for Large Submission Sets?
**Decision:** No pagination for MVP
**Rationale:**
- Typical use case: 10-50 submissions (team size)
- Vercel Blob JSON size limit: 4.5 MB (plenty for metadata)
- Image thumbnails loaded lazily by browser
- Can add pagination later if needed

---

## Data Integrity Considerations

### Cache Busting
Already implemented in `loadQuiz()` (line 78-79 of store.ts):
```typescript
url.searchParams.set('_t', Date.now().toString())
```
Ensures fresh data on refresh.

### Concurrent Writes
- Submissions are append-only (no updates/deletes in Phase 2)
- Race conditions possible but unlikely (different workers submitting)
- Vercel Blob uses read-modify-write pattern (line 64-71 of store.ts)
- Acceptable risk for MVP (Phase 4 may need locking)

---

## Testing Strategy

### Manual Testing Checklist

**Setup:**
1. Create quiz and generate submission token
2. Submit 3-5 test submissions with different names and photos

**Test Cases:**
1. **SUB-03 (Submission Count):**
   - Verify count displays correctly
   - Verify count updates after refresh
   - Verify count shows before opening preview

2. **SUB-04 (Preview Individual Submissions):**
   - Verify all submissions appear in gallery
   - Verify thumbnails load correctly
   - Verify names display below photos
   - Verify preview accessible while status = 'collecting'
   - Verify preview still accessible after closing (future phases)

3. **Edge Cases:**
   - Zero submissions (empty state)
   - One submission (grid still looks good)
   - Many submissions (15+) - performance check
   - Long names (truncation/wrapping)
   - Large images (thumbnail sizing)

### No Automated Tests
- Project has no testing framework (per `.planning/codebase/STACK.md`)
- Manual testing sufficient for MVP
- Could add tests later if needed

---

## Dependencies and Blockers

### Dependencies
- Phase 1 complete ✓ (submission infrastructure exists)
- Quiz model includes `submissions[]` ✓
- Admin API authentication working ✓

### Blockers
- None identified

### Nice-to-Haves (Future)
- Click to enlarge photo (modal view)
- Sort by submission time
- Delete individual submissions (admin power)
- Export submissions as ZIP
- Real-time updates (WebSocket/polling)

---

## Architecture Patterns to Maintain

### 1. Client Components with useState/useEffect
All pages are `'use client'` (line 1 of admin page). Continue this pattern.

### 2. Optimistic UI Updates (when applicable)
Not needed for read-only preview, but good pattern for future edits.

### 3. TypeScript Strict Mode
Interfaces for all data structures. Add `Submission` interface to admin page.

### 4. Tailwind CSS with Custom Theme
Use existing color tokens (primary-*, surface-*) for consistency.

### 5. No Server-Side Rendering
All rendering happens client-side. Keep it simple.

---

## Questions to Consider During Planning

1. **Should preview be collapsible/expandable?**
   - Could add accordion-style collapse for long submission lists
   - Not required for MVP, add if helpful

2. **Should we show submission timestamps?**
   - Data is available (`createdAt`)
   - Could help admin track who submitted when
   - Format: relative time ("2 minutes ago") or absolute

3. **Should we add image loading states?**
   - Show skeleton/spinner while thumbnails load
   - Better UX for slow connections
   - Easy to add with Tailwind

4. **Should preview be a separate page or embedded?**
   - Embedded pros: no navigation, see count + preview together
   - Separate page pros: cleaner, better for many submissions
   - **Recommendation:** Embedded for MVP (simpler, meets requirements)

---

## Security Considerations

### Authentication
- Preview only shown when admin PIN validated
- API returns submissions only for authenticated admins (`isAdmin` check)
- No new security risks introduced

### Image URLs
- Already public (Vercel Blob with `access: 'public'`)
- URLs are unguessable (Date.now() + random suffix)
- Acceptable for desk photos (not sensitive data)

---

## Performance Considerations

### Image Loading
- Browser lazy-loads images by default (modern browsers)
- Consider `loading="lazy"` attribute for explicit control
- Thumbnails are full-size images (no server-side resize)
- Acceptable for MVP (Vercel Blob serves via CDN)

### API Response Size
- Each submission: ~200 bytes JSON + URL
- 50 submissions: ~10 KB JSON
- Well within reasonable limits
- No pagination needed for MVP

### Client-Side Rendering
- Gallery renders after fetch completes
- No SSR or streaming (all client components)
- Fast enough for typical team sizes (<100 submissions)

---

## Summary: What You Need to Know

### To Plan This Phase Well:

1. **Backend is 95% done** - Just add `submissions` to API response
2. **Frontend is the main work** - Build gallery UI component
3. **Reuse existing patterns** - Grid layouts, image display, refresh logic
4. **No new data model changes** - Everything already exists
5. **No complex state management** - Simple read-only display
6. **Manual refresh is sufficient** - Don't over-engineer with polling
7. **Empty state matters** - Handle zero submissions gracefully
8. **Placement matters** - Between submission link and question list
9. **Testing is manual** - No test framework configured
10. **Security already handled** - PIN-based auth covers preview

### Key Files to Modify:
1. `/workspace/src/app/api/quiz/[id]/route.ts` (one line change)
2. `/workspace/src/app/admin/[id]/page.tsx` (new UI section + interface)

### Estimated Complexity:
- **Backend:** Trivial (1 line)
- **Frontend:** Moderate (new UI section, grid layout, responsive design)
- **Overall:** Low complexity, high value

---

## References

### Existing Code to Study:
- Admin dashboard: `/workspace/src/app/admin/[id]/page.tsx` (lines 317-403)
- Results page gallery: `/workspace/src/app/admin/[id]/results/page.tsx` (lines 30-89)
- Data model: `/workspace/src/lib/store.ts` (lines 44-49, Submission interface)
- Admin API: `/workspace/src/app/api/quiz/[id]/route.ts` (lines 13-29)

### Design System:
- Colors: primary-*, surface-*, blue-500, green-500, red-500
- Spacing: p-4, p-5, mb-8, gap-4
- Borders: border border-surface-700, rounded-xl
- Animations: animate-fade-in (line 34 of globals.css)

---

**Research Complete:** Ready to create detailed implementation plan.
