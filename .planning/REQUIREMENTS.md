# Requirements — Milestone v1.1: Submission-Based Quiz Flow

## v1.1 Requirements

### Submission Link
- [x] **SUB-01**: Admin can generate a unique submission link from the admin dashboard
- [x] **SUB-02**: Admin can copy submission link to clipboard with one click
- [x] **SUB-03**: Admin can see how many submissions have been received
- [x] **SUB-04**: Admin can preview individual submissions (name + photo) before closing

### Worker Submission
- [x] **WORK-01**: Worker can visit submission link, enter their name, and upload a desk photo
- [x] **WORK-02**: Worker sees a confirmation page after successful submission
- [x] **WORK-03**: Duplicate names are prevented (worker warned if name already taken)

### State Management
- [x] **STATE-01**: Quiz enforces states: collecting submissions → closed → playable
- [x] **STATE-02**: Admin can close submissions via a button on the admin dashboard
- [x] **STATE-03**: Workers cannot submit after submissions are closed
- [x] **STATE-04**: Players cannot play the quiz until submissions are closed

### Auto-Generation
- [x] **GEN-01**: Questions auto-generate from submissions when admin closes
- [x] **GEN-02**: Each submission becomes one "Whose desk is this?" question with the desk photo
- [x] **GEN-03**: Each question shows 4-5 random name choices including the correct answer

## Future Requirements

- Worker can update/replace their submission before closing
- Admin can reopen submissions after closing

## Out of Scope

- Automatic closing (deadlines/thresholds) — admin button only
- OAuth or user accounts — keep PIN-based auth
- Real-time submission notifications — admin refreshes manually

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SUB-01 | 1 | Complete |
| SUB-02 | 1 | Complete |
| SUB-03 | 2 | Complete |
| SUB-04 | 2 | Complete |
| WORK-01 | 1 | Complete |
| WORK-02 | 1 | Complete |
| WORK-03 | 1 | Complete |
| STATE-01 | 3 | Complete |
| STATE-02 | 3 | Complete |
| STATE-03 | 3 | Complete |
| STATE-04 | 3 | Complete |
| GEN-01 | 4 | Complete |
| GEN-02 | 4 | Complete |
| GEN-03 | 4 | Complete |
