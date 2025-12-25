require('dotenv').config();
const mysql = require('mysql2/promise');

async function init() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false } 
        });

        console.log("Connected to Aiven!");

        // This creates the table we will use for the 2-way sync
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS sync_rows (
                id INT AUTO_INCREMENT PRIMARY KEY,
                label VARCHAR(255),
                value VARCHAR(255),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Insert one row so we have something to see in the Google Sheet later
        await connection.execute(`
            INSERT INTO sync_rows (label, value) VALUES ('Sample Label', 'Sample Value')
        `);

        console.log("Table 'sync_rows' created and test data inserted!");
        await connection.end();
    } catch (err) {
        console.error("Setup failed. Check your .env details: ", err);
    }
}

init();