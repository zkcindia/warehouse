# plan.md

## 1) Objectives
- Deliver a role-based Warehouse Stock Management System (React + FastAPI + MongoDB) with **5 roles**:
  - **Owner** (view-only dashboard)
  - **Cashier** (log incoming/outgoing courier boxes; drafts → batch save)
  - **Warehouse Staff** (accept/reject couriers; checklist; add items; SOP completion)
  - **Data Entry Staff** (supplier/invoice/tax/HSN/GST/cost details per item)
  - **Verification Staff** (final physical verification; pending full integration)
- Secure **JWT-based authentication** with **RBAC** and protected routes.
- Enforce the **strict workflow sequence**:
  1) Cashier logs courier (drafts/preview → batch save)
  2) Warehouse (View → Accept → Checklist → Item List → Complete SOP [Accept→Data Entry / Reject→Cashier])
  3) Data Entry (financial & tax details)
  4) Verification (physical check) **(to be finalized)**
- Ensure all actions persist to **MongoDB** (no mocked data).

## 2) Implementation Steps

### Phase 1: POC (Skipped)
- Not required.

### Phase 2: V1 App Development (Core Auth + Role Dashboards)
**User stories (V1)**
1. As a visitor, I see a role selection landing page with **5 role cards**.
2. As a user, I can log in with email/password and be routed to my role dashboard.
3. As a user, JWT session persists across refresh; logout clears session.
4. As a system, role-based route protection blocks unauthorized pages.

**Backend (FastAPI + MongoDB)**
- Data model: `users { email, password_hash, full_name, role, created_at, created_by }`.
- JWT token includes `sub`, `role`, `email`, `name`.
- Seed demo users:
  - `owner@warehouse.com / Owner@123`
  - `cashier@warehouse.com / Cashier@123`
  - `warehouse@warehouse.com / Warehouse@123`
  - `dataentry@warehouse.com / DataEntry@123`
  - `verification@warehouse.com / Verify@123`

**Frontend (React + Router + Tailwind/shadcn)**
- Role selection → role login → role dashboards.

**Status**: ✅ Implemented and stable.

### Phase 3: Courier Intake + Warehouse Processing (Cashier + Warehouse)
**User stories (Cashier)**
1. As a Cashier, I can create courier entries **one at a time** into a **Drafts/Preview** list.
2. As a Cashier, I can **edit** preview items until I batch-save.
3. As a Cashier, I can batch-save all drafts to MongoDB.
4. As a Cashier, courier IDs are generated in backend format **`DDMMYY-NN`**.
5. As a Cashier, I can see a **Rejected couriers** section and mark them resolved after fixing.

**User stories (Warehouse)**
1. As Warehouse staff, I see couriers in a **full-width row** layout with progressive actions.
2. As Warehouse staff, I can **Accept** a courier to unlock checklist/items.
3. As Warehouse staff, I can run a **6-step checklist** and track progress.
4. As Warehouse staff, I can add an **item list** via multi-row table with auto-merge logic.
5. As Warehouse staff, I can complete SOP:
   - **Accept** → send to Data Entry
   - **Reject** → require reason and send back to Cashier
6. **New (Completed):** As Warehouse staff, I can **Reject at the initial stage** (next to Accept) with a required reason; this sends the courier back to Cashier automatically.

**Backend additions (Phase 3)**
- Couriers collection: `couriers/parcels` supports fields:
  - core courier details (company, packages, payment, slip photo)
  - workflow flags: `accepted`, `sent_to_data_entry`, `rejected`, `rejected_reason`, timestamps
  - warehouse checklist array
  - items/products array
- Endpoints (existing):
  - `POST /api/couriers/batch` (Cashier)
  - `PATCH /api/couriers/{cid}/accept` (Warehouse)
  - `PATCH /api/couriers/{cid}/checklist` (Warehouse)
  - `POST /api/couriers/{cid}/items/batch` (Warehouse)
  - `PATCH /api/couriers/{cid}/reject` (Warehouse; supports both SOP reject and initial-stage reject)
  - `PATCH /api/couriers/{cid}/resolve` (Cashier)
  - `GET /api/couriers/rejected` (Cashier)

**Frontend additions (Phase 3)**
- Warehouse rows now show **Accept + Reject** when not accepted.
- Reject opens a small **reason dialog** (required) and posts to `/couriers/{cid}/reject`.
- Cashier shows rejected couriers with reason + “Mark resolved”.

**Status**: ✅ Implemented.
- Verified end-to-end via screenshot tool:
  - Warehouse reject → courier shows as rejected
  - Cashier rejected section displays the same courier + reason

### Phase 4: Data Entry Workflow (Financial + Tax)
**User stories (Data Entry Staff)**
1. As Data Entry staff, I see couriers that were sent from Warehouse.
2. As Data Entry staff, I can enter per-item details:
   - Supplier
   - Invoice details
   - Purchase date
   - Transportation / logistics
   - HSN + GST%
   - Cost / pricing fields

**Backend**
- Endpoint:
  - `PATCH /api/couriers/{cid}/items/{item_id}/data-entry`

**Status**: ✅ Implemented.

### Phase 5: Verification Staff Dashboard (Pending)
**Goal**: Finalize Verification dashboard and integrate sequential flow after Data Entry.

**Open questions to confirm**
- When does Verification happen exactly (after Data Entry vs parallel)?
- Verification checklist scope:
  - per-courier approve/reject vs per-item verification
- On rejection from Verification, which role receives it back (Warehouse vs Data Entry vs chooser)?

**Planned tasks**
- Add “Ready for verification” state on courier after Data Entry completion.
- Build Verification dashboard list + detail modal:
  - show courier + items + entered financial/tax details
  - physical check fields (qty match, damage, remarks)
  - Approve → finalize
  - Reject → route back with reason
- Add relevant backend endpoints and DB fields.

**Status**: ⏳ Not started / needs requirement confirmation.

### Phase 6: Stabilization + Hardening (Ongoing)
- Refactor backend: split `server.py` into routers/models/services as file grows.
- Improve validations and error handling.
- Add consistent loading/empty states and better toast messages.
- Run an end-to-end regression pass after Verification integration.

## 3) Next Actions
1. **User verify** the new Warehouse initial-stage **Reject** button behavior and UI.
2. Confirm **Verification workflow requirements**:
   - trigger condition (after Data Entry)
   - approve/reject rules and routing target on rejection
3. Implement Phase 5 (Verification) based on confirmed rules.
4. (Optional) Add Owner analytics improvements after Verification is complete.

## 4) Success Criteria
- JWT auth + RBAC works across all 5 roles.
- Cashier can draft → batch save; IDs are `DDMMYY-NN`.
- Warehouse progressive flow works:
  - Accept unlocks steps
  - **Initial-stage Reject** and SOP Reject both send courier back to Cashier with reason
- Data Entry can add supplier/invoice/tax/HSN/GST/cost details per item.
- Verification dashboard is implemented and the full sequence Cashier → Warehouse → Data Entry → Verification is enforced.
- No mocked data; everything persists to MongoDB.
