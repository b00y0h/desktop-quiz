---
wave: 2
depends_on: ["5.1"]
files_modified:
  - src/lib/db/schema.ts
autonomous: true
---

# Plan 5.2: Define Database Schema with All Tables

## Goal
Create a complete Drizzle schema that maps the existing Quiz data model to normalized PostgreSQL tables, establishing the relational structure for quizzes, questions, participants, answers, and submissions.

## Context
The current data model (from `src/lib/store.ts`) uses a denormalized JSON structure:
- `Quiz` contains embedded arrays of `Question[]`, `Participant[]`, and `Submission[]`
- `Participant` contains embedded `Answer[]`

For PostgreSQL, we'll normalize this into separate tables with foreign key relationships:
- `quizzes` - Main quiz metadata
- `questions` - Quiz questions (many-to-one with quiz)
- `participants` - Quiz players (many-to-one with quiz)
- `answers` - Player answers (many-to-one with participant and question)
- `submissions` - Desk photo submissions (many-to-one with quiz)

## Data Model Mapping

| Current (JSON)          | New (Postgres)               |
|------------------------|------------------------------|
| `Quiz.id`              | `quizzes.id` (PK)            |
| `Quiz.questions[]`     | `questions` table (quiz_id FK) |
| `Quiz.participants[]`  | `participants` table (quiz_id FK) |
| `Quiz.submissions[]`   | `submissions` table (quiz_id FK) |
| `Participant.answers[]`| `answers` table (participant_id, question_id FKs) |

## Tasks

<task id="5.2.1">
**Create the schema file with all table definitions**

Create `src/lib/db/schema.ts`:

```typescript
import { pgTable, text, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Quiz status enum
export const quizStatusEnum = pgEnum('quiz_status', ['draft', 'collecting', 'active', 'closed'])

// ============ TABLES ============

export const quizzes = pgTable('quizzes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  code: text('code').notNull().unique(),
  status: quizStatusEnum('status').notNull().default('draft'),
  adminPin: text('admin_pin').notNull(),
  submissionToken: text('submission_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const questions = pgTable('questions', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  answer: text('answer').notNull(),
  order: integer('order').notNull(),
})

export const participants = pgTable('participants', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  score: integer('score').notNull().default(0),
  total: integer('total').notNull().default(0),
  timeTaken: integer('time_taken'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const answers = pgTable('answers', {
  id: text('id').primaryKey(),
  participantId: text('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  guess: text('guess').notNull(),
  correct: boolean('correct').notNull(),
})

export const submissions = pgTable('submissions', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  imageUrl: text('image_url').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ============ RELATIONS ============

export const quizzesRelations = relations(quizzes, ({ many }) => ({
  questions: many(questions),
  participants: many(participants),
  submissions: many(submissions),
}))

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
}))

export const participantsRelations = relations(participants, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [participants.quizId],
    references: [quizzes.id],
  }),
  answers: many(answers),
}))

export const answersRelations = relations(answers, ({ one }) => ({
  participant: one(participants, {
    fields: [answers.participantId],
    references: [participants.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
}))

export const submissionsRelations = relations(submissions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [submissions.quizId],
    references: [quizzes.id],
  }),
}))

// ============ TYPE EXPORTS ============

export type Quiz = typeof quizzes.$inferSelect
export type NewQuiz = typeof quizzes.$inferInsert
export type Question = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert
export type Participant = typeof participants.$inferSelect
export type NewParticipant = typeof participants.$inferInsert
export type Answer = typeof answers.$inferSelect
export type NewAnswer = typeof answers.$inferInsert
export type Submission = typeof submissions.$inferSelect
export type NewSubmission = typeof submissions.$inferInsert
```

Key design decisions:
- **Text IDs**: Keep using random string IDs (like existing `genId()`) for consistency
- **Cascade deletes**: When a quiz is deleted, all related records are deleted
- **Unique code**: Quiz codes are unique (enforced at DB level)
- **Timestamps**: Use PostgreSQL native timestamps (defaultNow)
- **Enums**: Quiz status as PostgreSQL enum for type safety
- **Foreign keys**: All child tables reference parent via `quiz_id`
</task>

<task id="5.2.2">
**Update db/index.ts to export schema**

Update `src/lib/db/index.ts` to import and re-export the schema:

```typescript
import { drizzle } from 'drizzle-orm/vercel-postgres'
import { sql } from '@vercel/postgres'
import * as schema from './schema'

// Export the database instance with schema for relational queries
export const db = drizzle(sql, { schema })

// Re-export schema and sql for convenience
export * from './schema'
export { sql }
```

This enables Drizzle's relational query API (`db.query.quizzes.findMany({ with: { questions: true } })`).
</task>

## Verification

1. Run `npx next build` to verify TypeScript compiles without errors
2. Verify `src/lib/db/schema.ts` exists with all 5 tables defined
3. Verify each table has appropriate columns matching the current data model
4. Verify foreign key relationships are defined correctly
5. Verify type exports are available for each table

## must_haves
- [ ] quizzes table defined with all fields from Quiz interface (DB-03)
- [ ] questions table defined with quiz_id foreign key (DB-03)
- [ ] participants table defined with quiz_id foreign key (DB-03)
- [ ] answers table defined with participant_id and question_id foreign keys (DB-03)
- [ ] submissions table defined with quiz_id foreign key (DB-03)
- [ ] All foreign keys use cascade delete (DB-03)
- [ ] TypeScript types exported for each table (DB-02)
- [ ] Relations defined for Drizzle query API (DB-02)
