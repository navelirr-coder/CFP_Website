# CFP Website Context

Last updated: 2026-10-28 (Asia/Calcutta).

## Repository and current status

- GitHub: https://github.com/navelirr-coder/CFP_Website
- Branch: `main`; local branch tracks `origin/main`.
- Latest website behaviour change before the folder reorganisation: `55ce7fd` (WhatsApp fallback when the backend is unavailable).
- GitHub pushes are separate from deployment to GoDaddy. A successful push does not establish that the live server has pulled or deployed the files.
- `.env` and `node_modules/` are excluded by `.gitignore`. Never commit credentials or private keys.

## Current folder structure

- Frontend/backend reorganisation completed on 2026-10-28; root start commands and serving paths were verified.

- `frontend/` contains all website HTML, CSS, browser JavaScript, images and `assets/`.
- `backend/` contains `src/`, `migrations/`, `tests/`, npm manifests/dependencies, `.env` and `.env.example`.
- `docs/` contains deployment/review notes; `docs/source-documents/` contains the original PDFs and reference folders.
- Root `package.json` forwards start/dev/migration/test/admin-seeding commands to `backend/`. `npm.cmd start` still works from the root or directly inside `backend/`.
- Root `npm.cmd run setup` installs backend dependencies; `npm.cmd run verify:frontend` checks frontend controllers.
- Express serves only `frontend/`; public URLs remain unchanged. Copy only its contents into a static hosting Document Root. Full Node.js deployment must retain the sibling frontend/backend layout.
- Paths in feature descriptions below are relative to `frontend/` for public files and `backend/` for source, migrations and tests unless an explicit folder is given.

## Completed website changes

### Registration documents

- About Us registration cards open matching PDFs in new tabs:
  - GST: `assets/documents/gst-registration.pdf`
  - FSSAI: `assets/documents/fssai-licence.pdf`
  - IEC: `assets/documents/iec-certificate.pdf`
  - MSME: `assets/documents/msme-registration.pdf`
- The former APEDA placeholder was replaced with IEC; MSME was added as the fourth card.
- Original registration PDFs also exist at the `docs/source-documents/`, originally committed separately in `1b9eed3`.

### Product catalogues

- Current downloads are `assets/catalogues/Bites Catalogue_Digital Copy.pdf` and `assets/catalogues/Crunchies catalogue_Digital Copy.pdf`.
- HTML and the registry in `script.js` use these filenames, with spaces URL-encoded.
- Earlier lowercase `bites-catalogue.pdf` and `crunchies-catalogue.pdf` files were removed and replaced. Do not restore stale links to those names.
- Turmeric catalogue remains Coming Soon; no PDF was supplied.

### Contact details, footer and icons

- The contact and WhatsApp number is **+91 9960725539**. WhatsApp links use `https://wa.me/919960725539`.
- The catalogue page includes a direct WhatsApp enquiry button using the same number.
- Footer spelling is **Chaudhari Farm Products**. The name stays on one line; email, phone and location icons use aligned contact rows.
- Login icons on About Us and Catalogues were corrected.

### Shared product information panel

- `shop.html` has one information section below the complete product-card grid.
- Central content: `product-information-data.js`; controller: `product-information.js`; scoped styles: `product-information.css`.
- Eight snack products include approved highlights, descriptions, ingredients and 82 supplied nutrition rows.
- Hover or keyboard focus previews a product until selected. Clicking/tapping a non-interactive card area, Enter or Space pins it; another selection replaces it. Pinned details remain across category changes.
- Existing title links still navigate; cart buttons still purchase. Card designs, image paths/order, hover animations, category IDs, product ordering and cart/checkout code were preserved.
- Jowar Chips remains `c3`; Jowar Chivda remains `c4`; Nutri Millet Bar uses existing slug `millet-nutri-bar` and cart ID `b4`.
- Review `docs/PRODUCT-INFORMATION-REVIEW.md` before publishing nutrition claims: ladoo serving sizes conflict with footnotes, Millet Ladoo serving carbohydrate is supplied as 60.63 g, several cookie serving values are inconsistent, and the Nutri Millet Bar name remains provisional. Values were preserved without recalculation.

## WhatsApp enquiry flow and database

- General contact and turmeric export enquiries share `enquiry-form.js` and `enquiry-form.css`.
- `turmeric-export.js` still prefills export subject/message fields, but no longer replaces submission with an email handler.
- `POST /api/enquiries` validates name, email, subject, message, source and a random request ID, then saves to `customer_enquiries`.
- Schema: `migrations/003_customer_enquiries.sql`; API code: `src/routes/enquiryRoutes.js`, `src/controllers/enquiryController.js`, `src/repositories/enquiryRepository.js`.
- An unchanged retry reuses its request ID, preventing duplicate database rows after a lost response. Different content under an existing ID returns a conflict.
- Successful save opens the prepared WhatsApp message, confirms **enquiry recorded**, and clears the form.
- The visitor still presses Send inside WhatsApp. The user explicitly requested no additional visitor confirmation step on the website.
- A normal WhatsApp chat link cannot confirm sending or delivery. Database status is `submitted`, never an unverified `sent` or `delivered`.
- If the API is unreachable, missing on static hosting, times out after six seconds, or reports a server/database outage, WhatsApp still opens with the enquiry text. The notice states that a website copy could not be saved; the form stays filled for retry.
- Blocked popups have a visible prepared-message link. Validation/rate-limit/reference errors keep the form and show an error.
- The explanatory paragraph beginning "We will record your enquiry, then open WhatsApp..." was removed at the user's request. Raw "Failed to fetch" errors are replaced by the WhatsApp fallback for network failures.
- No enquiry content is stored in browser localStorage/sessionStorage.
- Authenticated staff can retrieve the latest 100 records through `GET /api/admin/enquiries`. Anonymous visitors and customer sessions cannot list them. No admin dashboard tab was added.
- Production enquiry recording refuses the temporary in-memory development database. Persistent PostgreSQL must be configured.
- Detailed deployment and behaviour notes: `docs/ENQUIRY-DEPLOYMENT.md`.

## GoDaddy / cPanel deployment and unresolved issues

- The user connected this GitHub repository through GoDaddy cPanel Git Version Control. The exact repository path, public domain and Document Root have not been provided.
- Static frontend files must be deployed into the domain Document Root, commonly `public_html`, with `index.html` directly inside it. Preserve asset paths and back up an existing site before replacement.
- Keep backend source, environment files, database files and Git metadata outside the static public directory. Preserve the original repository's `.git` directory when copying frontend files.
- There is no `.cpanel.yml` deployment configuration yet.
- The user reported cPanel error 128: `fatal: not a git repository (or any of the parent directories): .git`. Advice was to check the registered Repository Path and hidden `.git`; if missing, clone into a new empty folder outside the live Document Root. The actual cause and repair were not verified.
- HTTPS guidance was provided: install a valid SSL certificate/AutoSSL if available, then enable Force HTTPS Redirect. SSL installation and live HTTPS status have not been verified.
- The user reported "Failed to fetch" from the enquiry form. A local static-host fallback was implemented and verified, but the actual live API connection failure has not been diagnosed because the public URL/server access is unavailable.
- Full functionality requires a running Node.js/Express backend, `/api/*` routing, a persistent PostgreSQL `DATABASE_URL`, production secrets and HTTPS. Copying frontend files alone cannot save enquiries or run authentication/orders.
- Deploy backend changes, from `backend/` run `npm ci` and `npm run migrate`, then start/restart via `npm start` or the hosting process manager. Do not claim the production database has been updated without verifying the live deployment.
- No authenticated SSH session was established; the earlier connection reached the server but authentication failed. Only a public key/path was supplied. A matching private key would be required for SSH changes. No server configuration was changed by the assistant.

## Verification history

- On 2026-10-28 after reorganisation, root `npm.cmd test` passed all six suites, including new frontend/backend routing and private-file checks. Root `npm.cmd run verify:frontend` passed both controller checks. All 95 moved frontend files were byte-for-byte preserved; tracked public assets were also checked against Git history (normalizing text line endings).


- On 2026-10-26, `npm.cmd test` passed all five suites: lifecycle, state machine, security, webhooks and enquiries. Enquiry tests used the in-memory PostgreSQL-compatible development engine, not the production database.
- `node tools/verify-enquiry-form.cjs` passed success/reset, offline/static-host fallback, popup blocking, timeouts, retry IDs, duplicate submits and destination checks after the latest fix.
- `node tools/verify-product-information.cjs` passed product data, interactions and original-card integrity checks. Its baseline includes the replacement catalogue links from `cd309e4`.
- Browser checks covered product information at desktop and 390px width, enquiry save/reset against a local test database, and WhatsApp fallback on a local static-only site. No actual WhatsApp message was sent during QA.
- The 2026-10-26 results are historical; the 2026-10-28 checks above were run for the folder reorganisation.

## Next steps

- Obtain the public website URL, cPanel Repository Path and domain Document Root.
- Confirm the deployed Node.js process, API routing, PostgreSQL connection and migration 003; diagnose the live enquiry API and verify persistent records.
- Verify cPanel Git repair, latest deployment and HTTPS independently of GitHub push status.
- Resolve the documented product nutrition/name discrepancies with the owner before treating them as verified claims.
