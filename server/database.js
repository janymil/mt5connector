import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

// Enable Foreign Keys and WAL Mode for high performance
db.run('PRAGMA foreign_keys = ON;');
db.run('PRAGMA journal_mode = WAL;');

// Database helper functions
const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

const allRows = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    err ? reject(err) : resolve(this);
  });
});

// Initialize Schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  db.run(`
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

  db.run(`
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

  db.run(`
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
});

// --- USER MANAGEMENT ---
export async function createUser(email, passwordHash, apiKey) {
  const result = await run(
    `INSERT INTO users (email, password_hash, api_key, created_at) VALUES (?, ?, ?, ?)`,
    [email, passwordHash, apiKey, new Date().toISOString()]
  );
  return result.lastID;
}

export async function getUserByEmail(email) {
  return await get(`SELECT * FROM users WHERE email = ?`, [email]) || null;
}

export async function getUserById(id) {
  const user = await get(`SELECT id, email, api_key, created_at FROM users WHERE id = ?`, [id]);
  return user || null;
}

export async function getUserByApiKey(apiKey) {
  return await get(`SELECT * FROM users WHERE api_key = ?`, [apiKey]) || null;
}

// --- DATA ACCESS ---
export async function all(queryType, params = [], userId) {
  if (queryType.toLowerCase().includes('from accounts')) {
    return await allRows(
      `SELECT * FROM accounts WHERE user_id = ? ORDER BY last_sync DESC`,
      [userId]
    );
  }

  if (queryType.toLowerCase().includes('from deals')) {
    const account_id = params[0];

    if (account_id === 'all_live') {
      return await allRows(
        `SELECT d.* FROM deals d 
         JOIN accounts a ON d.account_id = a.account_id AND d.user_id = a.user_id
         WHERE d.user_id = ? AND (a.trade_mode = 'Live' OR a.trade_mode IS NULL) AND (a.account_type IS NULL OR a.account_type != 'Prop')
         ORDER BY d.time DESC`,
        [userId]
      );
    } else if (account_id === 'all_demo') {
      return await allRows(
        `SELECT d.* FROM deals d 
         JOIN accounts a ON d.account_id = a.account_id AND d.user_id = a.user_id
         WHERE d.user_id = ? AND a.trade_mode = 'Demo'
         ORDER BY d.time DESC`,
        [userId]
      );
    } else if (account_id === 'all_prop') {
      return await allRows(
        `SELECT d.* FROM deals d 
         JOIN accounts a ON d.account_id = a.account_id AND d.user_id = a.user_id
         WHERE d.user_id = ? AND a.account_type = 'Prop'
         ORDER BY d.time DESC`,
        [userId]
      );
    } else if (account_id && account_id !== 'all') {
      return await allRows(
        `SELECT * FROM deals WHERE user_id = ? AND account_id = ? ORDER BY time DESC`,
        [userId, account_id]
      );
    } else {
      return await allRows(
        `SELECT * FROM deals WHERE user_id = ? ORDER BY time DESC`,
        [userId]
      );
    }
  }

  return [];
}

export async function runQuery(actionQuery, params = []) {
  if (actionQuery.toLowerCase().includes('delete from accounts')) {
    const accountId = params[0];
    const userId = params[1];
    
    await run(`DELETE FROM deals WHERE user_id = ? AND account_id = ?`, [userId, accountId]);
    await run(`DELETE FROM positions WHERE user_id = ? AND account_id = ?`, [userId, accountId]);
    const result = await run(`DELETE FROM accounts WHERE user_id = ? AND account_id = ?`, [userId, accountId]);
    return { changes: result.changes };
  }
  return { changes: 0 };
}

export { runQuery as run };

export async function getPositions(accountId, userId) {
  if (accountId === 'all_live') {
    return await allRows(
      `SELECT p.* FROM positions p 
       JOIN accounts a ON p.account_id = a.account_id AND p.user_id = a.user_id
       WHERE p.user_id = ? AND (a.trade_mode = 'Live' OR a.trade_mode IS NULL) AND (a.account_type IS NULL OR a.account_type != 'Prop')
       ORDER BY p.time DESC`,
      [userId]
    );
  } else if (accountId === 'all_demo') {
    return await allRows(
      `SELECT p.* FROM positions p 
       JOIN accounts a ON p.account_id = a.account_id AND p.user_id = a.user_id
       WHERE p.user_id = ? AND a.trade_mode = 'Demo'
       ORDER BY p.time DESC`,
      [userId]
    );
  } else if (accountId === 'all_prop') {
    return await allRows(
      `SELECT p.* FROM positions p 
       JOIN accounts a ON p.account_id = a.account_id AND p.user_id = a.user_id
       WHERE p.user_id = ? AND a.account_type = 'Prop'
       ORDER BY p.time DESC`,
      [userId]
    );
  } else if (accountId && accountId !== 'all') {
    return await allRows(
      `SELECT * FROM positions WHERE user_id = ? AND account_id = ? ORDER BY time DESC`,
      [userId, account_id]
    );
  } else {
    return await allRows(
      `SELECT * FROM positions WHERE user_id = ? ORDER BY time DESC`,
      [userId]
    );
  }
}

export async function getConsolidatedStats(accountId, userId) {
  let accounts = [];
  let deals = [];

  if (accountId === 'all_live') {
    accounts = await allRows(
      `SELECT * FROM accounts WHERE user_id = ? AND (trade_mode = 'Live' OR trade_mode IS NULL) AND (account_type IS NULL OR account_type != 'Prop')`,
      [userId]
    );
    deals = await allRows(
      `SELECT d.* FROM deals d 
       JOIN accounts a ON d.account_id = a.account_id AND d.user_id = a.user_id
       WHERE d.user_id = ? AND (a.trade_mode = 'Live' OR a.trade_mode IS NULL) AND (a.account_type IS NULL OR a.account_type != 'Prop')`,
      [userId]
    );
  } else if (accountId === 'all_demo') {
    accounts = await allRows(
      `SELECT * FROM accounts WHERE user_id = ? AND trade_mode = 'Demo'`,
      [userId]
    );
    deals = await allRows(
      `SELECT d.* FROM deals d 
       JOIN accounts a ON d.account_id = a.account_id AND d.user_id = a.user_id
       WHERE d.user_id = ? AND a.trade_mode = 'Demo'`,
      [userId]
    );
  } else if (accountId === 'all_prop') {
    accounts = await allRows(
      `SELECT * FROM accounts WHERE user_id = ? AND account_type = 'Prop'`,
      [userId]
    );
    deals = await allRows(
      `SELECT d.* FROM deals d 
       JOIN accounts a ON d.account_id = a.account_id AND d.user_id = a.user_id
       WHERE d.user_id = ? AND a.account_type = 'Prop'`,
      [userId]
    );
  } else if (accountId && accountId !== 'all') {
    accounts = await allRows(
      `SELECT * FROM accounts WHERE user_id = ? AND account_id = ?`,
      [userId, account_id]
    );
    deals = await allRows(
      `SELECT * FROM deals WHERE user_id = ? AND account_id = ?`,
      [userId, account_id]
    );
  } else {
    accounts = await allRows(`SELECT * FROM accounts WHERE user_id = ?`, [userId]);
    deals = await allRows(`SELECT * FROM deals WHERE user_id = ?`, [userId]);
  }

  // Filter only closed trade deals
  const closedDeals = deals.filter(d => (d.type === 0 || d.type === 1) && d.entry !== 0);

  let winDeals = 0;
  let lossDeals = 0;
  let totalProfit = 0;
  let totalCommission = 0;
  let totalSwap = 0;
  let totalVolume = 0;

  closedDeals.forEach(deal => {
    const net = deal.profit + deal.commission + deal.swap;
    totalProfit += deal.profit;
    totalCommission += deal.commission;
    totalSwap += deal.swap;
    totalVolume += deal.volume;

    if (net > 0) winDeals++;
    else if (net < 0) lossDeals++;
  });

  return {
    accounts,
    stats: {
      total_deals: closedDeals.length,
      win_deals: winDeals,
      loss_deals: lossDeals,
      total_profit: Number(totalProfit.toFixed(2)),
      total_commission: Number(totalCommission.toFixed(2)),
      total_swap: Number(totalSwap.toFixed(2)),
      total_volume: Number(totalVolume.toFixed(4))
    }
  };
}

export async function updateAccountType(accountId, accountType, userId) {
  const result = await run(
    `UPDATE accounts SET account_type = ? WHERE user_id = ? AND account_id = ?`,
    [accountType, userId, accountId]
  );
  if (result.changes === 0) {
    throw new Error(`Account ${accountId} not found or access denied.`);
  }
  return { success: true, account_id: accountId, account_type: accountType };
}

export async function syncAccountData(account, deals, positions = [], userId) {
  const lastSync = Math.floor(Date.now() / 1000);

  // 1. Upsert Account
  await run(
    `INSERT INTO accounts (user_id, account_id, name, broker, currency, leverage, balance, equity, trade_mode, last_sync)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, account_id) DO UPDATE SET
       name = excluded.name,
       broker = excluded.broker,
       currency = excluded.currency,
       leverage = excluded.leverage,
       balance = excluded.balance,
       equity = excluded.equity,
       trade_mode = excluded.trade_mode,
       last_sync = excluded.last_sync`,
    [
      userId,
      account.account_id,
      account.name || '',
      account.broker || '',
      account.currency || 'USD',
      Number(account.leverage || 100),
      Number(account.balance || 0),
      Number(account.equity || 0),
      account.trade_mode || 'Live',
      lastSync
    ]
  );

  // 2. Upsert Deals
  if (deals.length > 0) {
    try { await run('BEGIN DEFERRED'); } catch (e) {}
    for (const deal of deals) {
      await run(
        `INSERT INTO deals (user_id, account_id, ticket, order_ticket, position_id, time, type, entry, magic, profit, commission, swap, volume, price, symbol, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, account_id, ticket) DO UPDATE SET
           order_ticket = excluded.order_ticket,
           position_id = excluded.position_id,
           time = excluded.time,
           type = excluded.type,
           entry = excluded.entry,
           magic = excluded.magic,
           profit = excluded.profit,
           commission = excluded.commission,
           swap = excluded.swap,
           volume = excluded.volume,
           price = excluded.price,
           symbol = excluded.symbol,
           comment = excluded.comment`,
        [
          userId,
          account.account_id,
          String(deal.ticket),
          String(deal.order_ticket || ''),
          String(deal.position_id || ''),
          Number(deal.time || 0),
          Number(deal.type || 0),
          Number(deal.entry || 0),
          Number(deal.magic || 0),
          Number(deal.profit || 0),
          Number(deal.commission || 0),
          Number(deal.swap || 0),
          Number(deal.volume || 0),
          Number(deal.price || 0),
          deal.symbol || '',
          deal.comment || ''
        ]
      );
    }
    try { await run('COMMIT'); } catch (e) {}
  }

  // 3. Replace Positions
  await run(`DELETE FROM positions WHERE user_id = ? AND account_id = ?`, [userId, account.account_id]);
  if (positions.length > 0) {
    try { await run('BEGIN DEFERRED'); } catch (e) {}
    for (const pos of positions) {
      await run(
        `INSERT OR REPLACE INTO positions (user_id, account_id, ticket, time, type, magic, volume, price_open, price_current, profit, commission, swap, symbol, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          account.account_id,
          String(pos.ticket),
          Number(pos.time || 0),
          Number(pos.type || 0),
          Number(pos.magic || 0),
          Number(pos.volume || 0),
          Number(pos.price_open || 0),
          Number(pos.price_current || 0),
          Number(pos.profit || 0),
          Number(pos.commission || 0),
          Number(pos.swap || 0),
          pos.symbol || '',
          pos.comment || ''
        ]
      );
    }
    try { await run('COMMIT'); } catch (e) {}
  }

  return { success: true, count: deals.length, positionsCount: positions.length };
}

// --- GDPR HELPER FUNCTIONS ---
export async function deleteUserAccount(userId) {
  await run(`DELETE FROM deals WHERE user_id = ?`, [userId]);
  await run(`DELETE FROM positions WHERE user_id = ?`, [userId]);
  await run(`DELETE FROM accounts WHERE user_id = ?`, [userId]);
  const result = await run(`DELETE FROM users WHERE id = ?`, [userId]);
  return { changes: result.changes };
}

export async function exportUserDeals(userId) {
  return await allRows(`SELECT * FROM deals WHERE user_id = ? ORDER BY time DESC`, [userId]);
}
