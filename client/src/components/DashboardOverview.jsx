import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Percent, 
  BarChart3, 
  DollarSign, 
  Activity,
  Clock,
  ShieldAlert,
  Shuffle,
  GitCommit,
  Cpu,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  TrendingDown,
  Settings
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import { matchDealsIntoTrades, cleanEAName } from '../utils/tradeMatcher.js';

export default function DashboardOverview({ deals = [], rawDeals = [], positions = [], currency = 'USD', accounts = [], selectedAccountId = 'all', onAccountTypeChange }) {
  
  // Current selected single account (null if a group is selected)
  const selectedAccount = useMemo(() => {
    if (['all', 'all_live', 'all_demo', 'all_prop'].includes(selectedAccountId)) return null;
    return accounts.find(a => a.account_id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const getAccountTag = (acc) => {
    if (!acc) return 'Live';
    if (acc.account_type === 'Prop') return 'Prop';
    if (acc.trade_mode === 'Demo') return 'Demo';
    return 'Live';
  };

  const handleTypeChange = async (newType) => {
    if (!selectedAccount) return;
    try {
      const res = await fetch(`/api/accounts/${selectedAccount.account_id}/type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_type: newType })
      });
      if (res.ok && onAccountTypeChange) {
        onAccountTypeChange(); // triggers accounts re-fetch in parent
      }
    } catch (err) {
      console.error('Failed to update account type:', err);
    }
  };
  
  // Helper: filter accounts array to match the current selectedAccountId group
  const getAccountsForSelection = (accountList, selId) => {
    if (selId === 'all_live') return accountList.filter(a => (!a.trade_mode || a.trade_mode === 'Live') && a.account_type !== 'Prop');
    if (selId === 'all_demo') return accountList.filter(a => a.trade_mode === 'Demo');
    if (selId === 'all_prop') return accountList.filter(a => a.account_type === 'Prop');
    if (selId === 'all') return accountList;
    return accountList.filter(a => a.account_id === selId);
  };

  // Reconstruct completed trades from raw deals
  const trades = useMemo(() => {
    return matchDealsIntoTrades(deals);
  }, [deals]);

  // 1. Core performance statistics & Advanced Metrics
  const stats = useMemo(() => {
    if (!trades.length) {
      return {
        netProfit: 0,
        winRate: 0,
        profitFactor: 0,
        totalTrades: 0,
        avgTrade: 0,
        totalCommission: 0,
        totalSwap: 0,
        volume: 0,
        avgHoldTimeStr: '-',
        longestHoldTimeStr: '-',
        shortestHoldTimeStr: '-',
        maxDrawdown: 0,
        riskRewardRatio: 0,
        longCount: 0,
        longWinRate: 0,
        shortCount: 0,
        shortWinRate: 0,
        maxProfitTrade: { profit: 0, symbol: '', time: null },
        maxLossTrade: { profit: 0, symbol: '', time: null },
        gainPercentage: 0,
        avgWin: 0,
        avgLoss: 0
      };
    }

    let grossProfit = 0;
    let grossLoss = 0;
    let winCount = 0;
    let lossCount = 0;
    let netProfit = 0;
    let totalCommission = 0;
    let totalSwap = 0;
    let totalVolume = 0;

    // Ratios
    let longCount = 0;
    let longWins = 0;
    let shortCount = 0;
    let shortWins = 0;

    let totalDuration = 0;
    let matchedCount = 0;
    let longestHoldSeconds = 0;
    let shortestHoldSeconds = Infinity;

    // Sort trade deals exit chronologically for drawdown calculations
    const sortedTrades = [...trades].sort((a, b) => a.closeTime - b.closeTime);

    let runningEquity = 0;
    let peakEquity = 0;
    let maxDrawdown = 0;

    let maxProfitTrade = { profit: 0, symbol: '', time: null };
    let maxLossTrade = { profit: 0, symbol: '', time: null };

    sortedTrades.forEach(trade => {
      const tradeProfit = trade.profit + trade.commission + trade.swap;
      netProfit += tradeProfit;
      totalCommission += trade.commission;
      totalSwap += trade.swap;
      totalVolume += trade.volume;

      // Group BUY vs SELL (0 = BUY, 1 = SELL in MT5)
      if (trade.type === 0) {
        longCount++;
        if (tradeProfit > 0) longWins++;
      } else if (trade.type === 1) {
        shortCount++;
        if (tradeProfit > 0) shortWins++;
      }

      if (tradeProfit > 0) {
        grossProfit += tradeProfit;
        winCount++;
        if (tradeProfit > maxProfitTrade.profit) {
          maxProfitTrade = { profit: tradeProfit, symbol: trade.symbol, time: trade.closeTime };
        }
      } else if (tradeProfit < 0) {
        grossLoss += Math.abs(tradeProfit);
        lossCount++;
        if (tradeProfit < maxLossTrade.profit) {
          maxLossTrade = { profit: tradeProfit, symbol: trade.symbol, time: trade.closeTime };
        }
      }

      // Drawdown calculation
      runningEquity += tradeProfit;
      if (runningEquity > peakEquity) {
        peakEquity = runningEquity;
      }
      const currentDrawdown = peakEquity - runningEquity;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }

      // Hold time calculation
      if (trade.openTime && trade.closeTime) {
        const duration = trade.closeTime - trade.openTime;
        if (duration >= 0) {
          totalDuration += duration;
          matchedCount++;
          if (duration > longestHoldSeconds) longestHoldSeconds = duration;
          if (duration < shortestHoldSeconds) shortestHoldSeconds = duration;
        }
      }
    });

    const avgHoldSeconds = matchedCount > 0 ? totalDuration / matchedCount : 0;
    const finalShortestHold = shortestHoldSeconds === Infinity ? 0 : shortestHoldSeconds;

    const formatSeconds = (sec) => {
      if (sec === undefined || sec === null || sec < 0) return '-';
      if (sec === 0) return '0s';
      const m = Math.floor(sec / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);

      if (d > 0) {
        return `${d}d ${h % 24}h ${m % 60}m`;
      } else if (h > 0) {
        return `${h}h ${m % 60}m`;
      } else if (m > 0) {
        return `${m}m ${Math.floor(sec % 60)}s`;
      } else {
        return `${Math.floor(sec)}s`;
      }
    };

    const avgHoldTimeStr = matchedCount > 0 ? formatSeconds(avgHoldSeconds) : '-';
    const longestHoldTimeStr = matchedCount > 0 ? formatSeconds(longestHoldSeconds) : '-';
    const shortestHoldTimeStr = matchedCount > 0 ? formatSeconds(finalShortestHold) : '-';

    const totalTrades = winCount + lossCount;
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const avgTrade = totalTrades > 0 ? netProfit / totalTrades : 0;

    // Risk / Reward Ratio: Avg Win / Avg Loss
    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;

    const longWinRate = longCount > 0 ? (longWins / longCount) * 100 : 0;
    const shortWinRate = shortCount > 0 ? (shortWins / shortCount) * 100 : 0;

    // Gain Percentage ROI calculation — use only accounts matching the current selection
    const filteredAccsForBalance = getAccountsForSelection(accounts, selectedAccountId);
    const currentBalance = filteredAccsForBalance.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    const startingBalance = currentBalance - netProfit;
    const gainPercentage = startingBalance > 0 ? (netProfit / startingBalance) * 100 : 0;

    return {
      netProfit,
      winRate,
      profitFactor,
      totalTrades,
      avgTrade,
      totalCommission,
      totalSwap,
      volume: totalVolume,
      avgHoldTimeStr,
      longestHoldTimeStr,
      shortestHoldTimeStr,
      maxDrawdown,
      riskRewardRatio,
      longCount,
      longWinRate,
      shortCount,
      shortWinRate,
      maxProfitTrade,
      maxLossTrade,
      gainPercentage,
      avgWin,
      avgLoss
    };
  }, [trades, accounts, selectedAccountId]);

  // Parse balance operations (deposits/withdrawals) from date-filtered deals
  // MT5 deal type 2 = balance operation. Positive = deposit, Negative = withdrawal.
  const balanceStats = useMemo(() => {
    // 'deals' is already filtered by both account group AND date range
    const balanceOps = deals.filter(d => d.type === 2);

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let depositCount = 0;
    let withdrawalCount = 0;

    balanceOps.forEach(op => {
      if (op.profit > 0) {
        totalDeposits += op.profit;
        depositCount++;
      } else if (op.profit < 0) {
        totalWithdrawals += Math.abs(op.profit);
        withdrawalCount++;
      }
    });

    // Current balance: sum only accounts that match the active selection filter
    const filteredAccsForBalance = getAccountsForSelection(accounts, selectedAccountId);
    const currentBalance = filteredAccsForBalance.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Initial balance at START of period:
    //   currentBalance = initialBalance + periodNetProfit + periodDeposits - periodWithdrawals
    //   → initialBalance = currentBalance - periodNetProfit - periodDeposits + periodWithdrawals
    // This formula works correctly for ALL date filters and for any number of accounts,
    // because it only uses the same period data that is already account-filtered.
    const initialBalance = currentBalance - stats.netProfit - totalDeposits + totalWithdrawals;

    // Gain % = period net profit / (balance at start of period + deposits made in period)
    const effectiveBase = initialBalance + totalDeposits;
    const gainPercentage = effectiveBase > 0 ? (stats.netProfit / effectiveBase) * 100 : 0;

    return {
      initialBalance: Math.max(0, initialBalance),
      totalDeposits,
      totalWithdrawals,
      depositCount,
      withdrawalCount,
      gainPercentage
    };
  }, [deals, accounts, selectedAccountId, stats.netProfit]);


  // Generate stats per symbol/instrument
  const symbolStats = useMemo(() => {
    const syms = {};
    trades.forEach(trade => {
      const symbol = trade.symbol || 'Unknown';
      const profit = trade.profit + trade.commission + trade.swap;

      if (!syms[symbol]) {
        syms[symbol] = {
          symbol,
          trades: 0,
          winCount: 0,
          lossCount: 0,
          grossProfit: 0,
          grossLoss: 0,
          netProfit: 0,
          volume: 0
        };
      }

      const s = syms[symbol];
      s.trades++;
      s.netProfit += profit;
      s.volume += trade.volume;
      if (profit > 0) {
        s.grossProfit += profit;
        s.winCount++;
      } else if (profit < 0) {
        s.grossLoss += Math.abs(profit);
        s.lossCount++;
      }
    });

    return Object.values(syms).map(s => {
      const winRate = s.trades > 0 ? (s.winCount / s.trades) * 100 : 0;
      const profitFactor = s.grossLoss > 0 ? s.grossProfit / s.grossLoss : s.grossProfit > 0 ? 99.9 : 0;
      const avgTrade = s.trades > 0 ? s.netProfit / s.trades : 0;
      return {
        ...s,
        winRate,
        profitFactor,
        avgTrade
      };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }, [trades]);

  // Coordinated colors for pie segments
  const PIE_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#fb7185', '#f59e0b', '#ec4899', '#14b8a6'];

  const pieData = useMemo(() => {
    return symbolStats.map(s => ({
      name: s.symbol,
      value: s.trades,
      profit: s.netProfit
    }));
  }, [symbolStats]);

  // Generate chart data: Cumulative profit curve over time
  const chartData = useMemo(() => {
    if (!trades.length) return [];

    const sortedTrades = [...trades].sort((a, b) => a.closeTime - b.closeTime);

    let cumulativeProfit = 0;
    return sortedTrades.map((trade, idx) => {
      cumulativeProfit += (trade.profit + trade.commission + trade.swap);
      const date = new Date(trade.closeTime * 1000).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric' 
      });
      return {
        tradeIndex: idx + 1,
        date,
        profit: Number(cumulativeProfit.toFixed(2)),
        tradeProfit: Number((trade.profit + trade.commission + trade.swap).toFixed(2)),
        symbol: trade.symbol,
      };
    });
  }, [trades]);

  // Generate return stats for Today, 7 Days, 30 Days, All Time, and Active global period
  const periodStats = useMemo(() => {
    const currentBalance = accounts.length > 0 
      ? (selectedAccountId === 'all' 
          ? accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0) 
          : (accounts.find(a => a.account_id === selectedAccountId)?.balance || 0)
        ) 
      : 0;

    const accountTrades = selectedAccountId === 'all' 
      ? trades 
      : trades.filter(t => t.account_id === selectedAccountId);

    const now = Math.floor(Date.now() / 1000);
    const oneDay = 24 * 60 * 60;

    // Start times
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);
    const todayStart = Math.floor(startOfToday.getTime() / 1000);
    const sevenDaysAgo = now - 7 * oneDay;
    const thirtyDaysAgo = now - 30 * oneDay;

    const calculateForPeriod = (startTime, endTime = null) => {
      const periodTrades = accountTrades.filter(t => t.closeTime >= startTime && (!endTime || t.closeTime <= endTime));
      const profit = periodTrades.reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0);

      const tradesAfterStart = accountTrades.filter(t => t.closeTime >= startTime);
      const totalProfitAfterStart = tradesAfterStart.reduce((sum, t) => sum + t.profit + t.commission + t.swap, 0);

      const startBalance = currentBalance - totalProfitAfterStart;
      const percentage = startBalance > 0 ? (profit / startBalance) * 100 : 0;

      return { profit, percentage, tradesCount: periodTrades.length };
    };

    // Calculate active period stats
    let activeProfit = stats.netProfit;
    let activePercentage = stats.gainPercentage;
    let activeTradesCount = stats.totalTrades;

    return {
      today: calculateForPeriod(todayStart),
      week: calculateForPeriod(sevenDaysAgo),
      month: calculateForPeriod(thirtyDaysAgo),
      total: calculateForPeriod(0),
      active: { profit: activeProfit, percentage: activePercentage, tradesCount: activeTradesCount }
    };
  }, [trades, accounts, selectedAccountId, stats]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)'
        }}>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Trade #{data.tradeIndex} ({data.date})</p>
          <p style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.25rem' }}>
            Equity Profit: <span className={data.profit >= 0 ? 'text-profit' : 'text-loss'}>{formatCurrency(data.profit)}</span>
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Last Trade: {data.symbol} ({data.tradeProfit >= 0 ? '+' : ''}{formatCurrency(data.tradeProfit)})
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in">

      {/* Account Type Toggle — shown only when a single account is selected */}
      {selectedAccount && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
            <Settings size={15} style={{ color: 'var(--color-accent)' }} />
            <span>Account Category:</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { key: 'Live', label: '🟢 Live', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
              { key: 'Prop', label: '🏆 Prop Firm', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
              { key: 'Demo', label: '🔵 Demo', color: 'var(--color-accent)', bg: 'rgba(99,102,241,0.12)' },
            ].map(({ key, label, color, bg }) => {
              const isActive = getAccountTag(selectedAccount) === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTypeChange(key)}
                  style={{
                    padding: '0.35rem 0.9rem',
                    borderRadius: '8px',
                    border: isActive ? `1.5px solid ${color}` : '1.5px solid rgba(255,255,255,0.08)',
                    background: isActive ? bg : 'transparent',
                    color: isActive ? color : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {label}
                  {isActive && ' ✓'}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {selectedAccount.broker} · #{selectedAccount.account_id}
          </span>
        </div>
      )}

      {/* Account Summary Row - Initial Balance, Deposits, Withdrawals, Net Profit, Gain */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Initial Balance */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="metric-icon bg-neutral" style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }}>
            <Wallet size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Initial Balance</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--text-primary)', marginTop: '0.1rem' }}>{formatCurrency(balanceStats.initialBalance)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>At start of period</div>
          </div>
        </div>

        {/* Deposits */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="metric-icon bg-profit" style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }}>
            <ArrowDownCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Deposits</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--color-success)', marginTop: '0.1rem' }}>+{formatCurrency(balanceStats.totalDeposits)}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{balanceStats.depositCount} transaction{balanceStats.depositCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Withdrawals */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="metric-icon bg-loss" style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }}>
            <ArrowUpCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Withdrawals</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: balanceStats.totalWithdrawals > 0 ? 'var(--color-error)' : 'var(--text-primary)', marginTop: '0.1rem' }}>
              {balanceStats.totalWithdrawals > 0 ? `-${formatCurrency(balanceStats.totalWithdrawals)}` : formatCurrency(0)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{balanceStats.withdrawalCount} transaction{balanceStats.withdrawalCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`metric-icon ${stats.netProfit >= 0 ? 'bg-profit' : 'bg-loss'}`} style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Net Profit</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: stats.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)', marginTop: '0.1rem' }}>
              {stats.netProfit >= 0 ? '+' : ''}{formatCurrency(stats.netProfit)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>After commissions & swaps</div>
          </div>
        </div>

        {/* Gain % */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`metric-icon ${balanceStats.gainPercentage >= 0 ? 'bg-profit' : 'bg-loss'}`} style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0 }}>
            <Percent size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Gain</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: balanceStats.gainPercentage >= 0 ? 'var(--color-success)' : 'var(--color-error)', marginTop: '0.1rem' }}>
              {balanceStats.gainPercentage >= 0 ? '+' : ''}{balanceStats.gainPercentage.toFixed(2)}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Return on capital</div>
          </div>
        </div>
      </div>

      {/* Metrics Row 1 */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Net Profit</span>
            <div className={`metric-icon ${stats.netProfit >= 0 ? 'bg-profit' : 'bg-loss'}`}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className={`metric-value ${stats.netProfit >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(stats.netProfit)}
              </span>
              {balanceStats.gainPercentage !== 0 && (
                <span className={`badge ${stats.netProfit >= 0 ? 'text-profit' : 'text-loss'}`} style={{ 
                  fontSize: '0.85rem', 
                  padding: '3px 8px', 
                  borderRadius: '6px',
                  fontWeight: 600,
                  background: stats.netProfit >= 0 ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}>
                  {balanceStats.gainPercentage >= 0 ? '+' : ''}{balanceStats.gainPercentage.toFixed(2)}%
                </span>
              )}
            </div>
            <span className="metric-desc">Total returns after commissions & swaps</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Win Rate</span>
            <div className="metric-icon bg-neutral">
              <Percent size={20} />
            </div>
          </div>
          <div>
            <div className="metric-value">{stats.winRate.toFixed(1)}%</div>
            <span className="metric-desc">Of {stats.totalTrades} total completed trades</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Profit Factor</span>
            <div className="metric-icon bg-neutral">
              <BarChart3 size={20} />
            </div>
          </div>
          <div>
            <div className="metric-value">{stats.profitFactor.toFixed(2)}</div>
            <span className="metric-desc">Gross Profit / Gross Loss ratio</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Avg. Profit / Trade</span>
            <div className={`metric-icon ${stats.avgTrade >= 0 ? 'bg-profit' : 'bg-loss'}`}>
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <div className={`metric-value ${stats.avgTrade >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatCurrency(stats.avgTrade)}
            </div>
            <span className="metric-desc">Average profit per trade</span>
          </div>
        </div>
      </div>

      {/* Metrics Row 2: Advanced Metrics */}
      <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Max Drawdown</span>
            <div className="metric-icon bg-loss">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div>
            <div className="metric-value text-loss" style={{ color: 'var(--color-error)' }}>
              {formatCurrency(stats.maxDrawdown)}
            </div>
            <span className="metric-desc">Peak-to-valley account equity drop</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Hold Time Summary</span>
            <div className="metric-icon bg-neutral">
              <Clock size={20} />
            </div>
          </div>
          <div>
            <div className="metric-value">{stats.avgHoldTimeStr}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.2rem' }}>
              <div>Longest: <span style={{ color: '#fff', fontWeight: 500 }}>{stats.longestHoldTimeStr}</span></div>
              <div>Shortest: <span style={{ color: '#fff', fontWeight: 500 }}>{stats.shortestHoldTimeStr}</span></div>
            </div>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Risk:Reward Ratio</span>
            <div className="metric-icon bg-neutral">
              <Shuffle size={20} />
            </div>
          </div>
          <div>
            <div className="metric-value">1 : {stats.riskRewardRatio.toFixed(2)}</div>
            <span className="metric-desc">Ratio of Avg. Win to Avg. Loss</span>
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">
            <span className="metric-title">Long/Short Win Rate</span>
            <div className="metric-icon bg-neutral">
              <GitCommit size={20} />
            </div>
          </div>
          <div>
            <div className="metric-value" style={{ fontSize: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ fontSize: '1.05rem' }}>L: {stats.longCount} ({stats.longWinRate.toFixed(0)}% win)</div>
              <div style={{ fontSize: '1.05rem' }}>S: {stats.shortCount} ({stats.shortWinRate.toFixed(0)}% win)</div>
            </div>
            <span className="metric-desc">Buy (L) and Sell (S) breakdown</span>
          </div>
        </div>
      </div>

      {/* Auxiliary Statistics Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div className="metric-icon bg-neutral" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>TOTAL VOLUME</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>{stats.volume.toFixed(2)} Lots</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div className="metric-icon bg-loss" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>COMMISSIONS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--color-error)' }}>
              {formatCurrency(stats.totalCommission)}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem' }}>
          <div className="metric-icon bg-loss" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>SWAPS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-title)', color: 'var(--color-error)' }}>
              {formatCurrency(stats.totalSwap)}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Period Return Performance Summary */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
          <TrendingUp size={18} style={{ color: 'var(--color-accent)' }} />
          <span>Multi-Period Return Performance</span>
        </h3>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ fontSize: '0.85rem', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: 'transparent' }}>
                <th style={{ padding: '0.6rem 0.8rem' }}>Period</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Completed Trades</th>
                <th style={{ padding: '0.6rem 0.8rem' }}>Net Profit ({currency})</th>
                <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Percentage Return</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Today (1 Day)', data: periodStats.today },
                { label: 'Last 7 Days (1 Week)', data: periodStats.week },
                { label: 'Last 30 Days (1 Month)', data: periodStats.month },
                { label: 'Active Filter Period', data: periodStats.active, highlight: true },
                { label: 'All Time (Total)', data: periodStats.total }
              ].map((row, idx) => {
                const isProfit = row.data.profit >= 0;
                return (
                  <tr key={idx} style={{ 
                    backgroundColor: row.highlight ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                    borderLeft: row.highlight ? '3px solid var(--color-accent)' : 'none'
                  }}>
                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: row.highlight ? 700 : 500 }}>
                      {row.label}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem' }}>{row.data.tradesCount} trades</td>
                    <td style={{ padding: '0.6rem 0.8rem', fontWeight: 'bold' }} className={isProfit ? 'text-profit' : 'text-loss'}>
                      {isProfit ? '+' : ''}{formatCurrency(row.data.profit)}
                    </td>
                    <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 'bold' }} className={isProfit ? 'text-profit' : 'text-loss'}>
                      <span className={`badge ${isProfit ? 'text-profit' : 'text-loss'}`} style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        background: isProfit ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        {isProfit ? '+' : ''}{row.data.percentage.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Open Positions Card */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
          <Activity size={18} style={{ color: 'var(--color-accent)' }} />
          <span>Active Open Positions {positions && positions.length > 0 ? `(${positions.length})` : ''}</span>
        </h3>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          {positions && positions.length > 0 ? (
            <table className="custom-table" style={{ fontSize: '0.85rem', width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: 'transparent' }}>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Ticket</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Symbol</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Type</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Volume</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Open Price</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Current Price</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Swap / Commission</th>
                  <th style={{ padding: '0.6rem 0.8rem' }}>Comment (EA)</th>
                  <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Profit ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const isBuy = pos.type === 0;
                  const netProfit = pos.profit + pos.commission + pos.swap;
                  const eaName = cleanEAName(pos.comment);
                  return (
                    <tr key={pos.ticket}>
                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>#{pos.ticket}</td>
                      <td style={{ padding: '0.6rem 0.8rem', fontWeight: 700 }}>{pos.symbol}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        <span className={`badge ${isBuy ? 'text-profit' : 'text-loss'}`} style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          background: isBuy ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                        }}>
                          {isBuy ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{pos.volume.toFixed(2)}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{pos.price_open.toFixed(5)}</td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>{pos.price_current.toFixed(5)}</td>
                      <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-secondary)' }}>
                        {formatCurrency(pos.swap)} / {formatCurrency(pos.commission)}
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem' }}>
                        {eaName ? (
                          <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{eaName}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Manual</span>
                        )}
                        {pos.comment && (!eaName || eaName.toLowerCase() !== pos.comment.toLowerCase()) && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>({pos.comment})</span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right', fontWeight: 'bold' }} className={netProfit >= 0 ? 'text-profit' : 'text-loss'}>
                        {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100px', color: 'var(--text-muted)' }}>
              <Activity size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
              <span>No active open trades at the moment.</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="card chart-card">
        <div className="chart-title">
          <span>Cumulative Profit Growth</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Based on closed deals</span>
        </div>
        <div className="chart-container">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="tradeIndex" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="var(--color-accent)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#profitGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '280px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No closed trade deals found for the selected period.
            </div>
          )}
        </div>
      </div>

      {/* Trading Instruments Performance section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Instruments Pie/Donut Chart Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
            <Activity size={18} style={{ color: 'var(--color-accent)' }} />
            <span>Trading Instruments Allocation</span>
          </h3>
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name, props) => {
                      const profit = props.payload.profit;
                      return [`${value} trades (${formatCurrency(profit)})`, name];
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No trade data available.</span>
            )}
          </div>
        </div>

        {/* Instruments Table Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
            <Cpu size={18} style={{ color: 'var(--color-accent)' }} />
            <span>Instrument Performance Stats</span>
          </h3>
          <div className="table-container" style={{ flexGrow: 1, maxHeight: '280px', overflowY: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '0.83rem', width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: 'transparent' }}>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Symbol</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Trades</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Win Rate</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Profit Factor</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Volume</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {symbolStats.length > 0 ? (
                  symbolStats.map((s, idx) => {
                    const isProfit = s.netProfit >= 0;
                    return (
                      <tr key={s.symbol}>
                        <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                            {s.symbol}
                          </span>
                        </td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>{s.trades}</td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>{s.winRate.toFixed(1)}%</td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>{s.profitFactor.toFixed(2)}</td>
                        <td style={{ padding: '0.4rem 0.6rem' }}>{s.volume.toFixed(2)}</td>
                        <td style={{ padding: '0.4rem 0.6rem', fontWeight: 'bold' }} className={isProfit ? 'text-profit' : 'text-loss'}>
                          {formatCurrency(s.netProfit)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                      No trades matched.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Performance Analytics & Extremes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {/* Trade Extremes Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
            <Activity size={18} style={{ color: 'var(--color-accent)' }} />
            <span>Trade Extremes</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.08)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>LARGEST WINNING TRADE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '0.1rem' }}>{stats.maxProfitTrade.symbol || '—'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {stats.maxProfitTrade.time ? new Date(stats.maxProfitTrade.time * 1000).toLocaleDateString() : ''}
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
                +{formatCurrency(stats.maxProfitTrade.profit)}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.08)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>LARGEST LOSING TRADE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginTop: '0.1rem' }}>{stats.maxLossTrade.symbol || '—'}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {stats.maxLossTrade.time ? new Date(stats.maxLossTrade.time * 1000).toLocaleDateString() : ''}
                </div>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>
                {formatCurrency(stats.maxLossTrade.profit)}
              </div>
            </div>
          </div>
        </div>

        {/* Win/Loss Averages Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-title)' }}>
            <Percent size={18} style={{ color: 'var(--color-accent)' }} />
            <span>Win / Loss Averages</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>AVERAGE WINNING TRADE</div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average gain size</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
                +{formatCurrency(stats.avgWin)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em' }}>AVERAGE LOSING TRADE</div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average loss size</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>
                -{formatCurrency(stats.avgLoss)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
