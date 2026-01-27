# Structure

## Directory Layout

```
src/
├── app/
│   ├── layout.tsx              # Root layout (dark theme, metadata)
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Tailwind + custom animations
│   ├── create/
│   │   └── page.tsx            # Quiz creation form
│   ├── play/
│   │   ├── page.tsx            # Join quiz by code
│   │   └── [code]/
│   │       └── page.tsx        # Play quiz (largest component ~266 lines)
│   ├── admin/
│   │   └── [id]/
│   │       ├── page.tsx        # Admin dashboard (~325 lines)
│   │       └── results/
│   │           └── page.tsx    # Results/leaderboard view
│   └── api/
│       ├── quiz/
│       │   ├── route.ts        # POST create quiz
│       │   ├── [id]/
│       │   │   ├── route.ts    # GET/PATCH quiz
│       │   │   ├── questions/
│       │   │   │   └── route.ts # POST/DELETE questions
│       │   │   ├── submit/
│       │   │   │   └── route.ts # POST submit answers
│       │   │   └── results/
│       │   │       └── route.ts # GET results
│       │   └── code/
│       │       └── [code]/
│       │           └── route.ts # GET quiz by code
│       └── upload/
│           └── route.ts        # POST image upload
└── lib/
    └── store.ts                # Data layer (~206 lines)
```

## File Count
- **18 source files** (TypeScript/TSX/CSS)
- **1 shared module** (`lib/store.ts`)
- **7 API routes**
- **6 page components**

## Key Files
- `src/lib/store.ts` — Central data layer, all CRUD operations
- `src/app/play/[code]/page.tsx` — Most complex UI (multi-phase quiz flow)
- `src/app/admin/[id]/page.tsx` — Second most complex (question management + image upload)
