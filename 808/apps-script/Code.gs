/**
 * 808 Scavenger Hunt — Vinyl inventory backend.
 * Event close time is set to Monday, October 26, 2026 at 3:00 AM Central time.
 * Change EVENT_CLOSE_AT_ISO if the event date changes.
 */
const CONFIG = {
  SPREADSHEET_ID: "", // Optional: paste your Google Sheet ID here. Leave blank if script is bound to the sheet.
  TIME_ZONE: "America/Chicago",
  EVENT_CLOSE_AT_ISO: "2026-10-26T03:00:00-05:00",
  INVENTORY_SHEET: "Inventory",
  CHECKOUTS_SHEET: "Checkouts",
  INVENTORY_HEADERS: [
    "Record ID", "Artist", "Album", "Genre", "Year", "Notes",
    "Status", "Claimed By", "Email", "Checkout Time"
  ],
  CHECKOUT_HEADERS: [
    "Checkout ID", "Record ID", "Artist", "Album", "Name", "Email", "Checkout Time"
  ]
};

function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("808 Vinyl Inventory")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSpreadsheet_() {
  if (CONFIG.SPREADSHEET_ID) {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("No spreadsheet connected. Add a spreadsheet ID in CONFIG or bind this script to your inventory sheet.");
  }
  return ss;
}

/**
 * Run once from the script editor to create the required tabs and headers.
 * Existing rows are not cleared.
 */
function setupInventorySheets() {
  const ss = getSpreadsheet_();
  let inventory = ss.getSheetByName(CONFIG.INVENTORY_SHEET);
  if (!inventory) inventory = ss.insertSheet(CONFIG.INVENTORY_SHEET);
  let checkouts = ss.getSheetByName(CONFIG.CHECKOUTS_SHEET);
  if (!checkouts) checkouts = ss.insertSheet(CONFIG.CHECKOUTS_SHEET);

  ensureHeaders_(inventory, CONFIG.INVENTORY_HEADERS);
  ensureHeaders_(checkouts, CONFIG.CHECKOUT_HEADERS);

  inventory.setFrozenRows(1);
  checkouts.setFrozenRows(1);
  inventory.getRange(1, 1, 1, CONFIG.INVENTORY_HEADERS.length).setFontWeight("bold");
  checkouts.getRange(1, 1, 1, CONFIG.CHECKOUT_HEADERS.length).setFontWeight("bold");
  return "Inventory and Checkouts sheets are ready.";
}

function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  if (existing.every(value => !value)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function getEventStatus_() {
  const closeAt = new Date(CONFIG.EVENT_CLOSE_AT_ISO);
  return {
    open: new Date().getTime() < closeAt.getTime(),
    closeAt: Utilities.formatDate(closeAt, CONFIG.TIME_ZONE, "EEE, MMM d 'at' h:mm a"),
    timeZone: CONFIG.TIME_ZONE
  };
}

/**
 * Returns public-safe inventory data only. Personal checkout information is not sent to visitors.
 */
function getInventory() {
  const event = getEventStatus_();
  if (!event.open) {
    return { open: false, closeAt: event.closeAt, timeZone: event.timeZone, records: [] };
  }

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.INVENTORY_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return { open: true, closeAt: event.closeAt, timeZone: event.timeZone, records: [] };
  }

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, CONFIG.INVENTORY_HEADERS.length).getValues();
  const records = values
    .filter(row => String(row[0]).trim() !== "")
    .map(row => ({
      id: String(row[0]),
      artist: String(row[1] || ""),
      album: String(row[2] || ""),
      genre: String(row[3] || ""),
      year: String(row[4] || ""),
      notes: String(row[5] || ""),
      status: String(row[6] || "Available").toLowerCase() === "checked out" ? "checked out" : "available"
    }));

  return { open: true, closeAt: event.closeAt, timeZone: event.timeZone, records: records };
}

/**
 * Claims one record under a script-wide lock, so simultaneous users cannot both claim it.
 */
function checkoutRecord(payload) {
  payload = payload || {};
  const recordId = clean_(payload.recordId, 100);
  const name = clean_(payload.name, 120);
  const email = clean_(payload.email, 254).toLowerCase();

  if (!recordId || !name || !email) {
    return { ok: false, code: "MISSING_FIELDS", message: "Please enter your name and email." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: "INVALID_EMAIL", message: "Please enter a valid email address." };
  }
  if (!getEventStatus_().open) {
    return { ok: false, code: "CLOSED", message: "The vinyl giveaway has ended. Checkouts are closed." };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return { ok: false, code: "BUSY", message: "The inventory is busy right now. Please try again." };
  }

  try {
    // Re-check close time after waiting for the lock.
    if (!getEventStatus_().open) {
      return { ok: false, code: "CLOSED", message: "The vinyl giveaway has ended. Checkouts are closed." };
    }

    const ss = getSpreadsheet_();
    const inventory = ss.getSheetByName(CONFIG.INVENTORY_SHEET);
    const log = ss.getSheetByName(CONFIG.CHECKOUTS_SHEET);
    if (!inventory || !log || inventory.getLastRow() < 2) {
      return { ok: false, code: "NO_INVENTORY", message: "The inventory is not ready yet. Please ask the event host." };
    }

    const values = inventory.getRange(2, 1, inventory.getLastRow() - 1, CONFIG.INVENTORY_HEADERS.length).getValues();
    let rowNumber = -1;
    let selected = null;

    for (let i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim() === recordId) {
        rowNumber = i + 2;
        selected = values[i];
        break;
      }
    }

    if (!selected) {
      return { ok: false, code: "NOT_FOUND", message: "That record could not be found. Refresh the inventory and try again." };
    }
    const status = String(selected[6] || "Available").toLowerCase();
    if (status === "checked out" || status === "unavailable") {
      return { ok: false, code: "TAKEN", message: "Someone just checked out that record. Please choose another available record." };
    }

    const now = new Date();
    const checkoutId = Utilities.getUuid();
    const displayTime = Utilities.formatDate(now, CONFIG.TIME_ZONE, "yyyy-MM-dd HH:mm:ss");

    // Mark inventory first while the lock is held, then append the audit record.
    inventory.getRange(rowNumber, 7, 1, 4).setValues([["Checked Out", name, email, now]]);
    log.appendRow([checkoutId, recordId, String(selected[1] || ""), String(selected[2] || ""), name, email, now]);
    SpreadsheetApp.flush();

    return {
      ok: true,
      checkoutId: checkoutId,
      record: { id: recordId, artist: String(selected[1] || ""), album: String(selected[2] || "") },
      checkedOutAt: displayTime,
      message: "Checkout confirmed. Please take your selected record to the event host."
    };
  } finally {
    lock.releaseLock();
  }
}

function clean_(value, maxLength) {
  return String(value == null ? "" : value)
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}
