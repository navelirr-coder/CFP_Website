# WhatsApp enquiries

The contact form and turmeric export enquiries now use one shared controller.
The catalogue page also links to WhatsApp at **+91 9960725539**.

1. The visitor submits name, email, subject and message.
2. `POST /api/enquiries` validates and saves the enquiry to `customer_enquiries`.
3. After the database acknowledges the save, the browser opens a prepared message
   addressed to `919960725539` and clears the form.
4. The visitor presses Send in WhatsApp. There is no website confirmation step.

The website confirms **enquiry recorded**. A WhatsApp chat link cannot establish
that the visitor pressed Send or that the message was delivered. Database status
is therefore `submitted`, never `sent` or `delivered`.

If a popup is blocked, the prepared WhatsApp link remains visible. If the API is
unreachable, missing on static hosting, times out after six seconds, or reports a
database/server outage, the prepared WhatsApp message opens automatically anyway.
The website states that a website copy could not be saved and retains the form
for retry; it does not claim that the enquiry was recorded or sent. Validation,
rate-limit, and reference-conflict errors preserve the form and show the error.
An unchanged retry reuses the same random reference so a lost response does not
create duplicate records. No enquiry content is stored in
browser localStorage or sessionStorage.

## GoDaddy deployment

Copying HTML into `public_html` alone cannot save database records. Deploy the
existing Node.js application with `/api/*` routed to Express, and configure a
persistent PostgreSQL `DATABASE_URL` in `backend/.env`. Set `NODE_ENV=production`, configure the
existing session/JWT secrets, and use HTTPS. From `backend/`, run `npm ci` and `npm run migrate`,
then start or restart the Node.js application with `npm start` (or the hosting
process manager). Migration `003_customer_enquiries.sql` is safe to rerun.

Deploy the contents of `frontend/` (including the contact/catalogue pages and
enquiry scripts/styles) alongside the `backend/` application changes. Express
expects the sibling `frontend/` directory to exist. In production,
the enquiry API returns 503 rather than acknowledging a save to the temporary
in-memory development database. Live deployment has not been performed by this
change; server access and the production database are still required.

## Viewing recorded enquiries

Authenticated staff can request `GET /api/admin/enquiries` using their existing
admin session. It returns the most recent 100 enquiries. Anonymous visitors and
customer sessions cannot list them. The table is also available through the
configured PostgreSQL administration tools. There is no new admin dashboard tab.

## Verification

- `npm test`: includes enquiry persistence, validation, retry deduplication,
  WhatsApp content/number, admin authorization and database failure handling.
- `node tools/verify-enquiry-form.cjs`: exercises browser-controller success,
  popup blocking, errors, timeouts, offline WhatsApp fallback, retry IDs, and duplicate-submit suppression
  using local test doubles; it does not send any real WhatsApp messages.
