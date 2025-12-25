# Superjoin 2-Way Sync Engine (Aiven MySQL ↔ Google Sheets)

## Live Links
- **Testable Dashboard:** https://superjoin-sync.onrender.com
- **Google Sheet:** https://docs.google.com/spreadsheets/d/1hvSiwhmryb7A9aXXEU0lpyW_0rGdRL_K_GnR1Tr0yuI/edit?gid=0#gid=0

---

## How to Test the Sync

### 1. Google Sheet ➡️ Database
1. Open the **Google Sheet** provided above.
2. Edit any cell (e.g., change the Label or Value).
3. Open the **Dashboard Link**. 
4. **Result:** The change appears (via Real-time Webhooks).

### 2. Database ➡️ Google Sheet (Automated Polling)
1. Since the Database is private, I have provided a **Dashboard** to simulate DB changes.
2. **Wait Time:** Please allow **30 seconds** for the change to reflect in the Google Sheet.
3. **Why the wait?** This delay is a deliberate production choice to prevent "Race Conditions" and respect Google API Rate Limits.

---

## Technical Architecture & Decisions

I implemented a **Hybrid Synchronization Architecture** to balance real-time responsiveness with system stability.



### 1. Sheet to DB: Event-Driven Webhooks
- **Mechanism:** Google Apps Script `onEdit` trigger ➡️ Node.js Express Webhook ➡️ MySQL Upsert logic.
- **Why:** Webhooks provide sub-second latency for human-triggered events.

### 2. DB to Sheet: Buffered Polling
- **Mechanism:** A background Node.js worker queries MySQL every 30 seconds and batches updates to the Google Sheets API.
- **Why:** Databases like MySQL do not natively "push" changes easily to external APIs without complex CDC (Change Data Capture) tools. Polling ensures we don't hit Google's quota of **100 requests per 100 seconds**.

---

## Nuances & Edge Cases Captured

### Multiplayer Optimization
- **Problem:** If two people edit the same row at once, "Last-Write-Wins" can cause data loss.
- **Solution:** I used **Atomic SQL Updates** matching unique Primary Keys. The system identifies specific IDs rather than overwriting the entire table, ensuring concurrent edits on different rows don't interfere with each other.

### Conflict Resolution
- **Challenge:** A race condition occurs if the Polling Sync (DB -> Sheet) triggers while a user is still typing in the Sheet.
- **Solution:** I implemented a **30-second sync window**. This provides enough "cooldown" for the Webhook to update the Source of Truth (Database) before the Sheet is refreshed with the latest data.

### Upsert Logic
- The system doesn't just update; it detects if an ID exists. If you add a **new row** in the Sheet with a new ID, the system automatically performs an `INSERT` into MySQL.

---

## Scalability & Future Improvements

While this version is production-grade for the assignment, here is how I would scale this for millions of rows:
1. **Change Data Capture (CDC):** Instead of polling, I would use **Debezium** to watch the MySQL Binary Log. This would allow for instant DB-to-Sheet sync without the 30-second wait.
2. **Redis Caching:** To prevent hitting the DB every 30 seconds, I would cache the "Last Sync Hash" in Redis and only trigger a Google Sheets write if the data hash has changed.
3. **Queueing:** Use **RabbitMQ** or **BullMQ** to handle incoming webhooks if thousands of people edit the sheet at the same time.

---

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** Aiven MySQL (Cloud)
- **Deployment:** Render
- **API:** Google Sheets API v4
