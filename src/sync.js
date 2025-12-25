require('dotenv').config();
const mysql = require('mysql2/promise');
const { google } = require('googleapis');

// --- CREDENTIALS HANDLING ---
let credentials;
try {
    if (process.env.GOOGLE_JSON) {
        // For Render: Parse the JSON string from Environment Variables
        console.log("🚀 Environment: Production (Render) - Using GOOGLE_JSON variable");
        credentials = JSON.parse(process.env.GOOGLE_JSON);
    } else {
        // For Local Development: Use the service-account.json file
        console.log("💻 Environment: Local - Using service-account.json file");
        // We use path.join to ensure it finds the file regardless of where you start the process
        const path = require('path');
        credentials = require(path.join(__dirname, '../service-account.json'));
    }
} catch (e) {
    console.error("❌ CRITICAL ERROR: Could not load Google Credentials!");
    console.error("Technical Detail:", e.message);
}

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function syncDbToSheets() {
    console.log(`\n🔄 Sync DB -> Sheet Started at: ${new Date().toLocaleTimeString()}`);
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false }
        });

        // 1. Fetch all rows from the database
        const [rows] = await connection.execute('SELECT * FROM sync_rows ORDER BY id ASC');

        if (rows.length === 0) {
            console.log("Empty database. Nothing to sync.");
            await connection.end();
            return;
        }

        // 2. Format rows into the 2D array format Google Sheets expects
        const values = rows.map(row => [
            row.id, 
            row.label, 
            row.value, 
            row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
        ]);

        // 3. Update the Spreadsheet
        const sheets = google.sheets({ version: 'v4', auth });
        
        // We clear the range first or just overwrite from A2
        await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.SHEET_ID,
            range: 'Sheet1!A2', 
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });

        console.log(`✅ Successfully synced ${rows.length} rows to Google Sheets.`);
    } catch (err) {
        console.error("❌ Sync Error:", err.message);
    } finally {
        if (connection) await connection.end();
    }
}

// --- AUTOMATION LOGIC ---
console.log("🚀 Auto-Sync system initialized (Interval: 10 Seconds)");

// Run once immediately on startup
syncDbToSheets();

// Then repeat every 10 seconds
setInterval(syncDbToSheets, 30000);