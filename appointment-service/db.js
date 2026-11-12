const path=require("node:path");
const Database=require("better-sqlite3");

const db=new Database(path.join(__dirname,"appointments.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    doctor_id INTEGER NOT NULL,
    doctor_name TEXT NOT NULL,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'booked'
      CHECK (status IN ('booked','cancelled')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS unique_active_appointment_slot
  ON appointments (doctor_id, appointment_date, appointment_time)
  WHERE status='booked'
`);

module.exports=db;
