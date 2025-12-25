require('dotenv').config();
const mysql = require('mysql2/promise');

async function simulateDbChange() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false }
        });

        console.log("Connected to Aiven. Changing data...");

        // This command changes 'Sample Value' to 'Updated by Gemini'
        await connection.execute(
            'UPDATE sync_rows SET value = ? WHERE id = 1',
            ['Updated']
        );

        console.log("Database updated successfully!");
        await connection.end();
    } catch (err) {
        console.error("Error updating DB:", err);
    }
}

simulateDbChange();