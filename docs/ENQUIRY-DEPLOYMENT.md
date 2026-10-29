# Frontend WhatsApp enquiries

Current scope (2026-10-29): contact and turmeric export enquiries are handled
entirely in `frontend/enquiry-form.js`. They do not use an API, database,
credentials, browser storage, or WhatsApp Business API.

- The form validates name, email, subject and message, then opens a prepared chat
  at `https://wa.me/919960725539` during the user's click.
- The visitor presses Send in WhatsApp. The website says the message is ready,
  without claiming it was sent, delivered, or recorded in a database.
- The form clears when the WhatsApp handoff opens. If popups are blocked, the
  prepared link remains visible and the form clears when that link is used.
- The user explicitly requested no additional visitor confirmation step.
- Turmeric subject/message prefilling remains in `turmeric-export.js`.
- The catalogue page uses the same public WhatsApp number.

## Independent local processes

- `npm.cmd start`: backend APIs only at http://localhost:3000.
- `npm.cmd run frontend`: optional website preview at http://localhost:5173.
- Neither command starts the other. The preview proxies `/api/*` to the backend.
- WhatsApp enquiries work with the backend off. Login, checkout and order history
  require the backend to be started separately.

## Deployment

Copy the contents of `frontend/`, including the updated `enquiry-form.js`, into
the domain Document Root. Enquiries work on static hosting with the backend off.
The backend is still needed for login, account records, checkout and order history.
A persistent PostgreSQL `DATABASE_URL` is required to retain those database
records across restarts; local pg-mem data is temporary.

The former `POST /api/enquiries` and `GET /api/admin/enquiries` routes are no
longer mounted. Existing enquiry rows and migration/source files are preserved;
this change does not delete previously collected records.

## Data and security boundaries

- Password hashes, account authentication, checkout order creation and order
  history remain in the backend.
- Razorpay order creation/verification, Shiprocket booking, email-provider
  credentials and trusted payment/order state must stay server-side. Their live
  provider integrations are still unfinished; frontend-only enquiries do not
  complete those integrations.
- Customer history displays ordered item names and quantities only, grouped by
  order reference. It does not display payment/delivery status or shipping data.
- Customer history is read with the authenticated `GET /api/orders`, no-store
  caching and owner-scoped queries. No local order cache or fabricated history
  is used. Legacy `cfp_orders_*` browser keys are removed on page load.
- Checkout itself remains unchanged apart from removing its local-history copy.
  Order records remain in the backend, including the data checkout and future
  Shiprocket integration require. Do not delete those records based on an
  assumption that the unfinished Shiprocket integration already has them.

## Verification

- `npm test`: checkout/state-machine/security/webhook regressions, retired enquiry
  route checks, server layout, credential hashing and item-only order ownership.
- `npm run verify:frontend`: product-card integrity, pure frontend WhatsApp flow,
  and no-cache/no-storage customer order-history rendering checks.
