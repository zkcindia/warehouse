# plan.md

## 1) Objectives
- Deliver an MVP login flow for a Warehouse Management System with **4 roles**: Owner, Warehouse Staff, Data Entry Staff, Verification.
- Use **Email + Password** auth (JWT + bcrypt), **no public signup**.
- Login UX: **role selection landing** → role-specific login form → **role-specific placeholder dashboard**.
- Owner can **create/list/delete staff accounts** (for the 3 staff roles).
- Enforce **session persistence** and **role-based route protection**.
- Modern minimal UI (shadcn/ui + Tailwind).

## 2) Implementation Steps

### Phase 1: POC (Skipped)
- Not required (simple JWT auth + CRUD, no external integrations).

### Phase 2: V1 App Development (Core Login + Roles)
**User stories (V1)**
1. As a visitor, I see a clean landing page with **4 role cards** and can pick my role.
2. As a user, when I select a role I can **log in with email/password** for that role.
3. As a user, if credentials/role mismatch, I see a clear error and can retry.
4. As a logged-in user, I’m redirected to my **role dashboard** and see “Welcome [Role]” + my name + logout.
5. As an Owner, I can **create staff users** for allowed roles.
6. As an Owner, I can **list and delete staff** accounts.
7. As any user, refreshing the page keeps me logged in (JWT persisted).
8. As a staff user, I cannot access Owner routes (403 + redirect).

**Backend (FastAPI + MongoDB)**
- Data model: `users { _id, email, password_hash, full_name, role, created_at, created_by }` (unique index on `email`).
- Roles enum: `OWNER`, `WAREHOUSE`, `DATA_ENTRY`, `VERIFICATION`.
- Security:
  - bcrypt hashing
  - JWT access token containing `sub` (user_id), `role`, `email`, `name`.
  - Dependencies: `get_current_user`, `require_role(OWNER)`.
- Seed on startup: ensure default Owner exists: `owner@warehouse.com / Owner@123`.
- API routes (prefix `/api`):
  - `POST /auth/login` `{email,password,role}` → `{token,user}`
  - `GET /auth/me` → `{user}` (JWT)
  - `POST /owner/staff` (Owner) → create staff `{email,full_name,role,password}`
  - `GET /owner/staff` (Owner) → list staff (exclude Owner)
  - `DELETE /owner/staff/{id}` (Owner) → delete staff
- Error handling: 401 invalid credentials, 403 forbidden role, 409 duplicate email.

**Frontend (React + Router + shadcn/ui + Tailwind)**
- Routes:
  - `/login` (role selection landing)
  - `/login/:role` (login page using selected role)
  - `/dashboard/owner`, `/dashboard/warehouse`, `/dashboard/data-entry`, `/dashboard/verification`
- Components:
  - RoleCard grid (4 cards) with icons + subtle hover.
  - LoginForm (email/password; role locked from route param).
  - AuthProvider: stores `token` + `user`; loads from `localStorage`; calls `/api/auth/me` to validate.
  - ProtectedRoute: checks auth + optional role.
  - DashboardShell: minimal header (app name, user chip, logout).
  - Owner dashboard: “Manage Staff” (create form + staff table + delete).
  - Staff dashboards: welcome placeholder card.
- UX details:
  - Clear inline errors + disabled submit while loading.
  - After logout: clear storage and redirect to `/login`.
  - If user hits `/login/:role` directly: allow; role is preselected.

**Incremental testing during build**
- Backend: verify seed owner, login success/failure, staff CRUD, role enforcement.
- Frontend: verify navigation, persistence on refresh, protected routes.

**End of Phase 2: Run 1 full E2E test pass (testing_agent_v3)**
- Validate all user stories above.

### Phase 3: Stabilization + Hardening
**User stories (stability)**
1. As a user, if my token is expired/invalid, I’m redirected to `/login`.
2. As an Owner, I get confirmation before deleting a staff account.
3. As a user, I see consistent loading states on all protected pages.
4. As a user, I cannot see Owner UI elements unless I’m Owner.
5. As a system, logs show auth failures without leaking sensitive data.

**Tasks**
- Add JWT expiry + refresh handling strategy (simple re-login on expiry for MVP).
- Add UI polish: empty states, confirmation dialogs, better error copy.
- Tighten backend validation (Pydantic schemas, role validation, password rules for staff creation).

**End of Phase 3: Run 1 full E2E test pass (testing_agent_v3)**

### Phase 4: Next Modules (Deferred)
- After approval, add “next pages”: products inbound, inventory, locations, verification workflows, etc.

## 3) Next Actions
- Confirm any naming preferences for roles on UI (e.g., “Verification” vs “Verifier”).
- Implement Phase 2 end-to-end (backend + frontend + seed owner + staff management).
- Run testing_agent_v3 and fix issues until all Phase 2 user stories pass.

## 4) Success Criteria
- Role selection landing with 4 cards works and feels modern/minimal.
- Owner can log in with seeded credentials and manage staff (create/list/delete).
- Staff users can log in only under their role and reach their placeholder dashboard.
- JWT persists across refresh; logout clears session.
- Role-based route protection reliably blocks unauthorized access (no Owner route access for staff).
- E2E tests for Phase 2 and Phase 3 pass.