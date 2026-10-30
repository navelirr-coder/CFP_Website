# CFP Website Context

Last updated: 2026-10-30 (Asia/Calcutta).

## Current scope

The user requested complete removal of the backend, accounts/login, shopping cart and Add to Cart controls. Checkout, tracking and admin pages were removed with those dependent features. Previous decisions to keep checkout or backend order history are superseded.

The website is now a static product catalogue with WhatsApp enquiries and orders. No database, API calls, customer browser storage, payment gateway, shipment booking or email worker remains. HTTPS redirect rules are retained. The local deletion does not establish that an external service/database or old hosted files were removed.

## Structure and commands

- `frontend/`: six HTML pages (Home, Shop, About, Catalogues, Contact, Product Details), shared CSS/JavaScript, supplied images/fonts, documents and catalogues.
- `tools/`: dependency-free static preview, catalogue content generator and frontend verification scripts.
- `docs/`: content review, preview/deployment and responsive layout notes; original PDFs are preserved in `docs/source-documents/`.
- `npm.cmd start`, `npm.cmd run dev` or `npm.cmd run frontend`: optional static preview at http://localhost:5173. Run from the repository root. Ctrl+C stops it. No install or backend process is needed.
- `npm.cmd run build:catalogue`: regenerate the eight static snack information sections from `frontend/product-information-data.js`.
- `npm.cmd test` / `npm.cmd run verify:frontend`: static boundaries, asset links/served bytes, product information/category behavior, hover/click details and combined packet order drafts, WhatsApp enquiry and hero gesture checks.

## Product presentation

The user's latest layout replaces the earlier stacked-card experiment. Crunchies and Bites each show four individual smaller numbered cards, left to right in the original card order. Card dimensions and layered artwork/pop hover animation are retained. Descriptions, ingredients, highlights, serving sizes and all nutrition rows below each preview start hidden, open on desktop hover, close on pointer leave, and stay open when the image/name is clicked. Name buttons support keyboard activation; Close details and Escape dismiss the information. Deep links open the relevant information. Permanent Place Order links have adjacent minus/number/plus packet controls outside the hidden sections. Guidance and selection-status subtext under both headings are removed; cards start directly beneath the category heading and product count. Desktop uses four columns; tablet two; phone one so all content remains readable.

Original snack order: Ragi Sticks, Bajra Chivda, Jowar Chips, Jowar Chivda; Ragi Ladoo, Millet Ladoo, Millet Cookies, Millet Nutri Bar. All eight supplied data records and 82 nutrition rows are unchanged. Read `docs/PRODUCT-INFORMATION-REVIEW.md` for unresolved serving-size and provisional name discrepancies; do not infer replacement values. Legacy snack product-detail URLs redirect to the relevant catalogue category and detail anchor. Turmeric details retain export descriptions and contact-prefill enquiry actions.

Homepage hero supports horizontal pointer swipes/drags, while vertical scrolling and pinch zoom remain native. Autoplay pauses during gestures and resumes. Hero controls, homepage millet animations and document/catalogue downloads remain.

## Enquiries and orders

All public contact/WhatsApp numbers use +91 9960725539. Snack quantities start at zero, cannot go below zero, and can be typed or changed with plus/minus. Ordering an unset product adds one packet of it. Each order link includes all positive selections from both Crunchies and Bites, numbered in original catalogue order, with quoted displayed product names and packet counts. Quantities survive category switching in page memory but reset on reload; no cart, storage or backend is introduced. Product order links open WhatsApp at 919960725539 with the prepared combined list. The contact form validates its fields and opens a prepared WhatsApp message; it clears on a successful handoff, with a fallback link for blocked popups. There is no visitor confirmation step, automatic sending, delivery verification or database storage. Website status text must not claim a message was sent or stored.

## Documents and catalogues

About registration cards open `assets/documents/gst-registration.pdf`, `fssai-licence.pdf`, `iec-certificate.pdf` and `msme-registration.pdf`. Catalogue files are `assets/catalogues/Bites Catalogue_Digital Copy.pdf` and `Crunchies catalogue_Digital Copy.pdf`. Turmeric catalogue remains unavailable. Preserve the supplied PDFs and artwork. Footer uses Chaudhari, a single-line brand name and aligned email/icon.

## Repository and hosting

GitHub: https://github.com/navelirr-coder/CFP_Website ; branch main tracks origin/main. Changes from this work are local until explicitly committed/pushed. A push is separate from deployment to GoDaddy.

Domain: https://chaudharifarmproducts.com/ ; user-reported plan: GoDaddy Web Hosting Starter. Deploy frontend contents directly into the domain Document Root, commonly public_html, including .htaccess. Remove obsolete hosted cart/checkout/login/track-order/admin files separately; a normal upload does not delete them. Install a valid domain SSL certificate for the HTTPS redirect to work correctly. No authenticated SSH deployment has been established in this session.

Do not commit private keys or credentials. .gitignore still excludes local secrets and dependency/runtime output.
