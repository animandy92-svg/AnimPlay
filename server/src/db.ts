import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'data', 'animplay.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS hosts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      username    TEXT UNIQUE NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quizzes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id     INTEGER NOT NULL REFERENCES hosts(id),
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_image TEXT,
      is_public   BOOLEAN DEFAULT 1,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS questions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id         INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_text   TEXT NOT NULL,
      image_url       TEXT,
      timer_seconds   INTEGER DEFAULT 20,
      points          INTEGER DEFAULT 1000,
      sort_order      INTEGER NOT NULL,
      correct_index   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS answers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      sort_index  INTEGER NOT NULL,
      text        TEXT NOT NULL,
      color       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      game_pin        TEXT UNIQUE NOT NULL,
      quiz_id         INTEGER NOT NULL REFERENCES quizzes(id),
      host_id         INTEGER NOT NULL REFERENCES hosts(id),
      status          TEXT DEFAULT 'lobby',
      current_question INTEGER DEFAULT 0,
      started_at      DATETIME,
      ended_at        DATETIME,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS game_results (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id     INTEGER NOT NULL REFERENCES games(id),
      nickname    TEXT NOT NULL,
      score       INTEGER DEFAULT 0,
      correct     INTEGER DEFAULT 0,
      total       INTEGER DEFAULT 0,
      streak      INTEGER DEFAULT 0,
      rank        INTEGER
    );
  `);

  console.log('Database initialized successfully');
}
