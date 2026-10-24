import path from 'path';
import fs from 'fs';
import { db } from './db';

// Automatic SQLite backups: one snapshot per day into DATA_DIR/backups,
// keeping the most recent BACKUP_KEEP_DAYS files (default 14).
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const backupDir = path.join(dataDir, 'backups');
const keepDays = Math.max(1, Number(process.env.BACKUP_KEEP_DAYS) || 14);

const todayStamp = () => new Date().toISOString().slice(0, 10);

const pruneOldBackups = () => {
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('database-') && f.endsWith('.sqlite'))
    .sort();
  const excess = files.length - keepDays;
  for (const file of files.slice(0, Math.max(0, excess))) {
    fs.unlinkSync(path.join(backupDir, file));
  }
};

export const runBackup = async (): Promise<string | null> => {
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const target = path.join(backupDir, `database-${todayStamp()}.sqlite`);
    if (fs.existsSync(target)) return null;

    await db.backup(target);
    pruneOldBackups();
    console.log(`[Backup] SQLite snapshot written to ${target}`);
    return target;
  } catch (err) {
    console.error('[Backup] Failed to create SQLite backup:', err);
    return null;
  }
};

// Snapshot taken right before a destructive action (vaciar, importar): keeps the last 20
export const runSafetyBackup = async (reason: string): Promise<string> => {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const target = path.join(backupDir, `antes-${reason}-${stamp}.sqlite`);
  await db.backup(target);
  const old = fs.readdirSync(backupDir).filter((f) => f.startsWith('antes-') && f.endsWith('.sqlite')).sort();
  for (const file of old.slice(0, Math.max(0, old.length - 20))) fs.unlinkSync(path.join(backupDir, file));
  console.log(`[Backup] Safety snapshot before "${reason}": ${target}`);
  return target;
};

export const startBackupSchedule = () => {
  if (process.env.BACKUP_ENABLED === 'false') {
    console.log('[Backup] Automatic backups disabled (BACKUP_ENABLED=false)');
    return;
  }
  // Run once at startup, then check every hour (only one snapshot per day is written)
  void runBackup();
  setInterval(() => void runBackup(), 60 * 60 * 1000).unref();
};
