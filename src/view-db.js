require('dotenv').config();
const mysql = require('mysql2/promise');

async function viewData() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false }
        });

        // This command fetches everything currently in your table
        const [rows] = await connection.execute('SELECT * FROM sync_rows');
        
        console.log("--- CURRENT DATABASE CONTENT ---");
        console.table(rows); // This prints a nice table in your terminal
        console.log("--------------------------------");

        await connection.end();
    } catch (err) {
        console.error("Could not read database:", err);
    }
}

viewData();