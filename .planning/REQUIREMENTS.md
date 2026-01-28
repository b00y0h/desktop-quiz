# Requirements — Desk Quiz App

## Milestone v1.3: Super Admin Dashboard

### Authentication (AUTH)
- [ ] **AUTH-01**: Super admin can access dashboard via master PIN (stored in env var)
- [ ] **AUTH-02**: Invalid master PIN shows error without revealing dashboard
- [ ] **AUTH-03**: Super admin session persists (doesn't require PIN on every action)

### Quiz Listing (LIST)
- [ ] **LIST-01**: Dashboard displays all quizzes in the system
- [ ] **LIST-02**: Each quiz shows title, code, status, and created date
- [ ] **LIST-03**: Each quiz shows submission count
- [ ] **LIST-04**: Each quiz shows participant count

### Quiz Management (MGMT)
- [ ] **MGMT-01**: Super admin can navigate to quiz detail view
- [ ] **MGMT-02**: Super admin can delete any quiz (bypasses individual quiz PIN)
- [ ] **MGMT-03**: Delete confirmation required before removing quiz
- [ ] **MGMT-04**: Quiz deletion cascades to Blob images (already implemented in store, needs super admin path)

---

## Future Requirements (Deferred)

- Edit quiz title/description from super admin
- Create quizzes from super admin dashboard
- Detailed statistics (leaderboard preview, completion rates)
- Bulk delete multiple quizzes

## Out of Scope

- User accounts — master PIN keeps it simple
- Role-based access — single super admin role sufficient
- Audit logging — not needed for this use case

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| LIST-01 | TBD | Pending |
| LIST-02 | TBD | Pending |
| LIST-03 | TBD | Pending |
| LIST-04 | TBD | Pending |
| MGMT-01 | TBD | Pending |
| MGMT-02 | TBD | Pending |
| MGMT-03 | TBD | Pending |
| MGMT-04 | TBD | Pending |
