# CFP Website Context

Last updated: 2026-10-25 (Asia/Calcutta).

## Repository

- GitHub: https://github.com/navelirr-coder/CFP_Website
- Branch: `main`; local branch tracks `origin/main`.
- Website upload pushed successfully in commit `e580da8df94f554353cd64c9a3214ed02b0eb1e7` (149 files changed), preserving the original repository history.
- All four existing backend test suites passed with `npm.cmd test`: lifecycle, state machine, security, and webhooks.
- `.env` and `node_modules/` are excluded by `.gitignore`.

## GoDaddy / cPanel deployment

- The user reports connecting this GitHub repository through GoDaddy cPanel Git Version Control.
- The exact server repository path, domain, and domain Document Root have not yet been confirmed.
- Connecting the repository does not automatically deploy its contents to the domain Document Root.
- The frontend homepage is `index.html`. For static hosting, it must sit directly in the domain Document Root, commonly `public_html/index.html`.
- The manual deployment procedure discussed is:
  1. Check the domain Document Root under cPanel Domains.
  2. In Git Version Control, manage the repository, use branch `main`, and select Pull or Deploy → Update from Remote.
  3. Back up any existing website before replacing files.
  4. Copy the frontend HTML, CSS, JavaScript, images, and `assets/` into the Document Root, preserving relative paths. Copy the contents rather than nesting the outer repository folder.
  5. Keep `.env`, `.git`, `node_modules/`, `src/`, `tests/`, and `migrations/` outside the public folder.
- The user has not confirmed completing this copy or that the website is live.
- No `.cpanel.yml` deployment configuration has been created. Once the actual server paths are known, configure frontend deployment so Update from Remote followed by Deploy HEAD Commit publishes updates.

## Backend requirements

- The project includes an Express / Node.js backend, started with `npm start` (`node src/server.js`).
- Copying frontend files alone does not run login, checkout, order management, or admin APIs.
- Full deployment requires confirming Node.js hosting support, configuring the running application and domain routing, and setting production environment variables and a persistent PostgreSQL database.
- Keep backend source and configuration outside the static public directory; route API requests to the application.

## SSH access status

- A connection to the user-provided hosting server on port 22 reached the server, but authentication failed with `Permission denied (publickey,password)`.
- No public keys were found in the default local SSH folder during that check.
- The user supplied a public key and a path ending in `id_rsa.pub`; neither supplies the matching private key required for authentication.
- The user was advised to authorize the public key in cPanel SSH Access, download the matching private key, and provide only its local path. Never place private keys or passwords in this repository or chat.
- No authenticated SSH session was established and no server configuration was changed.

## Next steps

- Obtain the cPanel Repository Path and domain Document Root before creating deployment commands.
- Confirm whether the user wants only the static frontend live initially or the complete Node.js application.
- If server configuration is requested, establish authenticated access using the matching private key first.
