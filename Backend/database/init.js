import sqlite3 from "sqlite3";
import { promisify } from "util";

const db = new sqlite3.Database(
  process.env.DATABASE_URL || "./medication_tracker.sqlite"
);

// Promisify database methods
db.run = promisify(db.run.bind(db));
db.get = promisify(db.get.bind(db));
db.all = promisify(db.all.bind(db));

export async function initializeDatabase() {
  try {
    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('patient', 'caretaker')) NOT NULL
      )
    `);

    // Tablets table (Master Tablet Catalog)
    await db.run(`
      CREATE TABLE IF NOT EXISTS tablets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        type TEXT
      )
    `);

    // User Medication Schedules table
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_medication_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        dose_time TEXT NOT NULL,
        expected_time TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Schedule Tablets table
    await db.run(`
      CREATE TABLE IF NOT EXISTS schedule_tablets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        tablet_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (schedule_id) REFERENCES user_medication_schedules(id) ON DELETE CASCADE,
        FOREIGN KEY (tablet_id) REFERENCES tablets(id) ON DELETE CASCADE
      )
    `);

    // Medication Logs table
    await db.run(`
      CREATE TABLE IF NOT EXISTS medication_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        schedule_id INTEGER NOT NULL,
        log_date TEXT NOT NULL,
        is_taken BOOLEAN NOT NULL,
        taken_at TEXT,
        photo_path TEXT,
        FOREIGN KEY (schedule_id) REFERENCES user_medication_schedules(id) ON DELETE CASCADE
      )
    `);

    // User Caretaker Mappings table
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_caretaker_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caretaker_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        FOREIGN KEY (caretaker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(caretaker_id, patient_id)
      )
    `);

    // Create indexes for better performance
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_user_med_schedules_user_id ON user_medication_schedules(user_id)"
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_medication_logs_schedule_id ON medication_logs(schedule_id)"
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_medication_logs_log_date ON medication_logs(log_date)"
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_schedule_tablets_schedule_id ON schedule_tablets(schedule_id)"
    );

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

export { db };
