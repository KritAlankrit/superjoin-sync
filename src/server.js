require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const app = express(); // 1. INITIALIZE FIRST

app.use(express.json());
app.use(express.static('public')); // 2. NOW YOU CAN USE IT

// DB Connection Helper
const getDbConnection = () => mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

// ROUTE 1: Browser Test (GET)
app.get('/webhook', (req, res) => {
    console.log("🔔 Browser ping received! Tunnel is working.");
    res.send("<h1>Tunnel is Alive!</h1>");
});

// ROUTE 2: Google Sheets Sync (POST)
app.post('/webhook', async (req, res) => {
    const { id, label, value } = req.body;
    
    // Safety check: ensure ID is provided
    if (!id) {
        return res.status(400).send('ID is required');
    }

    console.log(`🚀 Syncing Row ID ${id}...`);

    try {
        const connection = await getDbConnection();

        // 1. Check if the ID already exists in your Aiven DB
        const [rows] = await connection.execute('SELECT id FROM sync_rows WHERE id = ?', [id]);

        if (rows.length > 0) {
            // 2. ID exists -> UPDATE the row
            await connection.execute(
                'UPDATE sync_rows SET label = ?, value = ? WHERE id = ?',
                [label, value, id]
            );
            console.log(`✅ ID ${id} updated in Database.`);
        } else {
            // 3. ID is new -> INSERT a new row
            await connection.execute(
                'INSERT INTO sync_rows (id, label, value) VALUES (?, ?, ?)',
                [id, label, value]
            );
            console.log(`✨ New row created in Database with ID ${id}.`);
        }

        await connection.end();
        res.status(200).send('Sync Success');
    } catch (err) {
        console.error("❌ Webhook Error:", err.message);
        res.status(500).send('Database Sync Error');
    }
});

// ROUTE 3: Dashboard API
app.get('/api/data', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT * FROM sync_rows');
        await connection.end();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    // Determine the base URL: Use Render's provided URL if available, otherwise fallback to localhost
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    console.log(`\n📡 Server listening on port ${PORT}`);
    console.log(`🏠 Dashboard: ${baseUrl}`);
    console.log(`🔗 Webhook URL: ${baseUrl}/webhook`);
});

require('./sync.js');