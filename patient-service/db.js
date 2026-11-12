const Database = require('better-sqlite3');
const db = new Database('healthcare.db');
db.exec(
    `CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER,
        email TEXT
    )`
);
console.log("SQLite Database Connected");
module.exports=db;