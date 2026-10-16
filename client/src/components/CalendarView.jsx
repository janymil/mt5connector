import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Info } from 'lucide-react';
import { matchDealsIntoTrades } from '../utils/tradeMatcher.js';

export default function CalendarView({ deals = [], currency = 'USD', accounts = [], selectedAccountId = 'all' }) {
  
  // Reconstruct completed trades from raw deals
  const trades = useMemo(() => {
    return matchDealsIntoTrades(deals);
  }, [deals]);

  // Set current viewed calendar month/year
  // Default to the month of the most recent trade, or current month if empty
  const [currentDate, setCurrentDate] = useState(() => {
    if (trades.length > 0) {
      const latestTradeTime = Math.max(...trades.map(t => t.closeTime));
      return new Date(latestTradeTime * 1000);
    }
    return new Date();
  });

  const [selectedDayKey, setSelectedDayKey] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Reconstruct balances over time to calculate daily percentage returns
  const dailyData = useMemo(() => {
    // Sort trades chronologically
    const sortedTrades = [...trades].sort((a, b) => a.closeTime - b.closeTime);

    // Get current balance
    const currentBalance = accounts.length > 0 
      ? (selectedAccountId === 'all' 
          ? accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) 
          : (accounts.find(a => a.account_id === selectedAccountId)?.balance || 0)
        ) 
      : 0;

    // Work backwards to find balance at the end of each day
    let runningBalance = currentBalance;
    const tradeBalances = new Map(); // trade.ticket -> balance after trade

    for (let i = sortedTrades.length - 1; i >= 0; i--) {
      const t = sortedTrades[i];
      tradeBalances.set(t.ticket, runningBalance);
      runningBalance -= (t.profit + t.commission + t.swap);
    }

    const data = {};
    trades.forEach(t => {
      const dateObj = new Date(t.closeTime * 1000);
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;

      const netProfit = t.profit + t.commission + t.swap;

      if (!data[dateKey]) {
        data[dateKey] = {
          netProfit: 0,
          trades: [],
          winCount: 0,
          lossCount: 0,
          endBalance: 0
        };
      }

      const dayData = data[dateKey];
      dayData.netProfit += netProfit;
      dayData.trades.push(t);
      if (netProfit > 0) {
        dayData.winCount++;
      } else if (netProfit < 0) {
        dayData.lossCount++;
      }

      // Record balance after the latest deal of this day
      const tradeBal = tradeBalances.get(t.ticket);
      if (tradeBal !== undefined) {
        dayData.endBalance = tradeBal;
      }
    });

    // Calculate percentage return for each day
    Object.keys(data).forEach(dateKey => {
      const dayData = data[dateKey];
      const startBalance = dayData.endBalance - dayData.netProfit;
      dayData.percentageGain = startBalance > 0 ? (dayData.netProfit / startBalance) * 100 : 0;
    });

    return data;
  }, [trades, accounts, selectedAccountId]);

  // Calculate statistics for the currently viewed month (USD & Percentage)
  const monthStats = useMemo(() => {
    let totalProfit = 0;
    let tradesCount = 0;

    // Filter trades in the viewed month
    const monthTrades = trades.filter(t => {
      const date = new Date(t.closeTime * 1000);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    monthTrades.forEach(t => {
      totalProfit += (t.profit + t.commission + t.swap);
      tradesCount++;
    });

    // Get current balance
    const currentBalance = accounts.length > 0 
      ? (selectedAccountId === 'all' 
          ? accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) 
          : (accounts.find(a => a.account_id === selectedAccountId)?.balance || 0)
        ) 
      : 0;

    // Reconstruct the balance at the end of the viewed month
    const nextMonthStart = new Date(year, month + 1, 1).getTime() / 1000;
    const tradesAfterMonth = trades.filter(t => t.closeTime >= nextMonthStart);

    let runningBalance = currentBalance;
    tradesAfterMonth.forEach(t => {
      runningBalance -= (t.profit + t.commission + t.swap);
    });

    const monthEndBalance = runningBalance;
    const monthStartBalance = monthEndBalance - totalProfit;
    const percentage = monthStartBalance > 0 ? (totalProfit / monthStartBalance) * 100 : 0;

    return {
      profit: totalProfit,
      percentage,
      tradesCount
    };
  }, [trades, year, month, accounts, selectedAccountId]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayKey(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayKey(null);
  };

  // Generate dates for calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1, ...
  
  // Shift first day index so Monday is 0. 
  const startingDayPadding = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Previous month's padding cells
    for (let i = 0; i < startingDayPadding; i++) {
      days.push({ isEmpty: true, id: `pad-prev-${i}` });
    }

    // Current month's day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dayKey = `${year}-${monthStr}-${dayStr}`;
      
      const stats = dailyData[dayKey] || null;

      days.push({
        isEmpty: false,
        id: dayKey,
        dayNumber: d,
        dayKey,
        stats
      });
    }

    // Next month's padding cells to round up to complete week rows
    const totalCells = days.length;
    const remainingPadding = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < remainingPadding; i++) {
      days.push({ isEmpty: true, id: `pad-next-${i}` });
    }

    return days;
  }, [year, month, dailyData, daysInMonth, startingDayPadding]);

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val);
  };

  const selectedDayData = selectedDayKey ? dailyData[selectedDayKey] : null;

  return (
    <div className="calendar-card animate-fade-in">
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Daily Profit & Loss Calendar</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Monday-starting grid showing completed closed trades</p>
            </div>
            {monthStats.tradesCount > 0 && (
              <div style={{ 
                fontSize: '0.85rem', 
                background: monthStats.profit >= 0 ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                color: monthStats.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span>{monthName} P&L:</span>
                <span>{monthStats.profit >= 0 ? '+' : ''}{formatCurrency(monthStats.profit)} ({monthStats.profit >= 0 ? '+' : ''}{monthStats.percentage.toFixed(2)}%)</span>
              </div>
            )}
          </div>
          <div className="calendar-controls">
            <button className="calendar-btn" onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <span className="calendar-month-year" style={{ minWidth: '130px', textAlign: 'center' }}>{monthName} {year}</span>
            <button className="calendar-btn" onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {/* Weekday headers */}
          {weekdays.map(d => (
            <div key={d} className="weekday-header">{d}</div>
          ))}

          {/* Days cells */}
          {calendarDays.map((cell) => {
            if (cell.isEmpty) {
              return <div key={cell.id} className="calendar-day empty"></div>;
            }

            const stats = cell.stats;
            const profitClass = stats ? (stats.netProfit >= 0 ? 'profit' : 'loss') : '';
            const cellClass = stats ? (stats.netProfit >= 0 ? 'day-has-profit' : 'day-has-loss') : '';

            return (
              <div 
                key={cell.id} 
                className={`calendar-day ${cellClass}`}
                onClick={() => stats && setSelectedDayKey(cell.dayKey)}
                style={{ cursor: stats ? 'pointer' : 'default', minHeight: '85px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span className="day-number">{cell.dayNumber}</span>
                  {stats && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {stats.trades.length}T
                    </span>
                  )}
                </div>
                {stats && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '0.2rem', width: '100%' }}>
                    <div className={`day-profit ${profitClass}`} style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(0)}
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem', 
                      color: stats.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                      opacity: 0.85, 
                      fontWeight: 600,
                      marginTop: '1px'
                    }}>
                      {stats.netProfit >= 0 ? '+' : ''}{stats.percentageGain.toFixed(2)}%
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-out Drawer for Daily Trade Details */}
      {selectedDayKey && selectedDayData && (
        <div className="drawer-overlay" onClick={() => setSelectedDayKey(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Trades on {new Date(selectedDayKey).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  Net Profit: <span className={selectedDayData.netProfit >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 'bold' }}>
                    {formatCurrency(selectedDayData.netProfit)} ({selectedDayData.netProfit >= 0 ? '+' : ''}{selectedDayData.percentageGain.toFixed(2)}%)
                  </span>
                </p>
              </div>
              <button className="drawer-close" onClick={() => setSelectedDayKey(null)}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)', paddingRight: '0.25rem' }}>
              {selectedDayData.trades.map((trade) => {
                const tradeProfit = trade.profit + trade.commission + trade.swap;
                return (
                  <div key={trade.ticket} className="card" style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        {trade.symbol} <span className={`badge ${trade.type === 0 ? 'bg-profit' : 'bg-loss'}`} style={{ marginLeft: '0.5rem' }}>{trade.type === 0 ? 'BUY' : 'SELL'}</span>
                      </span>
                      <span className={tradeProfit >= 0 ? 'text-profit' : 'text-loss'} style={{ fontWeight: 'bold' }}>
                        {tradeProfit >= 0 ? '+' : ''}{formatCurrency(tradeProfit)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div>Ticket: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{trade.ticket}</span></div>
                      <div>Volume: <span style={{ color: '#fff' }}>{trade.volume.toFixed(2)} Lots</span></div>
                      <div>Price: <span style={{ color: '#fff' }}>{trade.openPrice ? trade.openPrice.toFixed(5) : '-'} &rarr; {trade.closePrice ? trade.closePrice.toFixed(5) : '-'}</span></div>
                      <div>Time: <span style={{ color: '#fff' }}>{trade.closeTime ? new Date(trade.closeTime * 1000).toLocaleTimeString() : '-'}</span></div>
                      <div>Magic: <span style={{ color: '#fff' }}>{trade.magic === 0 ? 'Manual' : trade.magic}</span></div>
                      <div>
                        Comment: <span style={{ color: '#fff' }}>{trade.comment || 'None'}</span>
                        {trade.eaName && trade.eaName !== trade.comment && (
                          <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                            [{trade.eaName}]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
