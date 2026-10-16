import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonDbPath = path.join(__dirname, 'data.json');
const sqliteDbPath = path.join(__dirname, 'database.sqlite');

async function migrate() {
  console.log('--- Starting Migration from data.json to SQLite ---');

  let rawData;
  try {
    rawData = await fs.readFile(jsonDbPath, 'utf8');
  } catch (err) {
    console.error('Failed to read data.json:', err.message);
    return;
  }

  const data = JSON.parse(rawData);
  const users = data.users || [];
  const accounts = data.accounts || [];
  const deals = data.deals || [];
  const positions = data.positions || [];

  console.log(`Loaded JSON: ${users.length} users, ${accounts.length} accounts, ${deals.length} deals, ${positions.length} positions.`);

  const db = new sqlite3.Database(sqliteDbPath);

  const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  db.serialize(async () => {
    try {
      // 1. Create Tables
      await run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          api_key TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id TEXT NOT NULL,
          name TEXT,
          broker TEXT,
          currency TEXT,
          leverage INTEGER,
          balance REAL,
          equity REAL,
          trade_mode TEXT,
          account_type TEXT,
          last_sync INTEGER,
          UNIQUE(user_id, account_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS deals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id TEXT NOT NULL,
          ticket TEXT NOT NULL,
          order_ticket TEXT,
          position_id TEXT,
          time INTEGER,
          type INTEGER,
          entry INTEGER,
          magic INTEGER,
          profit REAL,
          commission REAL,
          swap REAL,
          volume REAL,
          price REAL,
          symbol TEXT,
          comment TEXT,
          UNIQUE(user_id, account_id, ticket),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS positions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          account_id TEXT NOT NULL,
          ticket TEXT NOT NULL,
          time INTEGER,
          type INTEGER,
          magic INTEGER,
          volume REAL,
          price_open REAL,
          price_current REAL,
          profit REAL,
          commission REAL,
          swap REAL,
          symbol TEXT,
          comment TEXT,
          UNIQUE(user_id, account_id, ticket),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      console.log('Tables created / verified in SQLite.');

      // Begin Transaction
      await run('BEGIN TRANSACTION');

      // Insert Users
      for (const u of users) {
        await run(
          `INSERT OR REPLACE INTO users (id, email, password_hash, api_key, created_at) VALUES (?, ?, ?, ?, ?)`,
          [u.id, u.email, u.password_hash, u.api_key, u.created_at || new Date().toISOString()]
        );
      }
      console.log(`Migrated ${users.length} users.`);

      // Account map to track account_id -> user_id
      const accountUserMap = new Map();
      for (const a of accounts) {
        const userId = a.user_id || 1; // Default to user 1 if not specified
        accountUserMap.set(a.account_id, userId);
        await run(
          `INSERT OR REPLACE INTO accounts (user_id, account_id, name, broker, currency, leverage, balance, equity, trade_mode, account_type, last_sync) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, a.account_id, a.name || '', a.broker || '', a.currency || 'USD', a.leverage || 100, a.balance || 0, a.equity || 0, a.trade_mode || 'Live', a.account_type || null, a.last_sync || 0]
        );
      }
      console.log(`Migrated ${accounts.length} accounts.`);

      // Insert Deals
      let insertedDeals = 0;
      for (const d of deals) {
        const userId = accountUserMap.get(d.account_id) || 1;
        await run(
          `INSERT OR REPLACE INTO deals (user_id, account_id, ticket, order_ticket, position_id, time, type, entry, magic, profit, commission, swap, volume, price, symbol, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, d.account_id, String(d.ticket), String(d.order_ticket || ''), String(d.position_id || ''), Number(d.time || 0), Number(d.type || 0), Number(d.entry || 0), Number(d.magic || 0), Number(d.profit || 0), Number(d.commission || 0), Number(d.swap || 0), Number(d.volume || 0), Number(d.price || 0), d.symbol || '', d.comment || '']
        );
        insertedDeals++;
      }
      console.log(`Migrated ${insertedDeals} deals.`);

      // Insert Positions
      let insertedPositions = 0;
      for (const p of positions) {
        const userId = accountUserMap.get(p.account_id) || 1;
        await run(
          `INSERT OR REPLACE INTO positions (user_id, account_id, ticket, time, type, magic, volume, price_open, price_current, profit, commission, swap, symbol, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, p.account_id, String(p.ticket), Number(p.time || 0), Number(p.type || 0), Number(p.magic || 0), Number(p.volume || 0), Number(p.price_open || 0), Number(p.price_current || 0), Number(p.profit || 0), Number(p.commission || 0), Number(p.swap || 0), p.symbol || '', p.comment || '']
        );
        insertedPositions++;
      }
      console.log(`Migrated ${insertedPositions} positions.`);

      await run('COMMIT');
      console.log('--- Migration Completed Successfully! ---');
      db.close();
    } catch (err) {
      await run('ROLLBACK');
      console.error('Migration failed:', err.message);
      db.close();
    }
  });
}

migrate();
