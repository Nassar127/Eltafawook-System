<div align="center">

# Eltafawook Academy Management System

**A full-stack academy management platform for El-Tafawook Academy — managing bookshop operations, student registration, inventory, reservations, sales, kindergarten admissions, and WhatsApp notifications across multiple branches.**

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#license)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
  - [Backend Features](#backend-features)
  - [Frontend Features](#frontend-features)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Scripts & Utilities](#scripts--utilities)
- [Testing](#testing)
- [License](#license)

---

## Overview

Eltafawook Academy Management System is an internal operations platform built to streamline the daily workflows of El-Tafawook Academy — an educational centre in Egypt with multiple branches (Banha, Qaliub). The system handles:

- **Bookshop operations**: Item/book catalogue, inventory ledger, reservations with hold windows, order fulfillment, sales tracking, and inter-branch stock transfers.
- **Student management**: Registration with Egyptian phone validation, school association, search by name/phone/public ID.
- **Kindergarten module**: A full KG student admissions pipeline (public application form, admin review with accept/reject/waitlist), KG-specific items, sales, inventory, and subscription tracking.
- **Financial reporting**: Daily sales totals split by payment method (cash/Vodafone Cash/InstaPay), profit calculations, revenue adjustments, and detailed teacher-level breakdowns.
- **Notifications**: WhatsApp Web integration for "book ready" pickup notifications via an outbox queue pattern with retry logic.
- **Internationalization**: Full English/Arabic UI with RTL support.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│                  Frontend                     │
│    React 19 + Vite + styled-components        │
│    i18next (EN/AR) · JWT auth · SPA           │
│         (eltafawook-admin/)                   │
└────────────────────┬─────────────────────────┘
                     │ REST / JSON
┌────────────────────▼─────────────────────────┐
│                  Backend                      │
│    FastAPI + SQLAlchemy 2.0 (sync)            │
│    Alembic migrations · JWT (HS256)           │
│    APScheduler background worker              │
│         (backend/app/)                        │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│              PostgreSQL 16                    │
│    UUID PKs · TSTZRANGE hold windows          │
│    pg_advisory locks · inventory_view         │
│    30 Alembic migration versions              │
│         (Docker via docker-compose)           │
└──────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Component       | Technology                                  |
|-----------------|---------------------------------------------|
| Framework       | **FastAPI** (Python 3.11+)                  |
| ORM             | **SQLAlchemy 2.0** (sync, mapped columns)   |
| Database        | **PostgreSQL 16** (via Docker)              |
| Migrations      | **Alembic** (30 migration versions)         |
| Auth            | **JWT** (python-jose, bcrypt via passlib)   |
| Background Jobs | **APScheduler** + custom worker loop        |
| Notifications   | **WhatsApp Web** (pywhatkit + pyautogui)    |
| Server          | **Uvicorn** / **Gunicorn**                  |

### Frontend
| Component       | Technology                                  |
|-----------------|---------------------------------------------|
| Framework       | **React 19** (Vite dev server)              |
| Routing         | **React Router DOM 7**                      |
| Styling         | **styled-components** (CSS-in-JS)           |
| i18n            | **i18next** (EN/AR with browser detection)  |
| Auth            | **jwt-decode** (client-side token parsing)  |

### Infrastructure
| Component       | Technology                                  |
|-----------------|---------------------------------------------|
| Containerization| **Docker Compose** (PostgreSQL service)     |
| Deployment      | **Self-hosted** (backend), **Netlify** (frontend)|
| Build           | **Makefile** targets                        |

---

## Project Structure

```
Eltafawook-System/
├── backend/
│   └── app/
│       ├── main.py                  # FastAPI app entry point
│       ├── api/
│       │   └── v1/
│       │       ├── router.py        # Central API router (15+ sub-routers)
│       │       ├── auth.py          # JWT login + get_current_user dependency
│       │       ├── students.py      # Student CRUD + search
│       │       ├── reservations.py  # Full reservation lifecycle
│       │       ├── orders.py        # Quick-sale orders
│       │       ├── items.py         # Item/book catalogue management
│       │       ├── inventory.py     # Stock summary endpoints
│       │       ├── adjustments.py   # Stock receive/adjust + revenue adjustments
│       │       ├── transfers.py     # Inter-branch stock transfer (admin only)
│       │       ├── reports.py       # Financial & inventory reports
│       │       ├── sync.py          # Batch operations endpoint
│       │       ├── uploads.py       # File upload (payment proofs)
│       │       ├── schools.py       # School CRUD
│       │       ├── teachers.py      # Teacher CRUD
│       │       ├── branches.py      # Branch management
│       │       ├── public.py        # Public KG application endpoint
│       │       ├── kg_students.py   # KG student management (auth required)
│       │       ├── kg_items.py      # KG item catalogue
│       │       ├── kg_sales.py      # KG sales recording
│       │       ├── kg_inventory.py  # KG inventory management
│       │       ├── kg_reports.py    # KG financial & subscription reports
│       │       └── notifications/   # WhatsApp notification endpoints
│       ├── models/                  # 18 SQLAlchemy ORM models
│       │   ├── student.py           # Student (with Egyptian phone constraints)
│       │   ├── user.py              # User (admin / branch staff roles)
│       │   ├── reservation.py       # Reservation (TSTZRANGE hold windows)
│       │   ├── order.py             # Order + OrderLine
│       │   ├── sale.py              # Sale (revenue records)
│       │   ├── item.py              # Item/book (SKU, price, teacher FK)
│       │   ├── branch.py            # Branch (with closing time config)
│       │   ├── school.py            # School reference data
│       │   ├── teacher.py           # Teacher reference data
│       │   ├── ledger.py            # StockLedger (immutable event log)
│       │   ├── notify.py            # NotifyOutbox (WA message queue)
│       │   ├── adjustment.py        # Stock adjustments
│       │   ├── op_log.py            # Operation audit log (JSONB)
│       │   ├── kg_student.py        # Kindergarten student (35+ fields)
│       │   ├── kg_items.py          # KG items (goods + service types)
│       │   ├── kg_sale.py           # KG sales
│       │   ├── kg_inventory_ledger.py # KG inventory events
│       │   └── revenue_adjustment.py  # Revenue adjustments (bookstore/KG)
│       ├── schemas/                 # 21 Pydantic v2 request/response schemas
│       ├── services/                # Business logic layer
│       │   ├── reservation_service.py  # 636-line reservation lifecycle engine
│       │   ├── inventory_service.py    # Stock ledger, receive, adjust, transfer
│       │   ├── report_service.py       # Sales reports, inventory snapshots
│       │   ├── student_service.py      # Student creation with school auto-create
│       │   ├── order_service.py        # Quick-sale order creation
│       │   ├── transfer_service.py     # Inter-branch stock transfer
│       │   ├── kg_student_service.py   # KG student CRUD + age calculation
│       │   ├── kg_report_service.py    # KG sales & subscription reports
│       │   ├── kg_sale_service.py      # KG sale recording
│       │   ├── kg_inventory_service.py # KG inventory operations
│       │   └── notify/
│       │       ├── outbox_service.py     # WA outbox queue + drain worker
│       │       └── whatsapp_pywhatkit.py # WhatsApp Web browser automation
│       ├── workers/
│       │   ├── scheduler.py         # APScheduler (expire reservations every 1 min)
│       │   ├── loop.py              # Standalone worker loop (expire + WA drain)
│       │   └── jobs/
│       │       └── expire_reservations.py
│       ├── core/
│       │   ├── config.py            # Pydantic settings (env-based config)
│       │   └── security.py          # JWT + bcrypt password hashing
│       ├── db/
│       │   ├── base.py              # SQLAlchemy DeclarativeBase
│       │   ├── session.py           # Engine + SessionLocal factory
│       │   └── migrations/          # Alembic (30 migration versions)
│       └── utils/
│           ├── validators.py        # Phone normalization
│           └── phone.py             # Egyptian E.164 phone conversion
│
├── eltafawook-admin/                # React SPA (admin dashboard)
│   ├── src/
│   │   ├── App.jsx                  # Root app with auth, routing, branch switching
│   │   ├── main.jsx                 # React Router setup (admin + /apply public route)
│   │   ├── i18n.js                  # i18next config (EN/AR)
│   │   ├── api/
│   │   │   └── index.jsx            # API client (fetch wrapper, student search, WA enqueue)
│   │   ├── views/
│   │   │   ├── Login.jsx            # Login page (styled, remember me, show/hide password)
│   │   │   ├── Students.jsx         # Student registration & search
│   │   │   ├── Orders.jsx           # Order/reservation management (1700 lines)
│   │   │   ├── Items.jsx            # Item catalogue management
│   │   │   ├── Reports.jsx          # Financial reports dashboard
│   │   │   ├── Transfers.jsx        # Inter-branch stock transfer (admin)
│   │   │   ├── Teachers.jsx         # Teacher management (admin)
│   │   │   ├── Settings.jsx         # WhatsApp template settings
│   │   │   ├── KgStudents.jsx       # KG student management
│   │   │   ├── KgItems.jsx          # KG item catalogue
│   │   │   ├── KgOrders.jsx         # KG order/sale recording
│   │   │   ├── KgReports.jsx        # KG financial & subscription reports
│   │   │   └── KgApplicationForm.jsx # Public KG application form (no auth)
│   │   ├── components/              # Reusable styled-components
│   │   │   ├── Layout.jsx           # AppShell, Header, Container (dark/light)
│   │   │   ├── Button.jsx, Card.jsx, Form.jsx, Table.jsx
│   │   │   ├── Icons.jsx            # SVG icon components
│   │   │   └── Misc.jsx             # NavGrid, Pills, Tabs, Toasts, Dropdown
│   │   ├── hooks/
│   │   │   └── useToast.jsx         # Toast notification hook
│   │   └── utils/
│   │       ├── helpers.jsx          # Phone normalization, money formatting, etc.
│   │       ├── settings.jsx         # WhatsApp template storage (localStorage)
│   │       └── dates.jsx            # Date parsing utilities
│   └── public/
│       └── locales/                 # EN/AR translation JSON files
│
├── scripts/
│   ├── create_user.py               # CLI to create admin user
│   ├── demo_reservation_flow.ps1    # PowerShell demo for reservation API
│   └── reserve_flow.ps1             # PowerShell reservation flow test
│
├── infra/
│   └── dev/
│       └── postgres-init.sql        # DB init (extensions, roles, inventory_view)
│
├── Centre Data/                     # Excel/Access data files (student databases)
├── Courses/                         # Course content (41 items)
├── docker-compose.yml               # PostgreSQL 16 service
├── Makefile                         # Dev shortcuts (db-up, db-down, db-reset, run-backend)
├── alembic.ini                      # Alembic migration config
├── requirements.txt                 # Python dependencies
├── seed_students.py                 # Bulk student CSV import script
├── add_missing_schools.py           # School data migration script
└── LICENCE                          # Proprietary license
```

---

## Features

### Backend Features

#### Authentication & Authorization
- JWT-based authentication (HS256, 8-hour expiry)
- Role-based access control: `admin`, `banha_staff`, `qaliub_staff`
- Branch-scoped access — staff can only access their assigned branch
- OAuth2 password flow with Bearer token
- `get_current_active_user` dependency for protected endpoints

#### Student Management
- Full CRUD with phone validation (Egyptian E.164 format `+20XXXXXXXXXX`)
- Dual phone fields: student phone + parent phone with normalized search
- Auto-incrementing `public_id` for easy in-person identification
- School auto-creation if not existing
- Search by name (fuzzy), phone, parent phone, or public ID
- Gender, grade (1-3), section (science/math/literature), branch assignment

#### Inventory & Stock Ledger
- **Immutable event-sourced stock ledger** — every stock change is recorded as an event
- Event types: `receive`, `adjust`, `reserve_hold`, `reserve_release`, `allocate`, `ship`, `return`, `transfer_out`, `transfer_in`, `expire`
- `on_hand` = sum of all physical stock events
- `reserved` = sum of active/hold reservation quantities
- `available` = `on_hand` - `reserved`
- PostgreSQL `inventory_view` (materialized via SQL) for fast queries
- Stock adjustments with mandatory non-zero delta and reason tracking

#### Reservation System (Core Business Logic)
- Full lifecycle: `queued` → `hold` → `active` → `fulfilled` / `cancelled` / `expired`
- PostgreSQL `TSTZRANGE` for reservation hold windows
- `pg_advisory_xact_lock` for atomic stock reservation (no double-booking)
- Automatic queue-to-active promotion when stock arrives
- Prepayment tracking with payment method (cash/vodafone_cash/instapay)
- Payment proof file upload
- Fulfillment creates a `Sale` record + ships stock from ledger
- Unfulfill (reversal) support — rolls back sale and restocks
- Duplicate detection (same student + item + branch = reuse existing)
- Auto-expiration via background scheduler (every 1 minute)

#### Orders & Sales
- Quick-sale for walk-in purchases (no reservation)
- Order + OrderLine structure for multi-item orders
- Sales tracked per-branch with payment method breakdown
- Returns disabled by policy (HTTP 405)

#### Inter-Branch Transfers (Admin Only)
- Transfer stock between branches with double-entry ledger events
- Validates available stock before transfer
- Role-restricted to admin users

#### Financial Reports
- **Daily Sales**: Total by payment method (cash/vodafone/instapay), profit calculation
- **Detailed Sales**: Grouped by teacher → item → grade → payment method
- **Branch Inventory**: Full snapshot with on-hand/reserved/available per item
- **Daily Activity**: Aggregated stock events per branch per day
- **Revenue Adjustments**: Manual corrections with positive/negative amounts
- Timezone-aware (Africa/Cairo) for accurate daily boundaries

#### Kindergarten Module
- Separate data model (35+ fields per KG student)
- Public application form (no auth required) at `/apply`
- Application pipeline: `pending` → `accepted` / `rejected` / `waitlisted`
- Age calculation at October 1st (Egyptian school year standard)
- KG-specific items with types: `good`, `service`, `morning_service`, `evening_service`
- KG inventory ledger (independent of bookshop)
- KG sales recording and financial reports
- **Subscription tracking**: Automatically determines next payment date based on plan type (weekly/bi-weekly/monthly/hosting)

#### Notifications
- WhatsApp Web integration via `pywhatkit` + `pyautogui`
- Outbox pattern with retry logic (max 2 attempts)
- Background worker drains pending messages
- Notification queued on reservation "mark ready"
- Fallback: if direct send fails, enqueue to outbox for later

#### Batch/Sync API
- `/api/v1/sync/batch` for executing multiple operations in one request
- Supports: `reservation.create`, `reservation.prepay`, `reservation.mark_ready`, `reservation.cancel`, `reservation.fulfill`
- Each operation returns individual success/failure

### Frontend Features

#### General UI/UX
- **Dark/Light theme** toggle with custom background images
- **Arabic/English** language switching (RTL support)
- Responsive grid navigation (5-col → 3-col → 2-col)
- Sticky header with branch indicator and admin badge
- Toast notification system (success/error)
- Hamburger dropdown menu

#### Login Page
- Styled login with background image
- Show/hide password toggle
- "Remember me" (localStorage vs sessionStorage)
- Error handling with translated messages

#### Bookshop Module (Main View)
- **Students**: Register, search (name/phone/ID), edit, WhatsApp group link generation per gender
- **Orders**: Multi-tab interface (Order, Reserve, Receive, Delete, Review)
  - Cart system for multi-item orders
  - Reservation creation with deposit
  - Payment proof upload
  - Fulfillment and cancellation
  - Today's orders view with aggregation
- **Items**: Catalogue management with teacher association, price editing, inventory display
- **Transfers**: Admin-only inter-branch stock transfer with item picker
- **Reports**: Date-range reports with payment breakdown and revenue adjustment management

#### Kindergarten Module (QAL Branch Only)
- **KG Students**: Full registration, search, status management (accept/reject/waitlist), detailed student cards
- **KG Orders**: Sale recording against KG students and items
- **KG Items**: Item catalogue with service type management
- **KG Reports**: Daily sales, detailed item breakdown, subscription status tracker

#### Public Application Form (`/apply`)
- Unauthenticated KG application form
- Multi-section: student info, parent/guardian details, health, transport, authorized pickups
- Auto age calculation
- Pre-submission information display
- Bilingual (AR/EN)

---

## Database Schema

### Core Entities (18 Models)

| Model                | Table                  | Description                              |
|----------------------|------------------------|------------------------------------------|
| `User`               | `users`                | Auth users (admin/staff roles)           |
| `Branch`             | `branches`             | Academy branches (BAN, QAL)              |
| `Student`            | `students`             | Registered students (grades 1-3)         |
| `School`             | `schools`              | Student school references                |
| `Teacher`            | `teachers`             | Teacher/subject reference                |
| `Item`               | `items`                | Books/resources (SKU, price, teacher FK) |
| `Reservation`        | `reservations`         | Book reservations with TSTZRANGE windows |
| `Order`              | `orders`               | Walk-in purchase orders                  |
| `OrderLine`          | `order_lines`          | Order line items                         |
| `Sale`               | `sales`                | Revenue records from fulfillments        |
| `StockLedger`        | `stock_ledger`         | Immutable inventory event log            |
| `Adjustment`         | `adjustments`          | Manual stock adjustments                 |
| `RevenueAdjustment`  | `revenue_adjustments`  | Manual revenue corrections               |
| `NotifyOutbox`       | `notification_outbox`  | WhatsApp message queue                   |
| `OpLog`              | `op_log`               | Operation audit log (JSONB)              |
| `KgStudent`          | `kg_students`          | Kindergarten applicants (35+ fields)     |
| `KgItem`             | `kg_items`             | KG-specific items & services             |
| `KgSale`             | `kg_sales`             | KG sales records                         |
| `KgInventoryLedger`  | `kg_inventory_ledger`  | KG stock event log                       |

### Key Database Features
- **UUID primary keys** everywhere (`gen_random_uuid()`)
- **PostgreSQL TSTZRANGE** for reservation hold windows
- **Check constraints**: Egyptian phone regex, grade 1-3, non-zero adjustments
- **Immutable ledger pattern**: Stock changes are append-only events
- **`pg_advisory_xact_lock`**: Prevents race conditions in stock reservation
- **`inventory_view`**: SQL view for computed on-hand/reserved/available
- **30 Alembic migrations**: Full schema evolution history

---

## API Reference

All endpoints are prefixed with `/api/v1`.

| Prefix             | Tag            | Description                         | Auth     |
|--------------------|----------------|-------------------------------------|----------|
| `/auth`            | auth           | JWT login                           | Public   |
| `/students`        | students       | Student CRUD + search               | Mixed    |
| `/reservations`    | reservations   | Full reservation lifecycle          | Mixed    |
| `/orders`          | orders         | Quick-sale orders                   | Mixed    |
| `/items`           | items          | Item catalogue                      | Mixed    |
| `/inventory`       | inventory      | Stock summary queries               | Auth     |
| `/adjustments`     | adjustments    | Stock receive/adjust + revenue adj. | Mixed    |
| `/transfers`       | transfers      | Inter-branch transfer               | Admin    |
| `/reports`         | reports        | Financial & inventory reports       | Auth     |
| `/branches`        | branches       | Branch listing                      | Mixed    |
| `/schools`         | schools        | School CRUD                         | Mixed    |
| `/teachers`        | teachers       | Teacher CRUD                        | Mixed    |
| `/sync`            | sync           | Batch operations                    | Mixed    |
| `/notifications`   | notifications  | WhatsApp enqueue                    | Mixed    |
| `/uploads`         | uploads        | File upload (payment proofs)        | Mixed    |
| `/kg-students`     | kindergarten   | KG student management               | Auth     |
| `/kg-items`        | kindergarten   | KG item catalogue                   | Auth     |
| `/kg-sales`        | kindergarten   | KG sales recording                  | Auth     |
| `/kg-inventory`    | kindergarten   | KG inventory                        | Auth     |
| `/kg-reports`      | kindergarten   | KG reports + subscriptions          | Auth     |
| `/public`          | public         | Public KG application submit        | Public   |
| `/healthz`         | —              | Health check                        | Public   |

---

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (with npm)
- **Docker** (for PostgreSQL)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Eltafawook-System
   ```

2. **Set up Python environment**
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/Mac
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd eltafawook-admin
   npm install
   cd ..
   ```

### Database Setup

1. **Start PostgreSQL via Docker**
   ```bash
   make db-up
   # or: docker compose up -d db
   ```

2. **Run Alembic migrations**
   ```bash
   alembic upgrade head
   ```

3. **Create an admin user**
   ```bash
   python scripts/create_user.py
   ```

4. **(Optional) Seed student data**
   ```bash
   python seed_students.py
   ```

### Running the Application

1. **Start the backend**
   ```bash
   make run-backend
   # or: uvicorn backend.app.main:app --reload
   ```
   Backend runs on `http://localhost:8000`

2. **Start the frontend**
   ```bash
   cd eltafawook-admin
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

3. **(Optional) Start the background worker**
   ```bash
   python -m backend.app.workers.loop
   ```

---

## Environment Variables

Create a `.env` file in the project root:

| Variable              | Default                                          | Description                              |
|-----------------------|--------------------------------------------------|------------------------------------------|
| `APP_ENV`             | `dev`                                            | Application environment                  |
| `DATABASE_URL`        | `postgresql+psycopg://app:app@localhost:5432/app`| PostgreSQL connection string             |
| `JWT_SECRET`          | `dev-secret-change-me`                           | JWT signing secret (**change in prod**)  |
| `TZ`                  | `Africa/Cairo`                                   | Application timezone                     |
| `WA_PYWHATKIT_ENABLED`| `false`                                         | Enable WhatsApp Web sending              |
| `WA_QUEUE_ALWAYS`     | `1`                                              | Always queue WA messages to outbox       |
| `MEDIA_ROOT`          | `var/uploads`                                    | File upload storage directory            |

---

## Scripts & Utilities

| Script                             | Purpose                                           |
|------------------------------------|---------------------------------------------------|
| `scripts/create_user.py`           | Interactive CLI to create an admin user            |
| `scripts/demo_reservation_flow.ps1`| PowerShell script demonstrating reservation API    |
| `scripts/reserve_flow.ps1`         | PowerShell script for full reservation flow test   |
| `seed_students.py`                 | Bulk import students from `backend/students.csv`   |
| `add_missing_schools.py`           | One-time migration to add missing school records   |

**Makefile targets:**
| Target         | Command                              |
|----------------|--------------------------------------|
| `db-up`        | Start PostgreSQL container            |
| `db-down`      | Stop PostgreSQL container             |
| `db-reset`     | Destroy & recreate PostgreSQL volume  |
| `run-backend`  | Start FastAPI with hot reload         |
| `test`         | Run pytest                            |

---

## Testing

### Backend Tests

Run all backend tests (unit + integration):

```bash
python -m pytest backend/tests/ -v
```

- **Unit tests** for core services: `reservation_service`, `inventory_service`, `order_service`, `transfer_service`
- **API integration tests** using `TestClient`: auth guards, structured errors, admin-only routes, pagination validation
- Tests use mocked DB sessions — no live PostgreSQL required

### Frontend Tests

Run all frontend tests:

```bash
cd eltafawook-admin
npm test
```

- **Vitest** + **React Testing Library** + **jsdom**
- Component tests: `StudentSearch`, `Dashboard`, `Export`
- Store tests: `useAppStore` (Zustand)
- Pure function tests: `enrichReservation`, constants

---

## License

Copyright (c) 2025 El-Tafawook Academy. All rights reserved.

Unauthorized copying of this file, via any medium, is strictly prohibited. Proprietary and confidential.