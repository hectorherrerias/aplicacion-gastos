import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Resolve SQLite file path
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_FILE || path.join(dataDir, 'database.sqlite');
console.log(`[Database] Initializing SQLite database at: ${dbPath}`);

export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize database schema and tables automatically
export const initDatabase = () => {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // 2. Expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      description TEXT NOT NULL,
      payment_method TEXT DEFAULT 'tarjeta',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
  `);

  // 3. Settings table (Budget, Currency, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Seed default administrator if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(adminPassword, salt);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'usr-admin-default',
      adminUser,
      passwordHash,
      'Administrador',
      Date.now()
    );

    console.log(`[Database] Seeded default administrator user: "${adminUser}"`);
  }

  // Seed default settings if empty
  const budgetSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('budget_monthly');
  if (!budgetSetting) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('budget_monthly', '2000');
  }

  const currencySetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('currency');
  if (!currencySetting) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('currency', 'EUR');
  }

  console.log('[Database] SQLite schema verified and ready.');
};
