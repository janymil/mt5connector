import http from 'http';

const serverUrl = 'http://localhost:5000/api/sync';

// Generate mock deals for last 20 days (June 1 to June 19, 2026)
const generateMockDeals = () => {
  const EAs = [
    { magic: 1001, comment: 'GridMaster EA', winChance: 0.72, avgWin: 45.0, avgLoss: -95.0, volume: 0.1, symbol: 'EURUSD' },
    { magic: 2002, comment: 'TrendFollower EA', winChance: 0.40, avgWin: 250.0, avgLoss: -75.0, volume: 0.25, symbol: 'GBPUSD' },
    { magic: 3003, comment: 'ScalperPro EA', winChance: 0.85, avgWin: 12.0, avgLoss: -35.0, volume: 0.5, symbol: 'USDJPY' },
    { magic: 0, comment: 'Manual Trade', winChance: 0.50, avgWin: 150.0, avgLoss: -120.0, volume: 0.15, symbol: 'XAUUSD' }
  ];

  const deals = [];
  let ticket = 500000;
  let orderTicket = 2000000;

  // Let's loop days: June 1 (timestamp 1780272000) to June 19, 2026
  const startTimestamp = 1780272000; // 2026-06-01 12:00:00 UTC
  const oneDay = 24 * 60 * 60;

  for (let day = 0; day < 19; day++) {
    const currentDayTimestamp = startTimestamp + (day * oneDay);
    // 2 to 6 trades per day
    const tradesToday = Math.floor(Math.random() * 5) + 2;

    for (let t = 0; t < tradesToday; t++) {
      // Pick random EA
      const eaIdx = Math.floor(Math.random() * EAs.length);
      const ea = EAs[eaIdx];

      const isWin = Math.random() < ea.winChance;
      const tradeProfit = isWin 
        ? ea.avgWin * (0.8 + Math.random() * 0.4) 
        : ea.avgLoss * (0.8 + Math.random() * 0.4);

      const commission = -3.50 * ea.volume * 2;
      const swap = Math.random() < 0.2 ? -1.25 * ea.volume : 0;
      
      const timeOffset = Math.floor(Math.random() * 8 * 3600); // spread across 8 hours
      const tradeTime = currentDayTimestamp + timeOffset;

      ticket++;
      orderTicket++;

      // Entry IN deal (opening the trade) - profit/commission/swap is zero
      deals.push({
        ticket: ticket.toString(),
        order_ticket: orderTicket.toString(),
        time: tradeTime - 3600, // 1 hour earlier
        type: Math.random() < 0.5 ? 0 : 1, // BUY or SELL
        entry: 0, // DEAL_ENTRY_IN
        magic: ea.magic,
        profit: 0,
        commission: commission / 2,
        swap: 0,
        volume: ea.volume,
        price: 1.1000 + Math.random() * 0.05,
        symbol: ea.symbol,
        comment: ea.comment
      });

      ticket++;

      // Entry OUT deal (closing the trade)
      deals.push({
        ticket: ticket.toString(),
        order_ticket: orderTicket.toString(),
        time: tradeTime,
        type: Math.random() < 0.5 ? 0 : 1,
        entry: 1, // DEAL_ENTRY_OUT
        magic: ea.magic,
        profit: Number(tradeProfit.toFixed(2)),
        commission: commission / 2,
        swap: Number(swap.toFixed(2)),
        volume: ea.volume,
        price: 1.1000 + Math.random() * 0.05,
        symbol: ea.symbol,
        comment: ea.comment
      });
    }
  }

  // Add a balance deposit deal at the very beginning
  deals.unshift({
    ticket: "499999",
    order_ticket: "1999999",
    time: startTimestamp - 7200,
    type: 2, // DEAL_TYPE_BALANCE (Deposit)
    entry: 2, // DEAL_ENTRY_INOUT
    magic: 0,
    profit: 20000.00,
    commission: 0,
    swap: 0,
    volume: 0,
    price: 0,
    symbol: '',
    comment: 'Initial Deposit'
  });

  return deals;
};

const sendPayload = () => {
  const payload = JSON.stringify({
    account: {
      account_id: '88776655',
      name: 'Trading Portfolio Bot',
      broker: 'Alpari International',
      currency: 'EUR',
      leverage: 500,
      balance: 24350.25,
      equity: 24350.25
    },
    deals: generateMockDeals()
  });

  const url = new URL(serverUrl);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      console.log(`Sync status: ${res.statusCode}`);
      console.log('Response body:', responseData);
    });
  });

  req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
  });

  req.write(payload);
  req.end();
};

sendPayload();
