import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';

const DB_PATH = path.join(__dirname, '..', 'data', 'animplay.db');

let rawDb: SqlJsDatabase;

interface PreparedLike {
  get(...params: any[]): any;
  all(...params: any[]): any[];
  run(...params: any[]): any;
  bind(...params: any[]): void;
  step(): boolean;
  getColumnNames(): string[];
  get(): any[];
  free(): void;
}

interface DbLike {
  prepare(sql: string): PreparedLike;
  exec(sql: string): void;
  pragma(sql: string): void;
}

function wrapDb(database: SqlJsDatabase): DbLike {
  return {
    prepare(sql: string): PreparedLike {
      const stmt = database.prepare(sql);
      return {
        get(...params: any[]) {
          stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row: any = {};
            cols.forEach((c, i) => { row[c] = vals[i]; });
            stmt.reset();
            return row;
          }
          stmt.reset();
          return undefined;
        },
        all(...params: any[]) {
          const results: any[] = [];
          stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row: any = {};
            cols.forEach((c, i) => { row[c] = vals[i]; });
            results.push(row);
          }
          stmt.reset();
          return results;
        },
        run(...params: any[]) {
          stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
          stmt.step();
          const changes = database.getRowsModified();
          stmt.reset();
          let lastInsertRowid = 0;
          const tmp = database.prepare('SELECT last_insert_rowid() as id');
          if (tmp.step()) lastInsertRowid = tmp.get()[0];
          tmp.free();
          return { changes, lastInsertRowid };
        },
        bind(...params: any[]) {
          stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
        },
        step() { return stmt.step(); },
        getColumnNames() { return stmt.getColumnNames(); },
        get() { return stmt.get(); },
        free() { stmt.free(); },
      };
    },
    exec(sql: string) {
      database.exec(sql);
    },
    pragma(pragmaStr: string) {
      try { database.run(`PRAGMA ${pragmaStr}`); } catch {}
    },
  };
}

let db: DbLike;

export function getDb(): DbLike {
  return db;
}

function safeAddColumn(database: SqlJsDatabase, table: string, column: string, definition: string) {
  const cols = database.exec(`PRAGMA table_info(${table})`);
  if (cols.length > 0 && cols[0].values.some((row: any[]) => row[1] === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function runMigrations(database: SqlJsDatabase) {
  safeAddColumn(database, 'quizzes', 'category', "TEXT DEFAULT 'general'");
  safeAddColumn(database, 'quizzes', 'play_count', 'INTEGER DEFAULT 0');
  safeAddColumn(database, 'quizzes', 'status', "TEXT DEFAULT 'published'");
  safeAddColumn(database, 'quizzes', 'is_favorite', 'BOOLEAN DEFAULT 0');
  safeAddColumn(database, 'quizzes', 'deleted_at', 'DATETIME');
  safeAddColumn(database, 'questions', 'points_multiplier', 'REAL DEFAULT 1.0');

  database.exec(`
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

function seedDiscoverContent(database: SqlJsDatabase) {
  const countResult = database.exec('SELECT COUNT(*) as c FROM quizzes WHERE is_public = 1');
  if (countResult.length > 0 && countResult[0].values[0][0] > 0) return;

  let systemHostId: number;
  const hostResult = database.exec("SELECT id FROM hosts WHERE username = 'animplay'");
  if (hostResult.length > 0 && hostResult[0].values.length > 0) {
    systemHostId = hostResult[0].values[0][0] as number;
  } else {
    const hash = bcrypt.hashSync('demo1234', 10);
    database.run('INSERT INTO hosts (username, email, password) VALUES (?, ?, ?)',
      ['animplay', 'demo@animplay.local', hash]);
    const idResult = database.exec('SELECT last_insert_rowid()');
    systemHostId = idResult[0].values[0][0] as number;
  }

  const hostId = systemHostId;
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

  const colors = ['red', 'blue', 'yellow', 'green'];

  for (const sample of samples) {
    database.run(
      'INSERT INTO quizzes (host_id, title, description, is_public, category, play_count, status) VALUES (?, ?, ?, 1, ?, ?, ?)',
      [hostId, sample.title, sample.description, sample.category, Math.floor(Math.random() * 5000) + 100, 'published']
    );
    const quizId = (database.exec('SELECT last_insert_rowid()'))[0].values[0][0] as number;

    sample.questions.forEach((q, idx) => {
      database.run(
        'INSERT INTO questions (quiz_id, question_text, timer_seconds, points, points_multiplier, sort_order, correct_index) VALUES (?, ?, 20, 1000, 1.0, ?, ?)',
        [quizId, q.text, idx, q.correct]
      );
      const qId = (database.exec('SELECT last_insert_rowid()'))[0].values[0][0] as number;
      q.answers.forEach((a, ai) => {
        database.run('INSERT INTO answers (question_id, sort_index, text, color) VALUES (?, ?, ?, ?)',
          [qId, ai, a, colors[ai]]);
      });
    });
  }
}

export async function initializeDb(): Promise<void> {
  const SQL = await initSqlJs();

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  rawDb.run('PRAGMA journal_mode = WAL');
  rawDb.run('PRAGMA foreign_keys = ON');

  rawDb.exec(`
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
      timer_seconds   INTEGER DEFAULT 20 CHECK(timer_seconds IN (10, 20, 30, 60)),
      points          INTEGER DEFAULT 1000,
      points_multiplier REAL DEFAULT 1.0,
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

  runMigrations(rawDb);
  seedDiscoverContent(rawDb);

  db = wrapDb(rawDb);
  console.log('Database initialized successfully');
}

export function saveDatabase(): void {
  if (!rawDb) return;
  const data = rawDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}
