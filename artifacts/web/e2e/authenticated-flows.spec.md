# Kindue End-to-End Test Plan: Authenticated Flows

This document captures the complete E2E test plan for all authenticated Kindue features.
Tests were verified to pass using the Playwright-based testing subagent.

## Prerequisites

- Clerk authentication enabled (uses `testClerkAuth: true` flag)
- API server running and accessible at `/api`
- Database seeded (or empty — tests create their own data)
- New browser context per test suite to ensure isolation

---

## Suite 1: Sign-In Flow and Dashboard

### Test: User can sign in and see the dashboard

```
1. [New Context] Create a new browser context
2. [Clerk Auth] Sign in as {firstName: "Test", lastName: "User", email: `testuser${nanoid(6)}@example.com`}
3. [Browser] Navigate to / (dashboard)
4. [Verify]
   - Assert a time-based greeting is shown ("Good morning/afternoon/evening, Test")
   - Assert stat cards are visible (Due This Month, Pending Approval, Overdue Bills, High Risk Alerts)
   - Assert the sidebar navigation is visible with links to Bills, Triage, Household, Audit Log
   - Assert no error message is shown to the user
5. [Browser] Navigate to /bills
6. [Verify]
   - Assert the heading "Bills" is shown
   - Assert an "Add Bill" button is visible
   - Assert the page does not show an error
```

**Expected result**: Sign-in succeeds, dashboard renders with greeting and stat cards, navigation is functional.

---

## Suite 2: Household Management

### Test: Create a household and invite a member

```
1. [New Context] Create a new browser context
2. [Clerk Auth] Sign in as {firstName: "Household", lastName: "Tester", email: `htest${nanoid(6)}@example.com`}
3. [Browser] Navigate to /household
4. [Verify]
   - Assert the "Household" heading is shown
   - Assert the "No household yet" empty state is displayed
   - Assert a "Create Household" button is visible
5. [Browser] Click "Create Household"
6. [Verify] Assert a dialog opens with a household name field
7. [Browser] Fill in the household name with "Test Family {nanoid(4)}" (note as household_name)
8. [Browser] Submit the form
9. [Verify]
   - Assert the dialog closes
   - Assert the household name appears as the page heading
10. [Browser] Click "Invite Member"
11. [Verify] Assert a dialog opens with an email and role field
12. [Browser] Fill in email: "invited-{nanoid(4)}@example.com"
13. [Browser] Submit the invite
14. [Verify]
    - Assert a success toast "Invitation sent!" appears
    - Assert the household heading remains visible
```

**Expected result**: Household created successfully, member invitation submitted with success toast.

---

## Suite 3: Bills CRUD

### Test: Create a bill and verify it appears in the list

```
1. [New Context] Create a new browser context
2. [Clerk Auth] Sign in as {firstName: "Bills", lastName: "Tester", email: `billstest${nanoid(6)}@example.com`}
3. [API] POST /api/households with {name: "Bills Test Household"} — note household id
4. [Browser] Navigate to /bills
5. [Verify]
   - Assert "Bills" heading is visible
   - Assert "Add Bill" button is visible
6. [Browser] Click "Add Bill"
7. [Verify] Assert a dialog opens
8. [Browser] Fill in Bill Name: "Electric Bill Test {nanoid(4)}" (note as bill_name)
9. [Browser] Fill in Amount: "150.00"
10. [Browser] Fill in Due Date: "2026-05-15"
11. [Browser] Submit the form
12. [Verify]
    - Assert the dialog closes
    - Assert bill_name appears in the bills list
    - Assert success toast "Bill created" appears
13. [Browser] Click on bill_name to open the detail page
14. [Verify]
    - Assert bill detail page loads (/bills/:id)
    - Assert bill_name appears as the page title
    - Assert a status badge is visible ("Approved" since user is primary_user)
    - Assert "Record Payment" button is visible
```

**Expected result**: Bill created with "Approved" status (as primary_user), appears in list, detail page loads.

---

## Suite 4: Bill Approval and Payment Workflow

### Test: Approve a pending bill, then record payment

```
1. [New Context] Create a new browser context
2. [Clerk Auth] Sign in as {firstName: "ApproveTest", lastName: "User", email: `approveuser${nanoid(6)}@example.com`}
3. [API] POST /api/households with {name: "Approval Flow House"}
4. [API] POST /api/bills with {title: "Gas Bill", amount: 60, due_date: "2026-05-25", category: "Utilities", frequency: "monthly"}
   — note returned bill id (bid)
5. [DB] UPDATE bills SET status = 'pending_approval' WHERE id = {bid}
6. [Browser] Navigate to /bills
7. [Verify]
   - Assert "Gas Bill" appears with "Pending Approval" badge
8. [Browser] Click "Gas Bill"
9. [Verify]
   - Assert title "Gas Bill" is shown
   - Assert "Pending Approval" status badge visible
   - Assert both "Approve" and "Reject" buttons are visible
10. [Browser] Click "Approve"
11. [Browser] If a confirmation dialog appears, confirm it
12. [Verify]
    - Assert toast "Bill approved" appears
    - Assert status badge changes to "Approved"
    - Assert "Record Payment" button is visible
13. [Browser] Click "Record Payment"
14. [Verify] Assert a payment dialog opens
15. [Browser] Submit the payment dialog
16. [Verify]
    - Assert toast "Payment recorded" appears
    - Assert bill status updates to "Paid"
```

**Expected result**: Bill successfully transitions pending_approval → approved → paid.

---

## Suite 5: Risk Triage

### Test: Run triage and verify risk assessment

```
1. [New Context] Create a new browser context
2. [Clerk Auth] Sign in as {firstName: "Triage", lastName: "Auditor", email: `triagetest${nanoid(6)}@example.com`}
3. [API] POST /api/households with {name: "Triage Test House"}
4. [API] POST /api/bills with {title: "Internet Bill", amount: 89.99, due_date: "2026-04-01", category: "Utilities", frequency: "monthly"}
5. [Browser] Navigate to /triage
6. [Verify]
   - Assert "Risk Triage" heading is visible
   - Assert "Run Triage" button is visible
   - Assert high/medium/low risk count cards are visible
7. [Browser] Click "Run Triage"
8. [Verify]
   - Assert toast "Triage complete" appears
   - Assert triage items are displayed (at least 1 high-risk item for the overdue bill)
```

**Expected result**: Triage runs successfully, overdue bill appears as high risk.

---

## Suite 6: Audit Log

### Test: Verify audit log records household actions

```
1. [New Context] Create a new browser context
2. [Clerk Auth] Sign in as {firstName: "Triage", lastName: "Auditor", email: `audituser${nanoid(6)}@example.com`}
3. [API] POST /api/households with {name: "Audit Test House"}
4. [API] POST /api/bills with {title: "Phone Bill", amount: 75, due_date: "2026-06-01", category: "Utilities", frequency: "monthly"}
5. [Browser] Navigate to /audit
6. [Verify]
   - Assert "Audit Log" heading is visible
   - Assert audit entries exist (bill_created, household_created)
   - Assert a search input field is visible
   - Assert entries display actor name and timestamp
```

**Expected result**: Audit log shows all actions taken in the household.

---

## API Contract Reference

### Shortcut Routes (Frontend-facing, household auto-resolved)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/bills` | List all bills for user's household |
| POST | `/api/bills` | Create a bill (fields: title, amount, due_date, category, frequency) |
| GET | `/api/bills/:id` | Get bill detail |
| POST | `/api/bills/:id/approve` | Approve a pending bill |
| POST | `/api/bills/:id/reject` | Reject a pending bill (body: reason) |
| GET | `/api/bills/:id/payments` | Get payment history for a bill |
| POST | `/api/bills/:id/payments` | Record a payment (enforces receipt for caregiver/other roles) |
| GET | `/api/households/mine` | Get user's household |
| GET | `/api/households/mine/members` | List household members |
| POST | `/api/households/mine/members/invite` | Invite a member (body: email, role) |
| GET | `/api/triage` | Get triage items with risk level (high/medium/low) |
| POST | `/api/triage/run` | Run triage (marks overdue bills, logs audit entry) |
| GET | `/api/audit` | Get audit log entries (primary_user/trustee only) |
| GET | `/api/documents` | List documents for user's household |

### Response Field Mapping

Bills responses include normalized aliases for frontend compatibility:
- `title` (alias for `name`)
- `due_date` (alias for `dueDate`)
- `frequency` (alias for `recurrence`)

Triage items format:
```json
{ "id": 1, "bill_id": 1, "risk": "high", "score": 90, "reason": "Bill is overdue",
  "bill": { "id": 1, "title": "...", "amount": 89.99, "status": "overdue" } }
```

Audit log entries format:
```json
{ "id": 1, "action": "bill_created", "description": "Created bill...",
  "created_at": "2026-04-22T...", "actor": { "name": "Test User" } }
```
