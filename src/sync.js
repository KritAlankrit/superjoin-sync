require('dotenv').config();
const mysql = require('mysql2/promise');
const { google } = require('googleapis');

// Setup Google Sheets Auth
const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function syncDbToSheets() {
    console.log(`\n🔄 Sync Started at: ${new Date().toLocaleTimeString()}`);
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false }
        });

        // 1. Fetch data from MySQL
        const [rows] = await connection.execute('SELECT * FROM sync_rows');

        if (rows.length === 0) {
            console.log("Empty database. Nothing to sync.");
            await connection.end();
            return;
        }

        // 2. Format for Google Sheets
        const values = rows.map(row => [
            row.id, 
            row.label, 
            row.value, 
            row.updated_at.toISOString()
        ]);

        // 3. Update Google Sheets
        const sheets = google.sheets({ version: 'v4', auth });
        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!A2', 
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });

        console.log(`✅ Successfully pushed ${rows.length} rows to Google Sheets.`);
        await connection.end();
    } catch (err) {
        console.error("❌ Sync Error:", err.message);
    }
}

// --- AUTOMATION LOGIC ---
console.log("🚀 Auto-Sync initialized (Interval: 10 Seconds)");

// Run once immediately on start
syncDbToSheets();

// Then run every 10 seconds
setInterval(syncDbToSheets, 10000);