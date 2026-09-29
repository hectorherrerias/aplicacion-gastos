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

  // 2. Expenses table (with user_id for multi-user data isolation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category_id TEXT NOT NULL,
      description TEXT NOT NULL,
      payment_method TEXT DEFAULT 'tarjeta',
      created_at INTEGER NOT NULL
    );
  `);

  // Auto-migration: check if user_id column exists in existing expenses table
  try {
    const tableInfo = db.prepare("PRAGMA table_info('expenses')").all() as Array<{ name: string }>;
    const hasUserId = tableInfo.some((col) => col.name === 'user_id');
    if (!hasUserId) {
      console.log('[Database] Migrating expenses table: adding user_id column...');
      db.exec("ALTER TABLE expenses ADD COLUMN user_id TEXT DEFAULT 'usr-admin-default';");
    }
  } catch (err) {
    console.error('[Database Migration Error]', err);
  }

  // Create indexes for fast multi-user querying
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_user_cat ON expenses(user_id, category_id);
  `);

  // 3. User Settings table (User-specific budget, currency, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (user_id, key)
    );
  `);

  // Seed default administrator if users table is empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(adminPassword, salt);
    const adminId = 'usr-admin-default';

    db.prepare(`
      INSERT INTO users (id, username, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      adminId,
      adminUser,
      passwordHash,
      'Administrador',
      Date.now()
    );

    // Seed default settings for admin
    db.prepare('INSERT OR REPLACE INTO user_settings (user_id, key, value) VALUES (?, ?, ?)').run(adminId, 'budget_monthly', '2000');
    db.prepare('INSERT OR REPLACE INTO user_settings (user_id, key, value) VALUES (?, ?, ?)').run(adminId, 'currency', 'EUR');

    console.log(`[Database] Seeded initial administrator account: "${adminUser}"`);
  }

  console.log('[Database] SQLite multi-user schema verified and ready.');
};
