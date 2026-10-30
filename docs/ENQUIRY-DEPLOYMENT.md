# Static WhatsApp enquiries and orders

Updated 2026-10-30. The entire backend has been removed.

The contact form validates name, email, subject and message, then opens a prepared chat at https://wa.me/919960725539. It clears after the handoff; a blocked popup leaves the fields intact and displays a prepared fallback link. Following that link clears the form. No extra visitor confirmation is required.

Each Crunchies/Bites card has permanent minus/number/plus packet controls and a Place Order button. Quantities start at zero. An unset product receives one packet when its order button is clicked; all other positive selections are included too. The draft quotes each displayed product name and packet count, numbered in catalogue order across Crunchies and Bites. Selections remain only in page memory and survive category switching. WhatsApp opens directly from a normal link, without an account, cart or checkout.

The visitor presses Send in WhatsApp. The website cannot confirm sending or delivery, and does not save enquiries or orders. Turmeric export forms still prefill subject/message before using the same contact controller.

For local preview run `npm.cmd start` from the repository root and visit http://localhost:5173. This serves static files only. No API/database or dependencies are required.

For GoDaddy deploy the contents of `frontend/`, including .htaccess, into the domain Document Root. Delete old cart, checkout, login, tracking and admin files from the hosting folder when deploying; overwriting existing files alone leaves removed files online. Stop/remove any separately deployed backend through its host. No live deployment or external database deletion is implied by this local change.

Keep HTTPS and a valid SSL certificate enabled.
