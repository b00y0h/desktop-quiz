#!/usr/bin/env npx tsx
/**
 * Migration Verification Script
 *
 * Tests all quiz functionality against Postgres to verify the migration worked correctly.
 * This is Plan 7.3: Functional Verification - End-to-End Testing
 *
 * Requirements verified:
 * - VER-01: All quiz operations work correctly
 * - VER-02: No stale read issues (immediate consistency)
 */

import { store, Quiz, Question, Participant, Submission } from '../src/lib/store'
import { db, quizzes, questions, participants, answers, submissions } from '../src/lib/db'
import { eq } from 'drizzle-orm'

// Test state tracking
interface TestResult {
  name: string
  passed: boolean
  error?: string
  duration?: number
}

const results: TestResult[] = []
let testQuizId: string | null = null
let testQuizCode: string | null = null
let submissionToken: string | null = null

function log(msg: string) {
  console.log(`[VERIFY] ${msg}`)
}

function logError(msg: string) {
  console.error(`[ERROR] ${msg}`)
}

async function runTest(name: string, fn: () => Promise<void>): Promise<boolean> {
  const start = Date.now()
  try {
    await fn()
    const duration = Date.now() - start
    results.push({ name, passed: true, duration })
    log(`PASS: ${name} (${duration}ms)`)
    return true
  } catch (err) {
    const duration = Date.now() - start
    const error = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error, duration })
    logError(`FAIL: ${name} - ${error}`)
    return false
  }
}

// ============ TASK 1: Quiz Creation Flow ============

async function testQuizCreation() {
  await runTest('Task 1.1: Create new quiz', async () => {
    const quiz = await store.createQuiz(
      'Migration Test Quiz',
      'Testing after migration',
      '1234'
    )

    if (!quiz.id) throw new Error('Quiz ID not generated')
    if (!quiz.code || quiz.code.length !== 6) throw new Error('Invalid quiz code')
    if (quiz.status !== 'draft') throw new Error(`Expected status 'draft', got '${quiz.status}'`)
    if (quiz.adminPin !== '1234') throw new Error('Admin PIN mismatch')
    if (quiz.questions.length !== 0) throw new Error('Expected empty questions array')
    if (quiz.participants.length !== 0) throw new Error('Expected empty participants array')
    if (quiz.submissions.length !== 0) throw new Error('Expected empty submissions array')

    testQuizId = quiz.id
    testQuizCode = quiz.code
    log(`  Created quiz: ${quiz.id} (code: ${quiz.code})`)
  })

  await runTest('Task 1.2: Quiz immediately retrievable by ID (VER-02)', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found by ID - possible stale read')
    if (quiz.title !== 'Migration Test Quiz') throw new Error('Quiz title mismatch')
  })

  await runTest('Task 1.3: Quiz immediately retrievable by code (VER-02)', async () => {
    if (!testQuizCode) throw new Error('No test quiz code')

    const quiz = await store.getQuizByCode(testQuizCode)
    if (!quiz) throw new Error('Quiz not found by code - possible stale read')
    if (quiz.id !== testQuizId) throw new Error('Quiz ID mismatch')
  })
}

// ============ TASK 2: Submission Token & Photo Submission ============

async function testSubmissionFlow() {
  await runTest('Task 2.1: Generate submission token', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const token = await store.generateSubmissionToken(testQuizId, '1234')
    if (!token) throw new Error('Failed to generate submission token')
    if (!token.includes(':')) throw new Error('Token format invalid (should contain quizId)')

    submissionToken = token
    log(`  Generated token: ${token.substring(0, 20)}...`)
  })

  await runTest('Task 2.2: Quiz status changes to collecting', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')
    if (quiz.status !== 'collecting') throw new Error(`Expected status 'collecting', got '${quiz.status}'`)
    if (!quiz.submissionToken) throw new Error('Submission token not stored')
  })

  await runTest('Task 2.3: Lookup quiz by submission token', async () => {
    if (!submissionToken) throw new Error('No submission token')

    const quiz = await store.getQuizBySubmissionToken(submissionToken)
    if (!quiz) throw new Error('Quiz not found by submission token')
    if (quiz.id !== testQuizId) throw new Error('Quiz ID mismatch')
  })

  await runTest('Task 2.4: Add submission (simulated - no Blob upload)', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    // Simulate submission with a fake image URL (in production this would be a Vercel Blob URL)
    const submission = await store.addSubmission(
      testQuizId,
      'Test Person 1',
      'https://example.com/test-image-1.jpg'
    )
    if (!submission) throw new Error('Failed to add submission')
    if (submission.name !== 'Test Person 1') throw new Error('Submission name mismatch')
    log(`  Added submission: ${submission.id} (${submission.name})`)
  })

  await runTest('Task 2.5: Check duplicate name detection', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const hasDuplicate = await store.hasSubmissionName(testQuizId, 'Test Person 1')
    if (!hasDuplicate) throw new Error('Duplicate detection failed - should find existing name')

    const hasNonExistent = await store.hasSubmissionName(testQuizId, 'Non Existent Person')
    if (hasNonExistent) throw new Error('False positive on non-existent name')

    // Case-insensitive check
    const hasCaseInsensitive = await store.hasSubmissionName(testQuizId, 'TEST PERSON 1')
    if (!hasCaseInsensitive) throw new Error('Case-insensitive duplicate check failed')
  })

  await runTest('Task 2.6: Add more submissions for quiz play', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    // Add more submissions to have enough for a proper quiz
    await store.addSubmission(testQuizId, 'Test Person 2', 'https://example.com/test-image-2.jpg')
    await store.addSubmission(testQuizId, 'Test Person 3', 'https://example.com/test-image-3.jpg')
    await store.addSubmission(testQuizId, 'Test Person 4', 'https://example.com/test-image-4.jpg')
    await store.addSubmission(testQuizId, 'Test Person 5', 'https://example.com/test-image-5.jpg')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')
    if (quiz.submissions.length !== 5) throw new Error(`Expected 5 submissions, got ${quiz.submissions.length}`)
    log(`  Total submissions: ${quiz.submissions.length}`)
  })
}

// ============ TASK 3: Close Submissions & Generate Questions ============

async function testCloseSubmissions() {
  await runTest('Task 3.1: Close submissions and generate questions', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.closeSubmissions(testQuizId, '1234')
    if (!quiz) throw new Error('Failed to close submissions')
    if (quiz.status !== 'closed') throw new Error(`Expected status 'closed', got '${quiz.status}'`)
  })

  await runTest('Task 3.2: Questions created from submissions', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')
    if (quiz.questions.length !== 5) throw new Error(`Expected 5 questions, got ${quiz.questions.length}`)

    // Verify questions have correct structure
    for (const q of quiz.questions) {
      if (!q.id) throw new Error('Question missing ID')
      if (!q.imageUrl) throw new Error('Question missing image URL')
      if (!q.answer) throw new Error('Question missing answer')
      if (typeof q.order !== 'number') throw new Error('Question missing order')
    }
    log(`  Questions created: ${quiz.questions.length}`)
  })

  await runTest('Task 3.3: Question image URLs match submissions', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    const submissionUrls = new Set(quiz.submissions.map(s => s.imageUrl))
    const questionUrls = quiz.questions.map(q => q.imageUrl)

    for (const url of questionUrls) {
      if (!submissionUrls.has(url)) {
        throw new Error(`Question URL ${url} not found in submissions`)
      }
    }
  })

  await runTest('Task 3.4: Question answers match submission names', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    const submissionNames = new Set(quiz.submissions.map(s => s.name))

    for (const q of quiz.questions) {
      if (!submissionNames.has(q.answer)) {
        throw new Error(`Question answer "${q.answer}" not found in submissions`)
      }
    }
  })

  await runTest('Task 3.5: Question order is sequential', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    const orders = quiz.questions.map(q => q.order).sort((a, b) => a - b)
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i) {
        throw new Error(`Question order not sequential: expected ${i}, got ${orders[i]}`)
      }
    }
  })
}

// ============ TASK 4: Play Quiz & Submit Answers ============

async function testQuizPlay() {
  await runTest('Task 4.1: Activate quiz for play', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.updateQuizStatus(testQuizId, 'active')
    if (!quiz) throw new Error('Failed to activate quiz')
    if (quiz.status !== 'active') throw new Error(`Expected status 'active', got '${quiz.status}'`)
  })

  await runTest('Task 4.2: Submit answers as first player', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    // Create guesses - all correct answers
    const guesses: Record<string, string> = {}
    for (const q of quiz.questions) {
      guesses[q.id] = q.answer
    }

    const participant = await store.submitAnswers(testQuizId, 'Test Player 1', guesses, 45)
    if (!participant || participant === 'already_completed') throw new Error('Failed to submit answers')
    if (participant.name !== 'Test Player 1') throw new Error('Participant name mismatch')
    if (participant.score !== 5) throw new Error(`Expected score 5, got ${participant.score}`)
    if (participant.total !== 5) throw new Error(`Expected total 5, got ${participant.total}`)
    if (participant.timeTaken !== 45) throw new Error(`Expected timeTaken 45, got ${participant.timeTaken}`)
    if (participant.answers.length !== 5) throw new Error(`Expected 5 answers, got ${participant.answers.length}`)
    log(`  Player 1: ${participant.score}/${participant.total} in ${participant.timeTaken}s`)
  })

  await runTest('Task 4.3: Submit answers as second player (partial correct)', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    // Create guesses - 3 correct, 2 wrong
    const guesses: Record<string, string> = {}
    quiz.questions.forEach((q, i) => {
      guesses[q.id] = i < 3 ? q.answer : 'Wrong Answer'
    })

    const participant = await store.submitAnswers(testQuizId, 'Test Player 2', guesses, 30)
    if (!participant || participant === 'already_completed') throw new Error('Failed to submit answers')
    if (participant.score !== 3) throw new Error(`Expected score 3, got ${participant.score}`)
    log(`  Player 2: ${participant.score}/${participant.total} in ${participant.timeTaken}s`)
  })

  await runTest('Task 4.4: Participant record created', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    if (quiz.participants.length !== 2) {
      throw new Error(`Expected 2 participants, got ${quiz.participants.length}`)
    }
  })

  await runTest('Task 4.5: Get individual participant', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    const participantId = quiz.participants[0].id
    const participant = await store.getParticipant(testQuizId, participantId)
    if (!participant) throw new Error('Participant not found')
    if (participant.answers.length !== 5) throw new Error('Missing answers')
  })
}

// ============ TASK 5: Leaderboard & Results ============

async function testLeaderboard() {
  await runTest('Task 5.1: Get leaderboard', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const leaderboard = await store.getLeaderboard(testQuizId)
    if (leaderboard.length !== 2) throw new Error(`Expected 2 participants, got ${leaderboard.length}`)
  })

  await runTest('Task 5.2: Leaderboard sorted by score (descending)', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const leaderboard = await store.getLeaderboard(testQuizId)

    // Higher score should be first
    if (leaderboard[0].score < leaderboard[1].score) {
      throw new Error(`Leaderboard not sorted by score: ${leaderboard[0].score} < ${leaderboard[1].score}`)
    }

    // Player 1 (score 5) should be first
    if (leaderboard[0].name !== 'Test Player 1') {
      throw new Error(`Expected 'Test Player 1' first, got '${leaderboard[0].name}'`)
    }
  })

  await runTest('Task 5.3: Submit third player with same score, different time', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const quiz = await store.getQuiz(testQuizId)
    if (!quiz) throw new Error('Quiz not found')

    // Same score as Player 1 (5), but faster (30s vs 45s)
    const guesses: Record<string, string> = {}
    for (const q of quiz.questions) {
      guesses[q.id] = q.answer
    }

    const participant = await store.submitAnswers(testQuizId, 'Test Player 3', guesses, 30)
    if (!participant || participant === 'already_completed') throw new Error('Failed to submit answers')
    log(`  Player 3: ${participant.score}/${participant.total} in ${participant.timeTaken}s`)
  })

  await runTest('Task 5.4: Leaderboard sorted by time (ascending) for same score', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const leaderboard = await store.getLeaderboard(testQuizId)

    // Both Player 1 and Player 3 have score 5
    // Player 3 (30s) should be ahead of Player 1 (45s)
    const topTwo = leaderboard.filter(p => p.score === 5)
    if (topTwo.length !== 2) throw new Error(`Expected 2 players with score 5, got ${topTwo.length}`)

    if (topTwo[0].timeTaken! > topTwo[1].timeTaken!) {
      throw new Error(`Time tiebreaker failed: ${topTwo[0].timeTaken}s > ${topTwo[1].timeTaken}s`)
    }

    if (topTwo[0].name !== 'Test Player 3') {
      throw new Error(`Expected 'Test Player 3' first (faster), got '${topTwo[0].name}'`)
    }
    log(`  Leaderboard order: ${leaderboard.map(p => `${p.name}(${p.score}/${p.timeTaken}s)`).join(', ')}`)
  })
}

// ============ TASK 6: Migrated Quiz Playability ============

async function testMigratedQuizzes() {
  await runTest('Task 6.1: Query existing migrated quizzes', async () => {
    // Query database directly to find quizzes that existed before the test quiz
    const existingQuizzes = await db.query.quizzes.findMany({
      limit: 5,
    })

    const migratedQuizzes = existingQuizzes.filter(q => q.id !== testQuizId)

    if (migratedQuizzes.length === 0) {
      log('  No previously migrated quizzes found (this is OK for fresh databases)')
      return
    }

    log(`  Found ${migratedQuizzes.length} migrated quiz(es)`)
    for (const q of migratedQuizzes) {
      log(`    - ${q.title} (${q.code}) - status: ${q.status}`)
    }
  })

  await runTest('Task 6.2: Load migrated quiz with all relations', async () => {
    const existingQuizzes = await db.query.quizzes.findMany({
      limit: 5,
    })

    const migratedQuiz = existingQuizzes.find(q => q.id !== testQuizId)

    if (!migratedQuiz) {
      log('  No migrated quiz to test (skipping)')
      return
    }

    const quiz = await store.getQuiz(migratedQuiz.id)
    if (!quiz) throw new Error('Failed to load migrated quiz')

    log(`  Loaded: ${quiz.title}`)
    log(`    - ${quiz.questions.length} questions`)
    log(`    - ${quiz.submissions.length} submissions`)
    log(`    - ${quiz.participants.length} participants`)
  })
}

// ============ TASK 7: Quiz Deletion ============

async function testQuizDeletion() {
  await runTest('Task 7.1: Delete test quiz', async () => {
    if (!testQuizId) throw new Error('No test quiz created')

    const deleted = await store.deleteQuiz(testQuizId, '1234')
    if (!deleted) throw new Error('Failed to delete quiz')
  })

  await runTest('Task 7.2: Quiz record deleted', async () => {
    if (!testQuizId) throw new Error('No test quiz ID')

    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, testQuizId)
    })
    if (quiz) throw new Error('Quiz record still exists')
  })

  await runTest('Task 7.3: Questions cascade deleted', async () => {
    if (!testQuizId) throw new Error('No test quiz ID')

    const questionList = await db.query.questions.findMany({
      where: eq(questions.quizId, testQuizId)
    })
    if (questionList.length > 0) throw new Error(`${questionList.length} questions still exist`)
  })

  await runTest('Task 7.4: Submissions cascade deleted', async () => {
    if (!testQuizId) throw new Error('No test quiz ID')

    const submissionList = await db.query.submissions.findMany({
      where: eq(submissions.quizId, testQuizId)
    })
    if (submissionList.length > 0) throw new Error(`${submissionList.length} submissions still exist`)
  })

  await runTest('Task 7.5: Participants cascade deleted', async () => {
    if (!testQuizId) throw new Error('No test quiz ID')

    const participantList = await db.query.participants.findMany({
      where: eq(participants.quizId, testQuizId)
    })
    if (participantList.length > 0) throw new Error(`${participantList.length} participants still exist`)
  })
}

// ============ TASK 8: No CDN Stale Reads ============

async function testImmediateConsistency() {
  await runTest('Task 8.1: Rapid create-read cycle', async () => {
    // Create quiz
    const quiz = await store.createQuiz('Consistency Test', 'Testing VER-02', '5678')

    // Immediately read back
    const readQuiz = await store.getQuiz(quiz.id)
    if (!readQuiz) throw new Error('Immediate read failed after create')
    if (readQuiz.title !== 'Consistency Test') throw new Error('Data mismatch')

    // Clean up
    await store.deleteQuiz(quiz.id, '5678')
  })

  await runTest('Task 8.2: Rapid add-read cycle for questions', async () => {
    // Create quiz
    const quiz = await store.createQuiz('Question Consistency', 'Testing VER-02', '5678')

    // Add question
    const question = await store.addQuestion(quiz.id, 'https://example.com/test.jpg', 'Test Answer')
    if (!question) throw new Error('Failed to add question')

    // Immediately read quiz and verify question present
    const readQuiz = await store.getQuiz(quiz.id)
    if (!readQuiz) throw new Error('Quiz not found')
    if (readQuiz.questions.length !== 1) throw new Error('Question not immediately visible')
    if (readQuiz.questions[0].answer !== 'Test Answer') throw new Error('Question data mismatch')

    // Clean up
    await store.deleteQuiz(quiz.id, '5678')
  })

  await runTest('Task 8.3: Rapid status update cycle', async () => {
    // Create quiz and add question (required for closed->active)
    const quiz = await store.createQuiz('Status Consistency', 'Testing VER-02', '5678')
    await store.addQuestion(quiz.id, 'https://example.com/test.jpg', 'Test Answer')

    // Generate submission token (draft -> collecting)
    await store.generateSubmissionToken(quiz.id, '5678')

    // Immediately verify status
    let readQuiz = await store.getQuiz(quiz.id)
    if (!readQuiz) throw new Error('Quiz not found')
    if (readQuiz.status !== 'collecting') throw new Error(`Expected 'collecting', got '${readQuiz.status}'`)

    // Close submissions (collecting -> closed)
    await store.closeSubmissions(quiz.id, '5678')

    readQuiz = await store.getQuiz(quiz.id)
    if (!readQuiz) throw new Error('Quiz not found')
    if (readQuiz.status !== 'closed') throw new Error(`Expected 'closed', got '${readQuiz.status}'`)

    // Activate (closed -> active)
    await store.updateQuizStatus(quiz.id, 'active')

    readQuiz = await store.getQuiz(quiz.id)
    if (!readQuiz) throw new Error('Quiz not found')
    if (readQuiz.status !== 'active') throw new Error(`Expected 'active', got '${readQuiz.status}'`)

    // Clean up
    await store.deleteQuiz(quiz.id, '5678')
  })
}

// ============ Main ============

async function main() {
  console.log('='.repeat(60))
  console.log('Migration Verification Script - Plan 7.3')
  console.log('='.repeat(60))
  console.log('')

  const startTime = Date.now()

  try {
    // Task 1: Quiz Creation
    console.log('\n--- Task 1: Test New Quiz Creation Flow ---')
    await testQuizCreation()

    // Task 2: Submission Flow
    console.log('\n--- Task 2: Test Photo Submission Flow ---')
    await testSubmissionFlow()

    // Task 3: Close Submissions
    console.log('\n--- Task 3: Test Closing Submissions ---')
    await testCloseSubmissions()

    // Task 4: Play Quiz
    console.log('\n--- Task 4: Test Playing Quiz ---')
    await testQuizPlay()

    // Task 5: Leaderboard
    console.log('\n--- Task 5: Test Leaderboard ---')
    await testLeaderboard()

    // Task 6: Migrated Quizzes
    console.log('\n--- Task 6: Test Migrated Quiz Playability ---')
    await testMigratedQuizzes()

    // Task 7: Deletion (run after other tests since it deletes the test quiz)
    console.log('\n--- Task 7: Test Quiz Deletion ---')
    await testQuizDeletion()

    // Task 8: Immediate Consistency
    console.log('\n--- Task 8: Test No CDN Stale Reads (VER-02) ---')
    await testImmediateConsistency()

  } catch (err) {
    logError(`Unexpected error: ${err}`)
  }

  const totalDuration = Date.now() - startTime

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('VERIFICATION SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  console.log(`\nTotal: ${results.length} tests`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Duration: ${totalDuration}ms`)

  if (failed > 0) {
    console.log('\nFailed tests:')
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  - ${r.name}: ${r.error}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  if (failed === 0) {
    console.log('ALL TESTS PASSED - Migration verified successfully!')
    console.log('Requirements satisfied: VER-01, VER-02')
  } else {
    console.log('SOME TESTS FAILED - Review failures above')
    process.exit(1)
  }
  console.log('='.repeat(60))

  process.exit(0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
