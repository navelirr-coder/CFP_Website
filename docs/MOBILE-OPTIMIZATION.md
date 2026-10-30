# Responsive catalogue

Updated 2026-10-30. The site now has six static HTML pages. Cart, checkout, login, tracking and admin pages have been removed.

The shared mobile stylesheet keeps navigation, contact inputs, footer brand/contact rows, homepage nutrition strip and campaign artwork readable on phones. The header has a centered logo and menu; cart/account controls are removed. Form inputs use 16px text and suitable touch targets.

Crunchies and Bites show four numbered small previews with product information revealed underneath on hover or click. The desktop row becomes two columns at 1000px and one column at 600px. Packet controls and Place Order buttons remain visible side by side when details are closed. Nutrition opens with the details and tables wrap within the column. All supplied artwork and nutrient values are retained.

The homepage hero supports finger/pen swipes and mouse drags. Horizontal gestures move and snap slides; vertical scrolling and pinch zoom remain native. Autoplay pauses during the gesture and resumes afterward. `tools/verify-hero-swipe.cjs` covers direction, wraparound, short/vertical rejection, tap safety, cancellation, capture recovery, multiple pointers, arrows/dots and autoplay.

Responsive verification uses local Chromium viewports, not physical iOS or Android devices. No real order, payment or WhatsApp message is submitted. Local changes are separate from GitHub push and GoDaddy deployment.

## Local checks for this revision

Chromium checks covered all six HTML pages, both snack categories, the turmeric category and both turmeric detail routes at 320, 390, 768, 1024 and 1440px (50 route/width combinations). All had no horizontal overflow, broken loaded images or links to removed pages. The shop measured one column on phones, two at 768px and four at 1024/1440px. Category buttons, Going Back, product hover pop animation, legacy snack deep links, mobile menu closing and native contact validation were checked. All eight product-specific WhatsApp URLs target 919960725539. The four frontend verifiers passed.

Packet control and disclosure checks covered Crunchies, Bites and Turmeric at 320, 390, 600, 601, 768, 1001, 1024 and 1440px (24 combinations). All order rows stayed side by side within their columns, with details initially hidden and no horizontal overflow or broken loaded images. Browser interactions verified combined selections across categories, hover reveal/leave, click pinning and Escape. Five frontend verifiers passed. Guidance and selection-status subtext under both headings are removed so the cards move upward.
