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
