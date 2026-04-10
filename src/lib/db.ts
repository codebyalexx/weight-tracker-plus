import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "weight-tracker.db");

let db: Database.Database | null = null;

export type GoalType = "deficit" | "maintenance" | "bulk";

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS weight_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      weight REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS calorie_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      calories_consumed REAL NOT NULL DEFAULT 0,
      calories_burned REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_weight REAL NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('cut', 'bulk')),
      initial_intensity INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      start_weight REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_entries(date);
    CREATE INDEX IF NOT EXISTS idx_calorie_date ON calorie_entries(date);
  `);

  // Safe migration: add goal column if it doesn't exist
  // Existing rows will get 'deficit' as default — no breaking change
  try {
    db.exec(`ALTER TABLE calorie_entries ADD COLUMN goal TEXT NOT NULL DEFAULT 'deficit'`);
  } catch {
    // Column already exists, ignore the error
  }
}

// Types
export interface WeightEntry {
  id: number;
  date: string;
  weight: number;
  created_at: string;
  updated_at: string;
}

export interface CalorieEntry {
  id: number;
  date: string;
  calories_consumed: number;
  calories_burned: number;
  goal: GoalType;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: number;
  target_weight: number;
  mode: "cut" | "bulk";
  initial_intensity: number;
  start_date: string;
  start_weight: number;
  active: number; // SQLite boolean
  created_at: string;
  updated_at: string;
}
