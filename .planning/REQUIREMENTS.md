# Requirements — Milestone v1.1: Submission-Based Quiz Flow

## v1.1 Requirements

### Submission Link
- [ ] **SUB-01**: Admin can generate a unique submission link from the admin dashboard
- [ ] **SUB-02**: Admin can copy submission link to clipboard with one click
- [ ] **SUB-03**: Admin can see how many submissions have been received
- [ ] **SUB-04**: Admin can preview individual submissions (name + photo) before closing

### Worker Submission
- [ ] **WORK-01**: Worker can visit submission link, enter their name, and upload a desk photo
- [ ] **WORK-02**: Worker sees a confirmation page after successful submission
- [ ] **WORK-03**: Duplicate names are prevented (worker warned if name already taken)

### State Management
- [ ] **STATE-01**: Quiz enforces states: collecting submissions → closed → playable
- [ ] **STATE-02**: Admin can close submissions via a button on the admin dashboard
- [ ] **STATE-03**: Workers cannot submit after submissions are closed
- [ ] **STATE-04**: Players cannot play the quiz until submissions are closed

### Auto-Generation
- [ ] **GEN-01**: Questions auto-generate from submissions when admin closes
- [ ] **GEN-02**: Each submission becomes one "Whose desk is this?" question with the desk photo
- [ ] **GEN-03**: Each question shows 4-5 random name choices including the correct answer

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
| SUB-01 | 1 | Pending |
| SUB-02 | 1 | Pending |
| SUB-03 | 2 | Pending |
| SUB-04 | 2 | Pending |
| WORK-01 | 1 | Pending |
| WORK-02 | 1 | Pending |
| WORK-03 | 1 | Pending |
| STATE-01 | 3 | Pending |
| STATE-02 | 3 | Pending |
| STATE-03 | 3 | Pending |
| STATE-04 | 3 | Pending |
| GEN-01 | 4 | Pending |
| GEN-02 | 4 | Pending |
| GEN-03 | 4 | Pending |
