# Roadmap — Desk Quiz App

## Current Milestone: v1.3 — Super Admin Dashboard

**Goal:** Add super admin dashboard to view all quizzes system-wide and delete them with Blob cascade.

**Depth:** Quick (aggressive compression)
**Coverage:** 11/11 requirements mapped

---

### Phase 8: Super Admin Dashboard
**Goal:** Super admin can view all quizzes and delete them securely

**Requirements:** AUTH-01, AUTH-02, AUTH-03, LIST-01, LIST-02, LIST-03, LIST-04, MGMT-01, MGMT-02, MGMT-03, MGMT-04

**Dependencies:** None (new feature, uses existing store.deleteQuiz)

**Plans:** 3 plans in 2 waves

**Status:** Planned

Plans:
- [ ] 08-01-PLAN.md — Super admin authentication (AUTH-01, AUTH-02, AUTH-03)
- [ ] 08-02-PLAN.md — Dashboard UI with quiz listing (LIST-01 to LIST-04, MGMT-01)
- [ ] 08-03-PLAN.md — Quiz deletion with confirmation (MGMT-02, MGMT-03, MGMT-04)

**Success criteria:**
1. Super admin can access dashboard by entering correct master PIN from env var
2. Invalid master PIN shows error without revealing any quiz data
3. Super admin session persists across page navigation without re-entering PIN
4. Dashboard displays all quizzes with title, code, status, created date, submission count, and participant count
5. Super admin can navigate to any quiz detail view from dashboard
6. Super admin can delete any quiz with confirmation prompt (bypasses quiz PIN)
7. Quiz deletion removes quiz data from Postgres and cascades to Blob images

---

## Phase Progress

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 8 | Super Admin Dashboard | 11 | Planned (3 plans) |

**Total:** 1 phase, 11 requirements

---

## Requirement Coverage

| REQ-ID | Phase | Description | Status |
|--------|-------|-------------|--------|
| AUTH-01 | 8 | Super admin access via master PIN | Pending |
| AUTH-02 | 8 | Invalid PIN shows error | Pending |
| AUTH-03 | 8 | Session persists | Pending |
| LIST-01 | 8 | Dashboard displays all quizzes | Pending |
| LIST-02 | 8 | Shows title, code, status, date | Pending |
| LIST-03 | 8 | Shows submission count | Pending |
| LIST-04 | 8 | Shows participant count | Pending |
| MGMT-01 | 8 | Navigate to quiz detail | Pending |
| MGMT-02 | 8 | Delete any quiz | Pending |
| MGMT-03 | 8 | Delete confirmation required | Pending |
| MGMT-04 | 8 | Deletion cascades to Blob | Pending |

**Coverage:** 11/11 requirements (100%)

---

## Notes

**Why 1 phase?**
- Small, cohesive feature set (11 requirements)
- Natural flow: authenticate → view dashboard → manage quizzes
- Quick depth setting favors aggressive compression
- All requirements support single user workflow

**Technical leverage:**
- store.deleteQuiz already handles Blob cascade (MGMT-04)
- No new database tables needed
- Session management can use existing Next.js patterns

---

*Last updated: 2026-01-28*
