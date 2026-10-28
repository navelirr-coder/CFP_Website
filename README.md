# Choudhari Farm Products (CFP) Store Backend & Operations System

In the architecture notes below, `src/`, `migrations/`, and `tests/` are relative
to `backend/`; browser filenames are relative to `frontend/`.

Phase 2 implementation: Production-oriented Node.js, Express, and PostgreSQL backend, operations admin dashboard, and customer order tracking system with Server-Sent Events (SSE).


## Project folders and local commands

- `frontend/`: storefront/admin HTML, CSS, browser JavaScript, images and public assets.
- `backend/`: Express source in `src/`, migrations, tests, npm dependencies and private `.env`.
- `docs/`: deployment/review notes and original source documents.
- `tools/`: frontend verification scripts. `context.md` stays at the project root.

From the project root, run `npm.cmd run setup` for a clean dependency installation,
then `npm.cmd start`. The root package forwards server commands to `backend/`.
Alternatively, run `npm.cmd start` directly inside `backend/`.
The server serves `frontend/` at http://localhost:3000, so browser URLs and image
paths remain unchanged. Backend source and project documentation are not served.
Use `npm.cmd test` for backend tests and `npm.cmd run verify:frontend` for UI logic checks.

For GoDaddy static hosting, copy the **contents of `frontend/`** into the domain's
Document Root. For full functionality, run the Node.js app from `backend/`, keep
`frontend/` alongside it, configure `backend/.env`, and route `/api/*` to Express.
See [enquiry deployment](docs/ENQUIRY-DEPLOYMENT.md) for database requirements.

---

## 1. Architecture Overview

- **Runtime & Web Framework**: Node.js (v20+) with Express.js.
- **Database Architecture**: PostgreSQL relational database with SQL migrations in `migrations/`, foreign keys, constraints, and decimal-safe monetary arithmetic (`src/utils/monetary.js`).
- **Zero-Prerequisite Local Dev & Test Engine**: Supports live PostgreSQL via `pg` (`DATABASE_URL`). When `DATABASE_URL` is empty or during automated testing, automatically runs an embedded PostgreSQL engine (`pg-mem`), allowing tests and local server runs without local Postgres service installation.
- **Admin Dashboard**: Operational web application (`admin.html`, `admin.css`, `admin.js`) featuring database metrics, search, filtering, order timeline, and role-based transition controls (Confirm, Pack, Ship, Cancel, Note, Retry).
- **Customer Tracking & Live Updates**: Customer tracker (`track-order.html`) with 6-stage visual timeline, Server-Sent Events (`/api/orders/:id/events`) for instant live status changes, and a 15-second polling fallback.
- **Transactional Notifications Outbox**: Persistent outbox table (`notifications`), queueing email templates on database transaction commit with bounded retries and exponential backoff.
- **Payment & Logistics Preparation**:
  - Razorpay: Server-side order creation, HMAC SHA256 payment signature verification, webhook signature verification.
  - Shiprocket: Shipping abstraction, AWB/tracking link generation, and courier status mapping.

---

## 2. Directory Structure

```text
CFP_Website/
├── frontend/                    # Public website files (served at /)
│   ├── assets/                  # Catalogues, certifications and other assets
│   ├── index.html
│   ├── admin.html
│   ├── shop.html
│   ├── style.css
│   └── ...                      # Other pages, browser scripts and images
├── backend/
│   ├── .env.example             # Environment template; .env stays private
│   ├── package.json
│   ├── package-lock.json
│   ├── src/                     # Server, routes, repositories and services
│   ├── migrations/              # SQL schema and seeds
│   └── tests/                   # Backend verification suites
├── docs/
│   ├── ENQUIRY-DEPLOYMENT.md
│   ├── PRODUCT-INFORMATION-REVIEW.md
│   └── source-documents/        # Original PDFs and reference folders
├── tools/                       # Frontend verification scripts
├── context.md
├── package.json                 # Convenience commands from the root
└── README.md
```

---

## 3. Getting Started & Installation

### Prerequisites
- Node.js (v18.0.0 or higher)
- Optional: PostgreSQL database server (if connecting to external database)

### Installation
In the project root, run:
```bash
npm.cmd run setup
```
*(On Windows PowerShell, use `npm.cmd`)*

### Environment Setup
Copy the template configuration:
```bash
copy backend\.env.example backend\.env
```
Fill in the placeholders as appropriate for your environment.

---

## 4. Database Setup & Migrations

### Running Migrations
To apply all SQL migrations sequentially against the database:
```bash
npm.cmd run migrate
```
This executes:
1. `001_initial_schema.sql`: Creates `users`, `customer_addresses`, `products`, `orders`, `order_items`, `order_status_history`, `payments`, `shipments`, `notifications`, `admin_users`, and `admin_audit_logs`.
2. `002_seed_products.sql`: Seeds the 12 authentic products with prices, SKUs, and inventory.

---

## 5. Provisioning the Initial Administrator

Administrative accounts cannot be registered through public endpoints. Use the secure CLI command:

```bash
npm.cmd run seed:admin <email> <password> "<Full Name>" <role>
```

Example:
```bash
node backend/src/scripts/createAdmin.js admin@choudharifarmproducts.com CfpAdminSecure2026! "Store Operations Director" super_admin
```

Available roles:
- `super_admin`: Full system privileges, staff management, audit view.
- `order_manager`: View and process orders, confirm, pack, and ship.
- `support`: View customer order timelines and internal communications.

---

## 6. Running the Application

### Development / Production Server
```bash
npm.cmd start
```
By default, the server starts on `http://localhost:3000`.

Access points:
- Storefront Homepage: `http://localhost:3000/index.html`
- Storefront Shop: `http://localhost:3000/shop.html`
- Live Order Tracker: `http://localhost:3000/track-order.html`
- Operations Admin Dashboard: `http://localhost:3000/admin.html`
- Health Check: `http://localhost:3000/api/health`

---

## 7. Running the Automated Test Suite

To execute all automated verification tests:
```bash
npm.cmd test
```

Verification coverage includes:
- **Core Lifecycle**: Customer checkout -> Order creation -> Admin review -> Confirm -> Pack -> Ship with AWB -> Real-time status update -> Reopen state consistency.
- **State Machine Guard**: Rejects illegal jumps (e.g. placed to shipped), rejects duplicate status updates, prevents out-of-stock purchases, and verifies stock restoration upon cancellation.
- **Security & Authorization**: Unauthenticated admin route rejection (401), customer token rejected on admin routes (401/403), tenant isolation (Customer A cannot access Customer B's order), and address limit enforcement (maximum 5 addresses).
- **Webhooks & Idempotency**: Rejection of tampered signatures, verification of valid Razorpay capture signatures, and Shiprocket courier status progression (`OUT FOR DELIVERY` -> `out_for_delivery`).

---

## 8. REST API Reference

### Customer Authentication
- `POST /api/auth/register`: Create customer account (`fullName`, `email`, `password`, `phone`).
- `POST /api/auth/login`: Authenticate customer with email and password.
- `POST /api/auth/logout`: Invalidate session cookie.
- `GET /api/auth/me`: Get current authenticated customer profile.
- `PUT /api/auth/profile`: Update profile name or contact.
- `GET /api/auth/addresses`: List saved delivery addresses (up to 5).
- `POST /api/auth/addresses`: Add new shipping address.
- `PUT /api/auth/addresses/:id`: Update address.
- `DELETE /api/auth/addresses/:id`: Delete address.

### Customer Orders & Tracking
- `POST /api/orders`: Place order (re-calculates prices and inventory from database, supports idempotency key).
- `GET /api/orders`: List order history for authenticated customer.
- `GET /api/orders/:id`: Get order details, item snapshots, timeline, and shipments.
- `GET /api/orders/track`: Public guest tracking (via `token` or `orderNumber` + `phone`).
- `GET /api/orders/:id/events`: Server-Sent Events live status update stream.

### Admin Operations (Protected by Role-Based Authorization)
- `POST /api/admin/login`: Staff authentication.
- `POST /api/admin/logout`: Staff logout.
- `GET /api/admin/me`: Get active staff profile.
- `GET /api/admin/dashboard`: Live operational metrics (awaiting review, packing, dispatch, shipped, delivered, exceptions).
- `GET /api/admin/orders`: List orders with search, filters (fulfillment status, payment status, date range), and pagination.
- `GET /api/admin/orders/:id`: Full operational order detail, timeline, and audit logs.
- `POST /api/admin/orders/:id/confirm`: Validate and confirm order.
- `POST /api/admin/orders/:id/pack`: Validate and mark order packed.
- `POST /api/admin/orders/:id/ship`: Dispatch order with courier name and AWB tracking code.
- `POST /api/admin/orders/:id/cancel`: Cancel order with reason and restore inventory.
- `POST /api/admin/orders/:id/notes`: Add confidential internal note.
- `GET /api/admin/orders/:id/notifications`: View notification outbox records for order.
- `POST /api/admin/notifications/:id/retry`: Re-queue failed notification for immediate delivery.

### Payment & Webhooks
- `POST /api/payments/create-order`: Initialize Razorpay payment reference.
- `POST /api/payments/verify`: Verify HMAC payment signature submitted by browser.
- `POST /api/webhooks/razorpay`: Process verified Razorpay webhook (`payment.captured`, `payment.failed`).
- `POST /api/webhooks/shiprocket`: Process verified Shiprocket tracking webhook.

---

## 9. Integration Setup & Production Deployment

### Razorpay Production Setup
1. Log in to the Razorpay Dashboard.
2. Obtain your **Key ID** and **Key Secret**.
3. In Webhooks settings, create a webhook pointing to `https://yourdomain.com/api/webhooks/razorpay`.
4. Subscribe to `payment.captured`, `payment.failed`, and `order.paid`.
5. Enter a secret key and copy it to `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`.

### Shiprocket Production Setup
1. Log in to the Shiprocket panel.
2. Add API user credentials and copy email/password to `SHIPROCKET_EMAIL` and `SHIPROCKET_PASSWORD`.
3. In Webhook configuration, set the tracking webhook URL to `https://yourdomain.com/api/webhooks/shiprocket`.
4. Copy the webhook token to `SHIPROCKET_WEBHOOK_SECRET` in `backend/.env`.

### Transactional Email Setup
1. Configure your SMTP provider (e.g. AWS SES, Mailgun, SendGrid) in `backend/.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
2. The persistent outbox queue (`notifications` table) automatically processes queued templates and logs delivery attempts.

### Production Security Checklist
- [x] Set `NODE_ENV=production` in environment.
- [x] Generate 64-character random strings for `JWT_SECRET` and `SESSION_SECRET`.
- [x] Set `COOKIE_SECURE=true` when running on HTTPS.
- [x] Configure SSL/TLS reverse proxy (Nginx, Caddy, or Cloudflare) with valid certificate.
- [x] Run automated backup of PostgreSQL database with `pg_dump`.

---

## 10. Database Backup and Restoration

### Backup
```bash
pg_dump -U postgres -d cfp_store -F c -b -v -f cfp_store_backup.dump
```

### Restoration
```bash
pg_restore -U postgres -d cfp_store -v cfp_store_backup.dump
```

---

## 11. Implemented Features & Verification Summary

| Feature Area | Status | Verification Details |
|---|---|---|
| PostgreSQL Schema & Migrations | Complete | Tables, foreign keys, and indexes executed via `migrations/` |
| Authoritative Catalog & Pricing | Complete | Server recalculates line totals; ignores browser-tampered prices |
| Inventory Decrement & Restock | Complete | Atomic inventory decrement on order; full restock on cancellation |
| Order State Machine | Complete | Validates transitions (`placed` -> `confirmed` -> `packed` -> `shipped` -> `delivered`) |
| Role-Based Admin Auth & Security | Complete | Salted bcrypt hashing, JWT HTTP-only cookies, role guards |
| Operations Dashboard UI | Complete | Responsive UI (`admin.html`), real metrics, search, modals |
| Customer Order Tracking | Complete | Stepper timeline (`track-order.html`), privacy masking for addresses |
| Live Updates (SSE + Fallback) | Complete | EventSource connection scoped to order; 15s polling fallback |
| Transactional Outbox & Email | Complete | 10 email templates, retry mechanism with attempt tracking |
| Razorpay Payment Integration | Prepared | Server order creation, HMAC signature verification, webhook handler |
| Shiprocket Shipping Integration | Prepared | Service abstraction, AWB tracking link storage, courier status map |
| Automated Test Suite | Complete | Master test runner (`tests/runAll.js`) passes all test suites |
