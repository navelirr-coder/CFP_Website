# Chaudhari Farm Products

A static HTML, CSS and JavaScript product catalogue. Enquiries and product orders open a prepared WhatsApp chat at **+91 9960725539**. Visitors send the message in WhatsApp.

## Local preview

From the repository root, run:

```powershell
npm.cmd start
```

Open http://localhost:5173. `npm.cmd run frontend` and `npm.cmd run dev` run the same optional static preview. Stop it with Ctrl+C. Node.js 22 or later is sufficient; there are no npm dependencies to install.

There is no backend, API, database, account system, cart, checkout, payment integration or admin dashboard. The preview only serves files in `frontend/`. It does not store enquiries or orders.

## Product content

Crunchies and Bites each show four numbered, smaller animated previews in their original order. Descriptions, ingredients, highlights and nutrition tables open on hover or click beneath each preview. Clicking pins details open; the close button or Escape dismisses them. Permanent Place Order buttons and minus/number/plus packet controls sit below every snack card. Desktop uses four columns, tablets two and phones one. Quantities start at zero. Ordering an unset product includes one packet of it. All positive selections from Crunchies and Bites are included in one numbered WhatsApp draft, in catalogue order, with quoted product names and packet counts. Selections last only while the page remains open. There is no guidance or selection-status subtext under the category headings, so the cards begin directly beneath them.

Supplied content is maintained in `frontend/product-information-data.js`. After changing it, regenerate the static sections:

```powershell
npm.cmd run build:catalogue
npm.cmd run verify:frontend
```

No build is needed to host the generated website. See `docs/PRODUCT-INFORMATION-REVIEW.md` for unresolved source discrepancies; supplied nutrient figures are preserved exactly.

## GoDaddy / cPanel deployment

Upload the **contents of `frontend/`**, including `.htaccess`, into the domain's configured Document Root, usually `public_html`. `index.html` must sit directly in that root. Upload HTML, CSS, JavaScript, images, fonts and `assets/` together. Git pull alone does not copy files into the Document Root unless deployment has been configured.

Remove old cart, checkout, login, tracking and admin files from the hosting folder when deploying this version; uploading changed files alone will not delete old files. Remove any separately deployed backend through the hosting service if one exists. This local change does not delete an external database or hosted service.

Keep a valid domain SSL certificate installed. The existing `.htaccess` redirects HTTP to HTTPS. No Node process is needed on GoDaddy to serve these static files.

## Verification

`npm.cmd test` or `npm.cmd run verify:frontend` checks static-only boundaries, local page/asset links, exact served file bytes, removal of obsolete routes, the supplied product content, category filtering, WhatsApp form behavior and hero swipe gestures. Browser responsive checks complement these automated checks.

Repository changes, GitHub pushes and live hosting deployment are separate steps.
