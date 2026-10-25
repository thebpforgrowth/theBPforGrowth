# 808 Scavenger Hunt — starter website

This package contains:
- `index.html`: mobile-first plant scavenger hunt with selectable cards.
- `completion.html`: transition page that links to the live vinyl inventory app.
- `css/scavenger-hunt.css`: readable, vertically structured CSS.
- `js/scavenger-hunt.js`: plant card selection, sheen, count, and submit logic.
- `apps-script/Code.gs` and `apps-script/Index.html`: Google Apps Script web app for live record inventory and exclusive checkouts.
- `apps-script/SETUP.md`: setup and deployment instructions.

## Important before publishing

1. Replace `images/808logo.svg` with your actual logo if desired.
2. Edit the plant entries in `index.html` (search for `PLANT CARD DATA`) and add your real plant images under `images/plants/`.
3. Create a Google Sheet and Apps Script project following `apps-script/SETUP.md`.
4. Deploy the Apps Script app and paste its `/exec` URL into `completion.html` in the `VINYL_APP_URL` link.
5. Confirm the event close time in `apps-script/Code.gs`. The starter setting is **Monday, October 26, 2026 at 3:00 AM Central time** (`America/Chicago`), based on the upcoming Monday when this package was prepared. Change it if your event is on a different date.
6. Test two different browsers/phones before the event.

## Hosting

The static website can be hosted on GitHub Pages, Cloudflare Pages, or another static host. The Google Apps Script inventory app is deployed separately and is linked from the completion page.

## How the checkout works

The Apps Script app stores the inventory in a Google Sheet. A script-wide lock protects the critical checkout operation so two people cannot claim the same record at the same time. The inventory list refreshes every 10 seconds while open. A checkout is only considered successful after the server confirms it.

The sheet contains two tabs:
- `Inventory`: `Record ID`, `Artist`, `Album`, `Genre`, `Year`, `Notes`, `Status`, `Claimed By`, `Email`, `Checkout Time`
- `Checkouts`: append-only checkout log

Only enter data you actually have. Sample inventory rows are placeholders and should be replaced before launch.
