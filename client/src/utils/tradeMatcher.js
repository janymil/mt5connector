/**
 * Returns true if this comment is NOT an EA name or sub-strategy name.
 * It detects broker-generated tags like [sl 1234.5], [tp 12.3], bank operations, or copy-trade signal hashes.
 */
export function isDynamicComment(comment) {
  if (!comment || comment.trim() === '') return true;
  const t = comment.trim();
  if (/^\[.+\]$/.test(t)) return true;                          // [sl 1234], [tp 1234]
  if (/^(sl|tp)\s+[\d.]+$/i.test(t)) return true;              // bare "sl 1234"
  if (/CardPay|Deposit|Withdrawal|PPF-|Balance/i.test(t)) return true; // bank ops
  // Long random base64/urlsafe string = copy-trade signal id
  if (t.length >= 20 && /^[A-Za-z0-9_\-]{20,}$/.test(t) && !/\s/.test(t)) return true;
  return false;
}

/**
 * Extract and clean the Expert Advisor (EA) base name from a comment string.
 * E.g., "Zilla1" -> "Zilla", "Ultimate Timebomb XAU 2" -> "Ultimate Timebomb".
 */
export function cleanEAName(comment) {
  if (!comment) return null;
  let s = comment.trim();
  if (isDynamicComment(s)) return null;

  s = s.replace(/\s+/g, ' ');

  // 1. Remove underscores and symbol suffix (e.g. _XAUUSD_1, _XAUUSD)
  s = s.replace(/_[A-Z0-9]{3,8}(_\d+)?$/i, '');
  
  // 2. Remove standard suffixes like "- 1. strategy", "- 2. srategy", etc.
  s = s.replace(/\s*[-–]\s*\d+\.?\s*(strategy|strat|srole|srategy|s\d+)?$/i, '');
  
  // 3. Remove DQ strategy/order suffixes: e.g. " S1#1", " B1#1", " S2#1", " S2#2"
  s = s.replace(/\s+[SsBb]\d+#\d+$/, '');
  s = s.replace(/#\d+$/, '');
  s = s.replace(/\s+[SsBb]\d+$/, '');

  // 4. Remove common currency/symbol tags at the end, case insensitively:
  const symbolRegex = /\s*(US30|XAUUSD|BTCUSD|USDJPY|EURUSD|GBPUSD|AUDCAD|NZDCAD|GBPAUD|USTEC|XAU|BTC|EUR|GBP|USD|CAD|AUD|NZD|JPY|CHF)\b/i;
  s = s.replace(symbolRegex, '');

  // 5. Remove trailing digits direct or spaced (e.g., Zilla1 -> Zilla, bitcoin core1 -> bitcoin core)
  s = s.replace(/\d+$/, '');

  // 6. Clean up trailing spaces, dashes, underscores
  s = s.trim().replace(/[\s_\-]+$/, '');

  // 7. Manual normalization maps for known ones
  const lower = s.toLowerCase();
  if (lower.startsWith('ultimate timebomb')) return 'Ultimate Timebomb';
  if (lower.startsWith('range breakout')) return 'Range Breakout';
  if (lower.startsWith('bitcoin core')) return 'Bitcoin Core';
  if (lower.startsWith('daytrade pro')) return 'Daytrade Pro';
  if (lower.startsWith('gold quant ai')) return 'Gold Quant AI';
  if (lower.startsWith('zilla')) return 'Zilla';
  if (lower.startsWith('gold oni') || lower.startsWith('goldoni')) return 'GoldOni';
  if (lower.startsWith('easyai')) return 'EasyAI';
  if (lower.startsWith('easyscalper')) return 'EasyScalper';
  if (lower.startsWith('luna')) return 'LUNA';
  
  if (s === lower) {
    s = s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  return s.length > 0 ? s : null;
}

/**
 * Extract and clean the sub-strategy name from a comment string, preserving
 * the variation numbers/names (e.g., keeping Zilla1, Zilla2, etc. as distinct strategies).
 */
export function cleanStrategyName(comment) {
  if (!comment) return null;
  let s = comment.trim();
  if (isDynamicComment(s)) return null;

  s = s.replace(/\s+/g, ' ');

  // 1. Remove underscores and symbol suffix (e.g. _XAUUSD_1, _XAUUSD)
  s = s.replace(/_[A-Z0-9]{3,8}(_\d+)?$/i, '');
  
  // 2. Remove standard suffixes like "- 1. strategy", "- 2. srategy", etc.
  s = s.replace(/\s*[-–]\s*\d+\.?\s*(strategy|strat|srole|srategy|s\d+)?$/i, '');
  
  // 3. Remove DQ strategy/order suffixes: e.g. " S1#1", " B1#1", " S2#1", " S2#2"
  s = s.replace(/\s+[SsBb]\d+#\d+$/, '');
  s = s.replace(/#\d+$/, '');
  s = s.replace(/\s+[SsBb]\d+$/, '');

  // 4. Clean up trailing spaces, dashes, underscores
  s = s.trim().replace(/[\s_\-]+$/, '');

  // Normalization maps
  const lower = s.toLowerCase();
  if (lower.startsWith('ultimate timebomb')) return s;
  if (lower.startsWith('range breakout')) return s;
  if (lower.startsWith('bitcoin core')) return s;
  if (lower.startsWith('daytrade pro')) return s;
  if (lower.startsWith('gold quant ai')) return s;
  if (lower.startsWith('zilla')) {
    // E.g., make sure Zilla1, Zilla5 are nicely capitalized
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (lower.startsWith('gold oni') || lower.startsWith('goldoni')) return s;
  if (lower.startsWith('easyai')) return s;
  if (lower.startsWith('easyscalper')) return s;
  if (lower.startsWith('luna')) return s;

  return s;
}

/**
 * Chronological FIFO and Position-ID matching of Entry IN and Entry OUT deals into completed trades.
 */
export function matchDealsIntoTrades(deals) {
  // Pass 1: Build magic -> EA name mapping using non-dynamic comments
  const magicToEA = {};
  deals.forEach(deal => {
    if (deal.type !== 0 && deal.type !== 1) return;
    if (deal.magic === 0) return;

    const name = cleanEAName(deal.comment);
    if (name) {
      magicToEA[deal.magic] = name;
    }
  });

  // Sort deals chronologically by time, fallback to ticket number order
  const sortedDeals = [...deals].sort((a, b) => {
    const timeDiff = a.time - b.time;
    if (timeDiff !== 0) return timeDiff;
    return Number(a.ticket) - Number(b.ticket);
  });

  // Separate deals with position_id from those without for precise matching
  const hasPosId = d => d.position_id && d.position_id !== '0' && d.position_id !== '';

  const completedTrades = [];
  const unmatchedCloseDeals = [];

  // Group deals with position_id
  const positionGroups = {};
  const noPosIdDeals = [];

  sortedDeals.forEach(deal => {
    if (deal.type !== 0 && deal.type !== 1) return;

    if (hasPosId(deal)) {
      const pid = deal.position_id;
      if (!positionGroups[pid]) {
        positionGroups[pid] = [];
      }
      positionGroups[pid].push(deal);
    } else {
      noPosIdDeals.push(deal);
    }
  });

  // Process position_id matched deals (perfect MT5 mapping)
  Object.entries(positionGroups).forEach(([pid, group]) => {
    // Sort deals in group: Entry IN first, Entry OUT last
    group.sort((a, b) => a.entry - b.entry);
    
    const entries = group.filter(d => d.entry === 0);
    const exits = group.filter(d => d.entry === 1 || d.entry === 2);

    exits.forEach(exitDeal => {
      // Find matching entry deal (closest in volume or just oldest entry)
      let matchIdx = -1;
      for (let i = 0; i < entries.length; i++) {
        if (Math.abs(entries[i].volume - exitDeal.volume) < 0.0001) {
          matchIdx = i;
          break;
        }
      }
      if (matchIdx === -1 && entries.length > 0) {
        matchIdx = 0;
      }

      if (matchIdx !== -1) {
        const openDeal = entries.splice(matchIdx, 1)[0];
        
        completedTrades.push({
          ticket: exitDeal.ticket,
          openTicket: openDeal.ticket,
          position_id: pid,
          account_id: exitDeal.account_id,
          symbol: exitDeal.symbol,
          type: openDeal.type, // 0 = BUY, 1 = SELL (from opening deal)
          volume: exitDeal.volume,
          openTime: openDeal.time,
          closeTime: exitDeal.time,
          openPrice: openDeal.price,
          closePrice: exitDeal.price,
          commission: openDeal.commission + exitDeal.commission,
          swap: openDeal.swap + exitDeal.swap,
          profit: exitDeal.profit,
          magic: openDeal.magic || exitDeal.magic, // Opening deal preferred
          comment: openDeal.comment || exitDeal.comment, // Opening deal preferred
          eaName: (openDeal.magic !== 0 ? magicToEA[openDeal.magic] : null) || 
                  cleanEAName(openDeal.comment) || 
                  (exitDeal.magic !== 0 ? magicToEA[exitDeal.magic] : null) || 
                  cleanEAName(exitDeal.comment) || 
                  (openDeal.magic > 0 ? `EA_${openDeal.magic}` : 'Manual')
        });
      } else {
        // No entry deal found in this sync batch for this exit
        unmatchedCloseDeals.push(exitDeal);
      }
    });

    // Any remaining entries that weren't matched in the sync batch could be open or matched separately
  });

  // Process no-position_id deals using magic-aware chronological FIFO matching (preventing cross-matching between EAs)
  const openDealsByMagic = {}; // key: accountId_magic_symbol -> array of open deals
  const openDealsGlobal = {};  // key: accountId_symbol -> array of open deals

  noPosIdDeals.forEach(deal => {
    const globalKey = `${deal.account_id}_${deal.symbol}`;
    const magicKey = `${deal.account_id}_${deal.magic}_${deal.symbol}`;

    if (deal.entry === 0) {
      // Entry IN: opening deal
      if (!openDealsByMagic[magicKey]) {
        openDealsByMagic[magicKey] = [];
      }
      openDealsByMagic[magicKey].push(deal);

      if (!openDealsGlobal[globalKey]) {
        openDealsGlobal[globalKey] = [];
      }
      openDealsGlobal[globalKey].push(deal);
    } else if (deal.entry === 1 || deal.entry === 2) {
      // Entry OUT: closing deal
      let matchedOpenDeal = null;
      let matchIdx = -1;

      // Case 1: Close deal has non-zero magic (prefer matching same EA)
      if (deal.magic !== 0) {
        const magicQueue = openDealsByMagic[magicKey] || [];
        // 1. Try to find the oldest open deal with the same volume and opposite type
        for (let i = 0; i < magicQueue.length; i++) {
          if (Math.abs(magicQueue[i].volume - deal.volume) < 0.0001 && magicQueue[i].type !== deal.type) {
            matchIdx = i;
            break;
          }
        }
        // 2. Fallback: oldest open deal with opposite type (different volume)
        if (matchIdx === -1) {
          for (let i = 0; i < magicQueue.length; i++) {
            if (magicQueue[i].type !== deal.type) {
              matchIdx = i;
              break;
            }
          }
        }
        // 3. Fallback: oldest open deal of any type
        if (matchIdx === -1 && magicQueue.length > 0) {
          matchIdx = 0;
        }

        if (matchIdx !== -1) {
          matchedOpenDeal = magicQueue.splice(matchIdx, 1)[0];
          // Also remove from global queue
          const gQueue = openDealsGlobal[globalKey] || [];
          const gIdx = gQueue.findIndex(d => d.ticket === matchedOpenDeal.ticket);
          if (gIdx !== -1) gQueue.splice(gIdx, 1);
        }
      }

      // Case 2: Close deal has magic === 0 OR we didn't find a match in the magic queue
      if (!matchedOpenDeal) {
        const gQueue = openDealsGlobal[globalKey] || [];
        // 1. Try to find the oldest open deal with the same volume and opposite type
        for (let i = 0; i < gQueue.length; i++) {
          if (Math.abs(gQueue[i].volume - deal.volume) < 0.0001 && gQueue[i].type !== deal.type) {
            matchIdx = i;
            break;
          }
        }
        // 2. Fallback: oldest open deal with opposite type
        if (matchIdx === -1) {
          for (let i = 0; i < gQueue.length; i++) {
            if (gQueue[i].type !== deal.type) {
              matchIdx = i;
              break;
            }
          }
        }
        // 3. Fallback: oldest open deal of any type
        if (matchIdx === -1 && gQueue.length > 0) {
          matchIdx = 0;
        }

        if (matchIdx !== -1) {
          matchedOpenDeal = gQueue.splice(matchIdx, 1)[0];
          // Also remove from magic queue
          const mKey = `${deal.account_id}_${matchedOpenDeal.magic}_${deal.symbol}`;
          const mQueue = openDealsByMagic[mKey] || [];
          const mIdx = mQueue.findIndex(d => d.ticket === matchedOpenDeal.ticket);
          if (mIdx !== -1) mQueue.splice(mIdx, 1);
        }
      }

      if (matchedOpenDeal) {
        completedTrades.push({
          ticket: deal.ticket,
          openTicket: matchedOpenDeal.ticket,
          position_id: null,
          account_id: deal.account_id,
          symbol: deal.symbol,
          type: matchedOpenDeal.type, // 0 = BUY, 1 = SELL (from opening deal)
          volume: deal.volume,
          openTime: matchedOpenDeal.time,
          closeTime: deal.time,
          openPrice: matchedOpenDeal.price,
          closePrice: deal.price,
          commission: matchedOpenDeal.commission + deal.commission,
          swap: matchedOpenDeal.swap + deal.swap,
          profit: deal.profit,
          magic: matchedOpenDeal.magic || deal.magic,
          comment: matchedOpenDeal.comment || deal.comment,
          eaName: (matchedOpenDeal.magic !== 0 ? magicToEA[matchedOpenDeal.magic] : null) || 
                  cleanEAName(matchedOpenDeal.comment) || 
                  (deal.magic !== 0 ? magicToEA[deal.magic] : null) || 
                  cleanEAName(deal.comment) || 
                  (matchedOpenDeal.magic > 0 ? `EA_${matchedOpenDeal.magic}` : 'Manual')
        });
      } else {
        unmatchedCloseDeals.push(deal);
      }
    }
  });

  // Convert unmatched closing deals into trades using direction conversion
  unmatchedCloseDeals.forEach(deal => {
    // If the close deal is a SELL, the trade was a BUY. If close deal is BUY, trade was SELL.
    const openType = deal.type === 0 ? 1 : 0;
    
    completedTrades.push({
      ticket: deal.ticket,
      openTicket: null,
      position_id: deal.position_id || null,
      account_id: deal.account_id,
      symbol: deal.symbol,
      type: openType,
      volume: deal.volume,
      openTime: null,
      closeTime: deal.time,
      openPrice: null,
      closePrice: deal.price,
      commission: deal.commission,
      swap: deal.swap,
      profit: deal.profit,
      magic: deal.magic,
      comment: deal.comment,
      eaName: (deal.magic !== 0 ? magicToEA[deal.magic] : null) || 
              cleanEAName(deal.comment) || 
              (deal.magic > 0 ? `EA_${deal.magic}` : 'Manual')
    });
  });

  // Sort completed trades by closeTime descending
  return completedTrades.sort((a, b) => b.closeTime - a.closeTime);
}
