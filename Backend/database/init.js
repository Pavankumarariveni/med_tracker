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
    // No table creation or index creation statements
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  }
}

export { db };
