# Google Apps Script setup — read before launch

This app is designed for a public one-night event. The Apps Script web app serves the inventory interface and writes to your private Google Sheet. Visitors do not need access to the spreadsheet itself.

## 1. Create the Google Sheet

1. Create a new Google Sheet in your own Google account.
2. Give it a clear name such as `808 Vinyl Giveaway Inventory`.
3. Open **Extensions → Apps Script** from the Sheet. This binds the script to that spreadsheet.
4. In the script editor, replace the contents of `Code.gs` with the provided `Code.gs` file.
5. Click **+** next to Files, choose **HTML**, name the file `Index` (without `.html`), and paste the provided `Index.html` contents.
6. Save the project.

Because the script is bound to the spreadsheet, leave `SPREADSHEET_ID` blank in `CONFIG`. If you instead create a standalone script, paste the Sheet ID between the quotes.

## 2. Create the inventory tabs

1. In Apps Script, choose `setupInventorySheets` from the function dropdown.
2. Click **Run** and approve the requested Google permissions.
3. Return to the Sheet. It should contain `Inventory` and `Checkouts` tabs.
4. In `Inventory`, replace the sample/blank entries with your actual records. Keep the column headers in row 1 unchanged.

### Inventory columns

| Column | What to enter |
|---|---|
| Record ID | Unique ID for each record, e.g. `V001` |
| Artist | Artist or band |
| Album | Album title |
| Genre | Optional |
| Year | Optional |
| Notes | Optional condition/edition notes |
| Status | Leave blank or use `Available`; the app fills `Checked Out` after a successful checkout |
| Claimed By | Leave blank; the app fills this |
| Email | Leave blank; the app fills this |
| Checkout Time | Leave blank; the app fills this |

Every record must have a unique `Record ID`. Do not sort or delete rows during the event while a checkout is being processed. It is fine to add rows before the event. The `Checkouts` tab is the append-only log of successful checkouts.

## 3. Confirm the closeout time

In `Code.gs`, the starter closeout is:

`2026-10-26T03:00:00-05:00`

This means **Monday, October 26, 2026 at 3:00 AM Central Daylight Time**, in Baton Rouge's local time zone. If your event is on a different date, update `EVENT_CLOSE_AT_ISO` before deploying.

The backend checks the time at inventory load and again inside the locked checkout operation, so the closeout is enforced server-side rather than only by the browser.

## 4. Deploy the web app

1. In Apps Script click **Deploy → New deployment**.
2. Click the gear/type selector and choose **Web app**.
3. Set **Execute as** to **Me** (the account that owns the Sheet).
4. Set **Who has access** to **Anyone** if your Google account offers that setting and the event is intended for the public.
5. Click **Deploy** and authorize the script.
6. Copy the web app URL ending in `/exec`. Keep this URL handy.

Google may restrict anonymous public web apps on some account types or organization-managed accounts. If you cannot select public/anonymous access, the public checkout flow will not work as intended until that account restriction is resolved.

## 5. Connect the website

1. Open `completion.html` in the website package.
2. Find the anchor with `id="vinyl-app-link"`.
3. Replace its placeholder `href="https://script.google.com/"` with your deployed `/exec` URL.
4. Upload the static website files to your chosen host. Keep the folder paths unchanged.

The Apps Script inventory app is hosted by Google and linked from the completion page; it is not hosted inside your static website folder.

## 6. Test before the event

Use at least two different phones or browsers:

- Add 3–5 clearly labeled test records to `Inventory`.
- Check out one record in Browser A.
- Confirm it changes to `Checked Out` in the Sheet and becomes unavailable in Browser B after refresh (normally within 10 seconds).
- Try to check it out in Browser B anyway; the server should reject the duplicate.
- Confirm `Checkouts` contains one row with the correct record, name, email, and timestamp.
- Test a made-up future close time in `CONFIG`, verify the closed state, then restore the real close time and redeploy.
- Restore test inventory status and remove test checkout data before opening to the public.

## Privacy and event operations

Names and email addresses are personal information. Keep the Google Sheet private and share it only with people who need it. The public app intentionally does not send claimant names/emails to other visitors. Tell visitors that their contact information is recorded for the event checkout.

This is a lightweight event tool, not a high-availability ticketing platform. Test the deployed app on the actual phones/network you expect to use. For a one-night, modest-size event, the lock-protected Sheet workflow is a practical low-cost option, subject to Apps Script quotas and availability.
