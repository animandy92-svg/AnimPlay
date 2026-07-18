import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcrypt';

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

function safeAddColumn(db: Database.Database, table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function runMigrations(db: Database.Database) {
  safeAddColumn(db, 'quizzes', 'category', "TEXT DEFAULT 'general'");
  safeAddColumn(db, 'quizzes', 'play_count', 'INTEGER DEFAULT 0');
  safeAddColumn(db, 'quizzes', 'status', "TEXT DEFAULT 'published'");
  safeAddColumn(db, 'quizzes', 'is_favorite', 'BOOLEAN DEFAULT 0');
  safeAddColumn(db, 'quizzes', 'deleted_at', 'DATETIME');

  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id     INTEGER NOT NULL REFERENCES hosts(id),
      name        TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quiz_folders (
      quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      folder_id   INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      PRIMARY KEY (quiz_id, folder_id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id    INTEGER NOT NULL REFERENCES hosts(id),
      name        TEXT NOT NULL,
      description TEXT DEFAULT '',
      invite_code TEXT UNIQUE NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      host_id     INTEGER NOT NULL REFERENCES hosts(id),
      role        TEXT DEFAULT 'member',
      joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, host_id)
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      quiz_id     INTEGER NOT NULL REFERENCES quizzes(id),
      title       TEXT NOT NULL,
      due_date    DATETIME,
      created_by  INTEGER NOT NULL REFERENCES hosts(id),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignment_completions (
      assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      host_id       INTEGER NOT NULL REFERENCES hosts(id),
      completed_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      score         INTEGER DEFAULT 0,
      PRIMARY KEY (assignment_id, host_id)
    );
  `);
}

function seedDiscoverContent(db: Database.Database) {
  const count = db.prepare('SELECT COUNT(*) as c FROM quizzes WHERE is_public = 1').get() as { c: number };
  if (count.c > 0) return;

  let systemHost = db.prepare("SELECT id FROM hosts WHERE username = 'animplay'").get() as { id: number } | undefined;
  if (!systemHost) {
    const hash = bcrypt.hashSync('demo1234', 10);
    const result = db.prepare('INSERT INTO hosts (username, email, password) VALUES (?, ?, ?)').run(
      'animplay', 'demo@animplay.local', hash
    );
    systemHost = { id: Number(result.lastInsertRowid) };
  }

  const hostId = systemHost.id;
  const samples = [
    { title: 'World Capitals', description: 'Test your geography knowledge', category: 'general', questions: [
      { text: 'What is the capital of France?', correct: 0, answers: ['Paris', 'London', 'Berlin', 'Madrid'] },
      { text: 'What is the capital of Japan?', correct: 0, answers: ['Tokyo', 'Seoul', 'Beijing', 'Bangkok'] },
    ]},
    { title: 'Science Trivia', description: 'Fun facts about the natural world', category: 'science', questions: [
      { text: 'What planet is known as the Red Planet?', correct: 0, answers: ['Mars', 'Venus', 'Jupiter', 'Saturn'] },
      { text: 'What gas do plants absorb?', correct: 0, answers: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Helium'] },
    ]},
    { title: 'Movie Night', description: 'Classic film questions', category: 'trivia', questions: [
      { text: 'Who directed Jurassic Park?', correct: 0, answers: ['Steven Spielberg', 'James Cameron', 'George Lucas', 'Peter Jackson'] },
    ]},
    { title: 'Spanish Basics', description: 'Learn common Spanish words', category: 'language', questions: [
      { text: 'How do you say Hello in Spanish?', correct: 0, answers: ['Hola', 'Adios', 'Gracias', 'Por favor'] },
      { text: 'How do you say Thank you in Spanish?', correct: 0, answers: ['Gracias', 'Hola', 'Si', 'No'] },
    ]},
    { title: 'Sports Legends', description: 'Athletes and records', category: 'sports', questions: [
      { text: 'How many players on a soccer team?', correct: 0, answers: ['11', '9', '7', '13'] },
    ]},
  ];

  const insertQuiz = db.prepare(
    'INSERT INTO quizzes (host_id, title, description, is_public, category, play_count, status) VALUES (?, ?, ?, 1, ?, ?, ?)'
  );
  const insertQ = db.prepare(
    'INSERT INTO questions (quiz_id, question_text, timer_seconds, points, sort_order, correct_index) VALUES (?, ?, 20, 1000, ?, ?)'
  );
  const insertA = db.prepare('INSERT INTO answers (question_id, sort_index, text, color) VALUES (?, ?, ?, ?)');
  const colors = ['red', 'blue', 'yellow', 'green'];

  for (const sample of samples) {
    const quizResult = insertQuiz.run(hostId, sample.title, sample.description, sample.category, Math.floor(Math.random() * 5000) + 100, 'published');
    const quizId = quizResult.lastInsertRowid;
    sample.questions.forEach((q, idx) => {
      const qResult = insertQ.run(quizId, q.text, idx, q.correct);
      q.answers.forEach((a, ai) => {
        insertA.run(qResult.lastInsertRowid, ai, a, colors[ai]);
      });
    });
  }
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

  runMigrations(db);
  seedDiscoverContent(db);
  console.log('Database initialized successfully');
}
