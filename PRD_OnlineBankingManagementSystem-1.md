# Product Requirements Document (PRD)
## Online Banking Management System (OBMS)

---

| Field | Details |
|---|---|
| **Document Version** | v1.2 |
| **Status** | In Review |
| **Prepared By** | Johan Andrews (KTE24CS076), Roopesh Krishnan (KTE24CS115), Sreya Binoi (KTE24CS129) |
| **Institution** | APJ Abdul Kalam Technological University |
| **Last Updated** | March 30, 2026 |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Objectives](#3-goals--objectives)
4. [Scope](#4-scope)
5. [User Personas & Roles](#5-user-personas--roles)
6. [Functional Requirements](#6-functional-requirements)
   - 6.1 User Management
   - 6.2 Account Management
   - 6.3 Transaction Management
   - 6.4 Beneficiary Management
   - 6.5 Loan Management
   - 6.6 Branch & Employee Management
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Data Model & ER Overview](#8-data-model--er-overview)
9. [System Architecture](#9-system-architecture)
10. [UI/UX Requirements](#10-uiux-requirements)
11. [Security Requirements](#11-security-requirements)
12. [Constraints & Assumptions](#12-constraints--assumptions)
13. [Out of Scope](#13-out-of-scope)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Glossary](#15-glossary)
16. [Revision History](#16-revision-history)

---

## 1. Executive Summary

The **Online Banking Management System (OBMS)** is a web-based relational database application designed to digitize and centralize the core operations of a financial institution. It enables customers to securely manage their bank accounts, perform financial transactions, manage beneficiaries, and monitor loan status — all without needing to visit a physical branch.

The system is built with a **React** frontend and a **Supabase** backend (PostgreSQL), and provides role-specific portals for **Customers**, **Employees**, and **Administrators**. It leverages Supabase's built-in Auth, Row-Level Security (RLS), and real-time capabilities to enforce ACID transaction properties, encrypted authentication, and audit logging — ensuring data integrity and regulatory compliance.

---

## 2. Problem Statement

Traditional banking workflows rely heavily on in-branch visits and manual record keeping, which leads to:

- Slow transaction processing and long queues at branches
- Inconsistent or delayed access to account information
- High administrative overhead for loan tracking and employee management
- Lack of a unified, auditable record of all financial activity
- Security vulnerabilities from inadequate credential and session management

There is a need for a centralized, secure, and efficient digital banking platform that enables customers to self-serve their financial needs while providing administrators and employees with robust management tools.

---

## 3. Goals & Objectives

| # | Goal | Metric / Success Criteria |
|---|------|---------------------------|
| G1 | Enable self-service banking for customers | 100% of core transactions (deposit, withdraw, transfer) available online |
| G2 | Ensure high system availability | 99.9% uptime SLA |
| G3 | Guarantee transactional data integrity | Zero data inconsistency; full ACID compliance |
| G4 | Enforce strong security | All data encrypted; audit logs on every critical event |
| G5 | Support multi-role access control | Distinct dashboards and permissions for Customer, Employee, Admin |
| G6 | Digitize loan lifecycle | End-to-end loan application, approval, EMI scheduling, and reminders |
| G7 | Maintain performance under load | 95% of requests handled in ≤ 2 seconds under 500 concurrent users |

---

## 4. Scope

### In Scope

- Customer registration, authentication, and profile management
- Bank account creation, management, and statement generation
- Deposits, withdrawals, and intra/inter-bank fund transfers
- Beneficiary management (add, edit, delete, transfer limits)
- Loan application, approval workflow, EMI scheduling, and repayment tracking
- Branch and employee records management
- Admin dashboard for account, loan, and employee oversight
- Security: encryption, RBAC, session management, audit logging
- Notifications: email and SMS for transactions and loan reminders

### Out of Scope (v1.1)

- Third-party payment gateway integration (e.g., UPI, Razorpay)
- Mobile native application (iOS/Android)
- Investment or insurance product management
- Advanced AI-driven fraud detection
- Customer support chat or ticketing system

---

## 5. User Personas & Roles

### 5.1 Customer

**Who:** Individuals who hold one or more accounts at the bank.

**Goals:** View account balances, transfer funds, manage beneficiaries, apply for loans, download statements.

**Technical proficiency:** Low to moderate — expects a straightforward, guided web UI.

**Key pain points:** Waiting at branches, delayed transaction confirmations, opaque loan status.

---

### 5.2 Employee (Teller / Bank Staff)

**Who:** Bank staff members who assist customers with account queries and transaction processing.

**Goals:** Access customer account details, support transaction processing, view branch-level reports.

**Technical proficiency:** Moderate — familiar with internal banking tools.

**Key pain points:** Inability to quickly pull up customer records, lack of a centralized view across branches.

---

### 5.3 Administrator

**Who:** Senior bank staff or system managers responsible for system configuration and oversight.

**Goals:** Approve/reject loan applications, freeze/unfreeze accounts, manage employees and branches, view audit logs.

**Technical proficiency:** High — expects detailed controls and audit capabilities.

**Key pain points:** Manual loan approval tracking, no centralized view of overdue accounts or flagged activity.

---

## 6. Functional Requirements

Requirements are labeled `REQ-N`. Priority is marked as **[High]**, **[Medium]**, or **[Low]**. Requirements introduced in v1.1 are marked `(NEW)`.

---

### 6.1 User Management

**Description:** Handles customer self-registration, login authentication, session management, and account security controls.

**Stimulus/Response Flow:**
1. User navigates to the login page and submits username and password.
2. System validates credentials against the database (bcrypt hash comparison).
3. On success → session token issued; user redirected to role-appropriate dashboard.
4. On failure → error displayed; failed attempt counter incremented.
5. After 5 consecutive failures → account locked for 15 minutes.
6. Forgotten password → OTP sent to registered email for reset.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-1 | System shall allow customer self-registration with name, email, phone number, date of birth, gender, and government-issued ID. | High |
| REQ-2 | System shall authenticate users using encrypted credentials and issue session tokens upon successful login. | High |
| REQ-3 (NEW) | System shall lock accounts for 15 minutes after 5 consecutive failed login attempts. | High |
| REQ-4 (NEW) | System shall support password reset via a one-time password (OTP) sent to the registered email address. | High |
| REQ-4A (NEW) | System shall enforce a minimum password length of 8 characters containing at least one uppercase letter, one digit, and one special character. | High |
| REQ-4B (NEW) | System shall log all user login and logout events with IP address and timestamp for audit purposes. | High |
| REQ-4C (NEW) | System shall allow administrators to deactivate or reactivate customer accounts. | Medium |

---

### 6.2 Account Management

**Description:** Manages customer bank accounts, balances, transaction history, and account lifecycle.

**Stimulus/Response Flow:**
1. Customer logs in and selects "View Account".
2. System retrieves and displays account number, type, current balance, and associated branch.
3. Customer may request a mini-statement for the last 10 transactions in PDF format.
4. Customer may initiate a new account opening request by submitting KYC documents.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-5 | System shall display account details including account number, account type, balance, and linked branch. | High |
| REQ-6 | System shall maintain accurate account balances following every transaction with immediate consistency. | High |
| REQ-7 (NEW) | System shall allow customers to download a mini-statement of the last 10 transactions in PDF format. | Medium |
| REQ-7A (NEW) | System shall allow customers to apply for a new savings or current account online by submitting required KYC documents. | Medium |
| REQ-7B (NEW) | System shall allow customers to set up automatic recurring transfers (standing instructions) on a daily, weekly, or monthly schedule. | Medium |
| REQ-7B-1 (NEW) | System shall allow customers to view, modify, pause, or cancel active standing instructions. | Medium |
| REQ-7C (NEW) | System shall allow administrators to freeze or unfreeze a customer account in response to suspicious activity. | High |

---

### 6.3 Transaction Management

**Description:** Handles all financial movements including deposits, withdrawals, intra-bank transfers, and inter-bank transfers. Enforces limits and sends notifications.

**Stimulus/Response Flow:**
1. Customer selects transaction type: Deposit / Withdrawal / Transfer.
2. Customer enters amount and (for transfers) the destination account number.
3. System validates: sufficient balance, daily limit, beneficiary registration, IFSC format.
4. On success → balances updated atomically; transaction recorded with unique ID and timestamp.
5. System sends a real-time SMS/email notification to the customer.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-8 | System shall allow customers to deposit and withdraw funds from their own accounts. | High |
| REQ-9 | System shall allow fund transfers between accounts within the same bank. | High |
| REQ-10 | System shall allow fund transfers to accounts in other banks using IFSC code via NEFT/RTGS. | High |
| REQ-11 | System shall record every transaction with a unique TransactionID, type (Deposit / Withdrawal / Transfer), amount, and timestamp. | High |
| REQ-12 (NEW) | System shall enforce a configurable daily transaction limit per customer account. | High |
| REQ-12A (NEW) | System shall generate a unique transaction reference number for every completed transaction and display it to the customer. | Medium |
| REQ-12B (NEW) | System shall send a real-time SMS or email notification to the customer upon every successful or failed transaction. | High |
| REQ-12C (NEW) | System shall allow customers to schedule a future-dated fund transfer for a target date up to 30 days in advance. | Low |

> **Business Rule:** Fund transfers exceeding ₹1,00,000 in a single transaction require explicit administrator approval before execution.

---

### 6.4 Beneficiary Management

**Description:** Manages saved payee records for quick and repeated fund transfers, with validation and security cooling periods.

**Stimulus/Response Flow:**
1. Customer navigates to "Manage Beneficiaries" → selects "Add Beneficiary".
2. Customer enters payee name, account number, IFSC code, and bank name.
3. System validates account number format and IFSC code.
4. OTP sent to customer to confirm the addition.
5. After confirmation, beneficiary is saved and becomes available for transfers after a 24-hour cooling period.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-13 | System shall allow customers to add, edit, and delete beneficiaries. | High |
| REQ-14 | System shall validate beneficiary account number format and IFSC code before saving. | High |
| REQ-14A (NEW) | System shall allow customers to set a maximum transfer limit per beneficiary per day. | Medium |
| REQ-14B (NEW) | System shall enforce a 24-hour cooling period before a newly added beneficiary can be used for fund transfers. | High |
| REQ-14C (NEW) | System shall display a list of all active beneficiaries with their last transaction date and amount. | Low |

> **Business Rule:** Customers cannot transfer funds to a payee not registered as a beneficiary in the system.

---

### 6.5 Loan Management

**Description:** Manages the full loan lifecycle from customer application through admin approval, EMI schedule generation, repayment tracking, and overdue flagging.

**Stimulus/Response Flow:**
1. Customer submits a loan application specifying loan type, principal amount, and tenure.
2. Admin reviews the application and approves or rejects it.
3. System updates the loan status and sends notification to the customer.
4. On approval → system generates and stores the full EMI repayment schedule.
5. System sends automated reminders 5 days before each EMI due date.
6. On missed payment → system flags the account and notifies the admin.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-15 | System shall allow customers to apply for loans by specifying loan type, principal amount, and tenure. | High |
| REQ-16 | System shall track loan status as one of: Pending / Approved / Rejected / Closed. | High |
| REQ-17 (NEW) | System shall generate and display a complete EMI repayment schedule upon loan approval, including ScheduleID, DueDate, EMIAmount, and PayStatus for each installment. | High |
| REQ-17A (NEW) | System shall allow customers to apply for a loan pre-closure and automatically calculate the applicable pre-closure penalty. | Medium |
| REQ-17B (NEW) | System shall send automated reminders to customers 5 days before each EMI due date via email and SMS. | High |
| REQ-17C (NEW) | System shall flag overdue loan accounts and notify the administrator for follow-up when an EMI payment is missed. | High |

> **Business Rule:** Only administrators can approve or reject loan applications.

---

### 6.6 Branch & Employee Management

**Description:** Maintains records of physical bank branches and staff members, supporting operational management and reporting.

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-18 | System shall store branch records including BranchID, BranchName, Address, and Pincode. | Medium |
| REQ-19 | System shall associate each branch with exactly one managing employee (manager). | Medium |
| REQ-20 | System shall store employee records including EmployeeID, Name, Role, Department, and associated BranchID. | Medium |
| REQ-21 | System shall allow administrators to add, update, or deactivate employee records. | Medium |
| REQ-22 | System shall link each bank account to its home branch via BranchID (foreign key). | High |

---

## 7. Non-Functional Requirements

### 7.1 Performance

- The system shall process 95% of all transactions within **2 seconds** under a normal load of up to 500 concurrent users.
- The system shall support a minimum of **500 simultaneous users** without degradation in response time.
- Database queries on indexed fields (CustomerID, AccountID, TransactionID) shall return results in under **500ms**.

### 7.2 Availability & Reliability

- The system shall achieve **99.9% uptime** with scheduled maintenance windows communicated at least 24 hours in advance.
- A disaster recovery mechanism shall restore full system operation within **4 hours** of a critical failure.
- Automated database backups shall be performed every **24 hours**.

### 7.3 Scalability

- The database schema shall support horizontal scaling to handle growing customer and transaction volumes without structural changes.
- The application shall be deployable on standard cloud infrastructure (e.g., AWS, GCP, Azure).

### 7.4 Maintainability

- The codebase shall adhere to modular design principles to allow independent updating of modules (e.g., loan module, transaction module).
- All database schema changes shall be managed via versioned migration scripts.

### 7.5 Usability

- The web interface shall be accessible on modern browsers (Chrome, Firefox, Edge, Safari) without additional plugins.
- Critical workflows (e.g., fund transfer) shall be completable in **5 or fewer steps**.
- All error messages shall be descriptive and actionable for end users.

---

## 8. Data Model & ER Overview

The system is structured around **8 core entities** organized into 5 logical domains. All entities have been normalized to **Third Normal Form (3NF)**.

### Entity Summary

| Entity | Primary Key | Description |
|--------|-------------|-------------|
| **Customer** | CustomerID | Bank customer with personal details and authentication |
| **Login** | LoginID | Authentication credentials (Username, Password) — separated from Customer for security |
| **Account** | AccountID | Bank account (Savings/Current) linked to a Customer and Branch |
| **Transaction** | TransactionID | Record of every financial movement; includes FromAccountID & ToAccountID |
| **Beneficiary** | BeneficiaryID | Saved payee details for outward fund transfers |
| **Loan** | LoanID | Loan record with type, principal, interest rate, and status |
| **RepaymentSchedule** | ScheduleID | EMI schedule entries linked to a Loan (NEW in v1.1) |
| **Branch** | BranchID | Physical branch location details |
| **Employee** | EmployeeID | Bank staff records linked to a Branch |

### Key Relationships

- **Customer `1 — authenticates — 1` Login:** Each customer has exactly one Login entity.
- **Customer `1 — owns — M` Account:** A customer can hold multiple accounts.
- **Account `N — belongs_to — 1` Branch:** Multiple accounts belong to one branch.
- **Account `1 — records — N` Transaction:** Each account has many transaction records.
- **Transaction includes `FromAccountID` and `ToAccountID`** for transfer traceability (NEW in v1.1).
- **Customer `1 — takes — N` Loan:** A customer may have multiple loans.
- **Loan `1 — has_schedule — N` RepaymentSchedule:** Each loan has multiple EMI schedule entries.
- **Customer `M — transfers_to — N` Beneficiary:** Many-to-many relationship for payee management.
- **Branch `1 — managed_by — 1` Employee:** Each branch has one manager.
- **Employee `N — works_at — 1` Branch:** Multiple employees work at one branch.

---

## 9. System Architecture

### Technology Stack

| Layer | Technology | Details |
|-------|------------|---------|
| **Frontend** | React (v18+) | Component-based SPA; React Router for navigation; Context API or Zustand for state management |
| **UI Library** | Tailwind CSS + shadcn/ui | Utility-first styling with pre-built accessible components |
| **Backend-as-a-Service** | Supabase | Hosted PostgreSQL database, Auth, Storage, Edge Functions, and Realtime |
| **Database** | PostgreSQL (via Supabase) | Fully managed relational DB; normalized to 3NF; ACID-compliant |
| **Authentication** | Supabase Auth | Email/password auth with JWT session tokens; supports OTP via email |
| **Access Control** | Supabase Row-Level Security (RLS) | Fine-grained per-row access policies enforced at the database layer |
| **Real-time** | Supabase Realtime | WebSocket-based live subscriptions for transaction and loan status updates |
| **Storage** | Supabase Storage | PDF statement generation and document uploads (e.g., KYC) |
| **Server-side Logic** | Supabase Edge Functions (Deno) | Scheduled EMI reminders, OTP dispatch, transfer limit enforcement |
| **Communication** | HTTPS (TLS 1.2+) | All traffic encrypted in transit via Supabase's managed infrastructure |
| **Deployment** | Vercel / Netlify (Frontend) + Supabase Cloud (Backend) | Serverless frontend hosting; Supabase handles database and auth infrastructure |

### Frontend Architecture (React)

The React application is structured as a Single Page Application (SPA) with the following key design decisions:

**Routing & Layout**
- `react-router-dom` v6 for declarative routing with protected route wrappers.
- Role-based route guards redirect users to the appropriate dashboard (Customer / Employee / Admin) based on the JWT claims returned by Supabase Auth.
- A shared shell layout component contains the sidebar/navbar; page-level components are lazy-loaded for performance.

**State Management**
- Global auth state managed via React Context + Supabase's `onAuthStateChange` listener.
- Server state (accounts, transactions, loans) managed with **TanStack Query (React Query)** for caching, background refetching, and optimistic updates.
- Local UI state (modals, form steps) managed with `useState` / `useReducer` within components.

**Key Libraries**

| Library | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Supabase client for DB queries, Auth, Storage, and Realtime |
| `react-router-dom` | Client-side routing and protected routes |
| `@tanstack/react-query` | Server state management and data fetching |
| `react-hook-form` + `zod` | Form handling with schema-based validation |
| `recharts` | Charts for transaction history and loan repayment progress |
| `@react-pdf/renderer` | Client-side PDF generation for mini-statements |
| `date-fns` | Date formatting and EMI date calculations |
| `tailwindcss` + `shadcn/ui` | Styling and accessible component primitives |

### Backend Architecture (Supabase)

Supabase serves as the complete backend, replacing a traditional custom server:

**Database (PostgreSQL)**
- All 9 entities from the ER diagram are implemented as PostgreSQL tables.
- Foreign key constraints, check constraints, and triggers enforce referential integrity and business rules at the database level.
- Indexes on frequently queried columns: `customer_id`, `account_id`, `transaction_id`, `loan_id`, `due_date`.

**Authentication (Supabase Auth)**
- Email/password sign-up and sign-in managed by Supabase Auth.
- JWTs contain custom `role` claims (customer / employee / admin) injected via a database trigger on user creation.
- OTP-based email verification used for password reset and beneficiary confirmation.
- Account lockout logic (5 failed attempts → 15-minute lock) implemented via a Supabase Edge Function that intercepts the auth flow.

**Row-Level Security (RLS)**
- RLS policies replace traditional server-side RBAC middleware.
- Example policies:
  - Customers can `SELECT` only rows in `accounts` where `customer_id = auth.uid()`.
  - Only users with `role = 'admin'` can `UPDATE` `loans.status`.
  - Employees can `SELECT` accounts and transactions for their assigned branch only.
- All tables have RLS enabled; no table is left open to anonymous access.

**Edge Functions (Deno)**
- `send-emi-reminder`: Cron-triggered daily; queries `repayment_schedule` for dues within 5 days and dispatches email/SMS via Resend / Twilio.
- `process-transfer`: Validates daily limits, executes atomic balance debit/credit in a PostgreSQL transaction, and inserts the `transactions` record.
- `lock-account`: Called after 5 failed login attempts; sets `is_locked = true` and schedules unlock after 15 minutes.
- `generate-statement`: Fetches last 10 transactions and returns a signed PDF URL from Supabase Storage.

**Realtime Subscriptions**
- The Customer Dashboard subscribes to changes on the `transactions` table filtered by `account_id` — balance and recent activity update live without a page refresh.
- The Admin Dashboard subscribes to `loans` where `status = 'Pending'` to surface new applications in real time.

### Architectural Principles

- **Supabase as Single Backend:** Auth, database, storage, and serverless functions are unified under one platform, eliminating the need for a separately maintained API server.
- **RLS as the Security Layer:** Database-level Row-Level Security enforces access control even if application code has bugs — no data can be accessed outside a user's permitted scope.
- **ACID Compliance via PostgreSQL Transactions:** Fund transfers and balance updates are executed within PostgreSQL transactions using Supabase Edge Functions to guarantee atomicity.
- **Optimistic UI Updates:** React Query's `mutate` with optimistic updates provides instant feedback on transactions while the database confirms in the background.
- **Audit Logging via Database Triggers:** PostgreSQL triggers on sensitive tables (`accounts`, `loans`, `transactions`) automatically insert records into an `audit_log` table with timestamp, user ID, and operation type — no application-layer code required.

### Architecture Diagram (Component Overview)

```
┌─────────────────────────────────────────────────┐
│                  React SPA (Vercel)              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Customer │  │ Employee │  │ Admin          │  │
│  │ Portal   │  │ Portal   │  │ Portal        │  │
│  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │              │               │            │
│  React Query + Supabase JS Client SDK            │
└───────────────────────┬─────────────────────────┘
                        │ HTTPS / WebSocket
┌───────────────────────▼─────────────────────────┐
│               Supabase Platform                  │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │  Auth    │  │ Realtime │  │ Storage        │ │
│  │ (JWT +   │  │ (WS      │  │ (PDF Statements│ │
│  │  OTP)    │  │  feeds)  │  │  KYC Docs)    │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│  ┌──────────────────────────────────────────┐    │
│  │  PostgreSQL Database (RLS Enabled)       │    │
│  │  customers │ accounts │ transactions      │    │
│  │  loans │ repayment_schedule │ beneficiary │    │
│  │  branches │ employees │ audit_log         │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │  Edge Functions (Deno)                   │    │
│  │  process-transfer │ send-emi-reminder     │    │
│  │  lock-account │ generate-statement        │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 10. UI/UX Requirements

### General Principles

- The UI shall be built as a React SPA with a clean, minimal aesthetic using Tailwind CSS and shadcn/ui components.
- Navigation shall use a persistent sidebar (desktop) and a bottom navigation bar (mobile-width) with role-specific menu items rendered based on JWT role claims.
- All financial figures (balances, EMI amounts, transaction totals) shall be formatted in INR (₹) with two decimal places using `Intl.NumberFormat`.
- Dates shall be displayed in `DD-MM-YYYY` format using `date-fns` throughout the interface.
- All data-fetching states (loading, error, empty) shall have dedicated UI feedback — skeleton loaders for loading, toast notifications for errors and successes.
- Forms shall use `react-hook-form` with `zod` schema validation; inline field-level error messages shall appear on blur.
- The fund transfer flow shall be implemented as a multi-step wizard component with progress indicators and a final confirmation screen before submission.

### Key Screens & React Component Notes

| Screen | Role | React Implementation Notes |
|--------|------|---------------------------|
| Login / Register | All | Supabase Auth UI or custom form; `signInWithPassword()` / `signUp()`; redirect on session detection |
| Customer Dashboard | Customer | Summary cards (balance, recent 5 transactions, active loan count); live-updating via Supabase Realtime subscription |
| Account Details | Customer | Tabbed component: Overview / Mini-Statement / Standing Instructions; PDF download via `@react-pdf/renderer` |
| Fund Transfer Wizard | Customer | 4-step wizard: Select Beneficiary → Enter Amount → Review → OTP Confirm; `useReducer` for wizard state |
| Beneficiary Management | Customer | Data table with inline add/edit drawer; 24-hour cooldown badge on newly added entries |
| Loan Application | Customer | Multi-field form with dynamic EMI preview calculated client-side as user types |
| Loan Status & EMI Schedule | Customer | Accordion list of loans; nested table of EMI installments with status badges (Paid / Pending / Overdue) |
| Admin Dashboard | Admin | KPI cards + real-time pending loan counter; flagged accounts list |
| Loan Approval Panel | Admin | Sortable table of pending loans; Approve/Reject buttons trigger Supabase RPC calls |
| Employee Management | Admin | Full CRUD table with modal form for add/edit; branch filter dropdown |
| Audit Log Viewer | Admin | Virtualized table (for performance with large logs); filters by date range, event type, and user ID |

---

## 11. Security Requirements

| Requirement | Detail |
|-------------|--------|
| **Password Hashing** | Managed by Supabase Auth — passwords hashed with bcrypt internally; no plaintext credentials stored |
| **Data in Transit** | All communication encrypted via TLS 1.2+ on Supabase's managed infrastructure |
| **Data at Rest** | Supabase encrypts all data at rest using AES-256; additional column-level encryption applied to sensitive fields (account numbers, PAN) |
| **Session Management** | Supabase Auth issues short-lived JWTs (1-hour expiry) with refresh tokens; automatic session expiry after 10 minutes of inactivity enforced client-side via `onAuthStateChange` |
| **Row-Level Security (RLS)** | All PostgreSQL tables have RLS enabled; policies enforce that users can only read/write their own data; admin-only operations restricted by role claim in JWT |
| **Input Validation** | Client-side validation via `zod` schemas; server-side validation enforced by PostgreSQL check constraints and Edge Function logic |
| **CSRF Protection** | Not applicable for SPA + JWT architecture (no cookie-based sessions); Supabase Auth uses `Authorization: Bearer` headers |
| **Audit Logging** | PostgreSQL triggers on `accounts`, `loans`, `transactions`, and `auth` events write to an `audit_log` table with `user_id`, `operation`, `table_name`, `old_data`, `new_data`, IP (from Edge Function context), and `created_at` |
| **Role-Based Access** | Custom `role` claim injected into JWT via a database trigger on `auth.users` insert; RLS policies and Edge Functions check `auth.jwt() ->> 'role'` |
| **Account Lockout** | Edge Function intercepts repeated failed sign-in attempts; sets `is_locked = true` in `customers` table after 5 failures; auto-unlocks after 15 minutes via a scheduled function |
| **OTP Verification** | Supabase Auth's built-in email OTP used for password reset; custom OTP flow via Edge Function + email provider (Resend) used for beneficiary confirmation |
| **API Key Security** | Only the Supabase `anon` (public) key is exposed in the React client; the `service_role` key is strictly used in Edge Functions server-side and never shipped to the browser |

---

## 12. Constraints & Assumptions

### Constraints

- The frontend must be built with **React (v18+)**; no other frontend frameworks are permitted.
- The backend and database must use **Supabase** (PostgreSQL); the database schema must be normalized to at least **Third Normal Form (3NF)**.
- All financial operations must adhere to **ACID properties**, enforced via PostgreSQL transactions in Supabase Edge Functions.
- Access control must be enforced via **Supabase Row-Level Security (RLS)** at the database layer — RLS cannot be disabled on any table containing user or financial data.
- The Supabase `service_role` key must never be exposed in client-side code; it may only be used within Edge Functions.
- The React application must not store sensitive data (JWT, account numbers) in `localStorage`; session tokens must be managed by the Supabase JS client (which uses `localStorage` with httpOnly cookie fallback depending on config — review Supabase's secure session storage settings).

### Assumptions

- A Supabase project is provisioned on the free or Pro tier with sufficient database and Edge Function quota for the expected user load.
- All users have access to a modern web browser (Chrome, Firefox, Edge, Safari) with JavaScript enabled.
- Email delivery for OTP and EMI reminders is handled via an integrated transactional email provider (e.g., Resend, SendGrid) connected to Supabase Edge Functions.
- SMS notifications are handled via a third-party SMS gateway (e.g., Twilio) called from Edge Functions — SMS provider selection is TBD.
- Government ID validation is limited to format checking on the client; real-time external API validation (e.g., Aadhaar API) is out of scope for v1.2.

---

## 13. Out of Scope

The following features are explicitly deferred to a future version:

- **Third-party payment gateway integration** (UPI, Razorpay, Paytm) for inter-bank transfers
- **Native mobile applications** (iOS/Android)
- **Investment and insurance product management**
- **AI-driven fraud detection and anomaly scoring**
- **Customer support chat or ticketing system**
- **Real-time external ID/IFSC validation APIs** (will use format-only validation in v1.1)
- **Notification module full implementation** — SMS gateway and email provider selection TBD

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data breach due to weak credential storage | Low | Critical | Supabase Auth handles password hashing; AES-256 at rest; TLS in transit; RLS prevents cross-user data access |
| Race condition in concurrent fund transfers | Medium | High | Transfer logic runs inside a PostgreSQL transaction in an Edge Function; uses `SELECT ... FOR UPDATE` to lock account rows before debit/credit |
| Supabase service outage | Low | High | Supabase Pro tier offers 99.9% uptime SLA; implement React Query retry logic; display graceful degradation UI on connection failure |
| RLS misconfiguration exposing data | Medium | Critical | All RLS policies reviewed and tested with Supabase's built-in policy tester; integration tests run as different roles before deployment |
| `service_role` key exposure | Low | Critical | Key stored only in Edge Function environment variables; never referenced in React source code; automated secret scanning in CI |
| SQL injection via Supabase client | Low | High | Supabase JS client uses parameterized queries by default; raw SQL only used in Edge Functions with parameterized `$1, $2` placeholders |
| Unauthorized privilege escalation | Low | Critical | Role claims in JWT set by a server-side trigger, not by the client; RLS policies re-verify `auth.jwt() ->> 'role'` independently |
| Missed EMI reminders due to Edge Function failure | Medium | Medium | Retry logic in scheduled Edge Function; dead-letter logging to `notification_failures` table for admin review |
| React bundle size impacting load time | Medium | Medium | Code splitting via `React.lazy` + `Suspense`; route-level lazy loading; tree shaking via Vite/Webpack |
| Database corruption | Low | Critical | Supabase automated daily backups with point-in-time recovery (PITR) on Pro tier |

---

## 15. Glossary

| Term | Definition |
|------|------------|
| **ACID** | Atomicity, Consistency, Isolation, Durability — properties guaranteeing database transaction reliability |
| **AES** | Advanced Encryption Standard — symmetric encryption algorithm used for data at rest |
| **bcrypt** | A password hashing function designed to be computationally expensive to resist brute-force attacks |
| **CSRF** | Cross-Site Request Forgery — a web attack that tricks a user into submitting unintended requests |
| **DBMS** | Database Management System |
| **Deno** | A modern JavaScript/TypeScript runtime used by Supabase Edge Functions |
| **Edge Function** | A serverless function running close to the user (on the edge); used in Supabase for server-side logic without a dedicated backend server |
| **EMI** | Equated Monthly Installment — a fixed monthly payment for loan repayment |
| **IFSC** | Indian Financial System Code — an alphanumeric code identifying bank branches for electronic transfers |
| **JWT** | JSON Web Token — a compact, signed token used for stateless authentication; Supabase Auth issues JWTs containing user ID and role claims |
| **KYC** | Know Your Customer — the process of verifying the identity of customers |
| **NEFT/RTGS** | National Electronic Funds Transfer / Real-Time Gross Settlement — RBI-operated payment systems for inter-bank transfers |
| **OTP** | One-Time Password — a single-use code for authentication or confirmation |
| **PITR** | Point-in-Time Recovery — Supabase Pro feature allowing database restoration to any specific moment |
| **RBAC** | Role-Based Access Control — restricting system access based on a user's assigned role |
| **React** | A JavaScript library for building component-based user interfaces; used as the frontend framework for OBMS |
| **React Query** | A server-state management library for React (also called TanStack Query); handles data fetching, caching, and synchronization |
| **Realtime** | Supabase feature providing WebSocket-based live database change subscriptions to the React frontend |
| **RLS** | Row-Level Security — a PostgreSQL feature allowing per-row access control policies enforced at the database level |
| **SPA** | Single Page Application — a web app that loads a single HTML page and dynamically updates content using JavaScript |
| **Supabase** | An open-source Backend-as-a-Service platform built on PostgreSQL; provides Auth, Database, Storage, Edge Functions, and Realtime |
| **TLS** | Transport Layer Security — cryptographic protocol for securing data in transit |
| **3NF** | Third Normal Form — a level of database normalization eliminating transitive dependencies |
| **XSS** | Cross-Site Scripting — a web attack injecting malicious scripts into trusted pages |
| **Zod** | A TypeScript-first schema validation library used with `react-hook-form` for form input validation |

---

## 16. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 30, 2026 | Johan Andrews, Roopesh Krishnan, Sreya Binoi | Initial draft |
| 1.1 | March 16, 2026 | Johan Andrews, Roopesh Krishnan, Sreya Binoi | Addressed reviewer feedback: expanded functional, security, and performance requirements; added Stimulus/Response sequences; extracted Login entity; added RepaymentSchedule entity; added FromAccountID & ToAccountID to Transaction; added 18 new requirements (REQ-3 through REQ-17C) |
| 1.2 | March 30, 2026 | Johan Andrews, Roopesh Krishnan, Sreya Binoi | Updated technology stack: replaced generic HTML/CSS/JS frontend with **React (v18+)** and replaced MySQL with **Supabase (PostgreSQL)**; expanded Section 9 with full React component architecture, Supabase backend breakdown (Auth, RLS, Edge Functions, Realtime), library table, and architecture diagram; updated Section 10 with React-specific UI implementation notes; updated Section 11 to reflect Supabase Auth and RLS security model; updated Section 12 constraints to mandate React and Supabase; updated Section 14 risk register with Supabase-specific risks; expanded Glossary with React, Supabase, JWT, RLS, Edge Function, and related terms |

---

*This document is prepared as part of the DBMS Project for APJ Abdul Kalam Technological University. Template based on IEEE Software Requirements Specification format.*
