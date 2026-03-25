// =============================================
// models/db.js - SQLite Database
// Works perfectly on Render!
// =============================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create data directory
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'nexdrive.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// =============================================
// CREATE TABLES
// =============================================
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id            TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    filename      TEXT NOT NULL,
    mimetype      TEXT NOT NULL,
    category      TEXT NOT NULL,
    size          INTEGER NOT NULL,
    path          TEXT NOT NULL,
    url           TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    is_trashed    INTEGER DEFAULT 0,
    folder        TEXT DEFAULT NULL,
    uploaded_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
  CREATE INDEX IF NOT EXISTS idx_files_trash ON files(is_trashed);
`);

console.log('✅ SQLite database initialized:', dbPath);

module.exports = sqlite;
