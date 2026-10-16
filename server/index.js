import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { 
  all, run, syncAccountData, getConsolidatedStats, getPositions, updateAccountType, 
  createUser, getUserByEmail, getUserById, getUserByApiKey, deleteUserAccount, exportUserDeals 
} from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- RATE LIMITERS ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 authentication requests per windowMs
  message: { error: 'Too many auth attempts from this IP, please try again after 15 minutes' }
});

const syncLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 sync calls per minute
  message: { error: 'Sync rate limit exceeded' }
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API Key required in x-api-key header' });

  try {
    const user = await getUserByApiKey(apiKey);
    if (!user) return res.status(403).json({ error: 'Invalid API Key' });
    
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });
    
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate a random API key for MetaTrader
    const apiKey = crypto.randomBytes(32).toString('hex');
    
    const userId = await createUser(email, passwordHash, apiKey);
    
    // Auto-login
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: userId, email, api_key: apiKey } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, email: user.email, api_key: user.api_key } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GDPR DELETE ACCOUNT ---
app.delete('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    await deleteUserAccount(req.user.id);
    res.json({ success: true, message: 'Account and all associated trade data deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- GDPR CSV/JSON EXPORT ---
app.get('/api/export', authenticateToken, async (req, res) => {
  try {
    const deals = await exportUserDeals(req.user.id);
    const format = req.query.format || 'json';

    if (format === 'csv') {
      const fields = ['ticket', 'account_id', 'order_ticket', 'symbol', 'type', 'volume', 'price', 'profit', 'commission', 'swap', 'time', 'comment'];
      let csv = fields.join(',') + '\n';
      deals.forEach(d => {
        csv += fields.map(f => `"${String(d[f] || '').replace(/"/g, '""')}"`).join(',') + '\n';
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="my_trades_export.csv"');
      return res.send(csv);
    }

    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- METATRADER SYNC ROUTE ---
app.post('/api/sync', syncLimiter, authenticateApiKey, async (req, res) => {
  try {
    const { account, deals, positions } = req.body;

    if (!account || !account.account_id) {
      return res.status(400).json({ error: 'Missing account information.' });
    }
    if (!deals || !Array.isArray(deals)) {
      return res.status(400).json({ error: 'Deals data must be an array.' });
    }

    const posArray = Array.isArray(positions) ? positions : [];

    console.log(`Sync request received for Account: ${account.account_id} (${account.name}) with ${deals.length} deals and ${posArray.length} open positions, from user ID: ${req.user.id}`);

    const result = await syncAccountData(account, deals, posArray, req.user.id);
    res.json({ success: true, message: 'Sync completed successfully.', details: result });
  } catch (err) {
    console.error('Error during synchronization:', err.message);
    res.status(500).json({ error: 'Internal Server Error during synchronization.', details: err.message });
  }
});

// --- DASHBOARD API ROUTES (Protected by JWT) ---
app.get('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const accounts = await all('SELECT * FROM accounts', [], req.user.id);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deals', authenticateToken, async (req, res) => {
  try {
    const { account_id } = req.query;
    const deals = await all('SELECT * FROM deals', [account_id], req.user.id);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/positions', authenticateToken, async (req, res) => {
  try {
    const { account_id } = req.query;
    const positions = await getPositions(account_id, req.user.id);
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/summary', authenticateToken, async (req, res) => {
  try {
    const { account_id } = req.query;
    const summary = await getConsolidatedStats(account_id, req.user.id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/accounts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await run('DELETE FROM accounts', [id, req.user.id]);
    res.json({ success: true, message: `Account ${id} and all related deals deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/accounts/:id/type', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { account_type } = req.body;
    const validTypes = ['Live', 'Demo', 'Prop'];
    if (!validTypes.includes(account_type)) {
      return res.status(400).json({ error: `Invalid account_type. Must be one of: ${validTypes.join(', ')}` });
    }
    const result = await updateAccountType(id, account_type, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DIRECT EX5 CONNECTOR DOWNLOAD ---
app.get('/AccountStatsConnector.ex5', (req, res) => {
  const filePath = path.join(__dirname, '../mql5/AccountStatsConnector.ex5');
  res.download(filePath, 'AccountStatsConnector.ex5');
});

// --- SERVE REACT FRONTEND ---
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
