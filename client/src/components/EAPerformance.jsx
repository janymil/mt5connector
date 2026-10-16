import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Cpu, TrendingUp, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

/**
 * Returns true if this comment is NOT an EA name — i.e. it is a dynamic
 * broker-generated tag such as [sl 1234.5], [tp 12.3], or an encoded
 * copy-trade identifier string.
 */
import { matchDealsIntoTrades, cleanStrategyName } from '../utils/tradeMatcher.js';

export default function EAPerformance({ deals = [], currency = 'USD' }) {
  const [expandedEAs, setExpandedEAs] = useState({});

  const toggleExpand = (eaName) => {
    setExpandedEAs(prev => ({ ...prev, [eaName]: !prev[eaName] }));
  };

  /**
   * Group completed trades by EA name.
   * Sub-strategies are grouped by magic number, symbol, and clean comment strategy name.
   */
  const eaStats = useMemo(() => {
    const trades = matchDealsIntoTrades(deals);
    const groups = {};

    trades.forEach(trade => {
      // Exclude manual or copy-trade signals that don't map to a named EA
      if (!trade.eaName || trade.eaName === 'Manual' || trade.eaName.startsWith('EA_')) return;

      const netProfit = trade.profit + trade.commission + trade.swap;
      const eaName = trade.eaName;

      if (!groups[eaName]) {
        groups[eaName] = {
          name: eaName,
          totalTrades: 0,
          winCount: 0,
          lossCount: 0,
          grossProfit: 0,
          grossLoss: 0,
          netProfit: 0,
          volume: 0,
          commission: 0,
          swap: 0,
          strategies: {}
        };
      }

      const g = groups[eaName];
      g.totalTrades++;
      g.netProfit += netProfit;
      g.volume += (trade.volume || 0);
      g.commission += (trade.commission || 0);
      g.swap += (trade.swap || 0);
      if (netProfit > 0) { g.grossProfit += netProfit; g.winCount++; }
      else if (netProfit < 0) { g.grossLoss += Math.abs(netProfit); g.lossCount++; }

      // Sub-strategy grouping: symbol + clean comment strategy name
      const strategyName = cleanStrategyName(trade.comment) || (trade.magic ? `Strategy #${trade.magic}` : 'Manual');
      const stratKey = `${trade.symbol || 'Unknown'}_${strategyName}`;
      
      if (!g.strategies[stratKey]) {
        g.strategies[stratKey] = {
          magics: [],
          symbol: trade.symbol || 'Unknown',
          strategyName: strategyName,
          totalTrades: 0,
          winCount: 0,
          lossCount: 0,
          grossProfit: 0,
          grossLoss: 0,
          netProfit: 0,
          volume: 0,
          commission: 0,
          swap: 0
        };
      }

      const s = g.strategies[stratKey];
      s.totalTrades++;
      s.netProfit += netProfit;
      s.volume += (trade.volume || 0);
      s.commission += (trade.commission || 0);
      s.swap += (trade.swap || 0);
      if (netProfit > 0) { s.grossProfit += netProfit; s.winCount++; }
      else if (netProfit < 0) { s.grossLoss += Math.abs(netProfit); s.lossCount++; }
      
      if (trade.magic && !s.magics.includes(trade.magic)) {
        s.magics.push(trade.magic);
      }
    });

    // Post-process: compute derived stats
    return Object.values(groups).map(g => {
      const winRate = g.totalTrades > 0 ? (g.winCount / g.totalTrades) * 100 : 0;
      const profitFactor = g.grossLoss > 0 ? g.grossProfit / g.grossLoss
        : g.grossProfit > 0 ? 99.9 : 0;
      const avgTrade = g.totalTrades > 0 ? g.netProfit / g.totalTrades : 0;

      const strategies = Object.values(g.strategies).map(s => {
        const sWR = s.totalTrades > 0 ? (s.winCount / s.totalTrades) * 100 : 0;
        const sPF = s.grossLoss > 0 ? s.grossProfit / s.grossLoss : s.grossProfit > 0 ? 99.9 : 0;
        const sAvg = s.totalTrades > 0 ? s.netProfit / s.totalTrades : 0;
        const magicDisplay = s.magics.length === 0 ? '—' : s.magics.length === 1 ? s.magics[0] : 'Various';

        return { 
          ...s, 
          winRate: sWR, 
          profitFactor: sPF, 
          avgTrade: sAvg,
          magic: magicDisplay
        };
      }).sort((a, b) => b.netProfit - a.netProfit);

      return { ...g, winRate, profitFactor, avgTrade, strategies };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }, [deals]);

  const fmt = (val) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val);

  const chartData = useMemo(() =>
    eaStats.map(ea => ({
      name: ea.name.length > 18 ? ea.name.substring(0, 17) + '…' : ea.name,
      profit: Number(ea.netProfit.toFixed(2)),
      fullName: ea.name
    })), [eaStats]);

  return (
    <div className="animate-fade-in">

      {/* === Bar Chart === */}
      <div className="card chart-card" style={{ marginBottom: '2rem' }}>
        <div className="chart-title">
          <span>Profit / Loss Comparison by Expert Advisor</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Net P&amp;L per EA — sorted by performance
          </span>
        </div>
        <div className="chart-container" style={{ height: '240px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value, _n, props) => [fmt(value), props.payload.fullName]}
                />
                <Bar dataKey="profit">
                  {chartData.map((entry, i) => (
                    <Cell
                      key={`cell-${i}`}
                      fill={entry.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)'}
                      fillOpacity={0.75}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No EA data available yet.
            </div>
          )}
        </div>
      </div>

      {/* === Accordion Table === */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Expert Advisor Performance Summary</span>
          <span className="badge bg-neutral" style={{ fontSize: '0.8rem' }}>
            {eaStats.length} EA{eaStats.length !== 1 ? 's' : ''} Detected
          </span>
        </h2>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '36px' }}></th>
                <th>EA Name</th>
                <th>Instruments</th>
                <th>Trades</th>
                <th>Win Rate</th>
                <th>Profit Factor</th>
                <th>Volume (Lots)</th>
                <th>Avg Trade</th>
                <th>Costs</th>
                <th>Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {eaStats.length > 0 ? (
                eaStats.map((ea) => {
                  const isExpanded = !!expandedEAs[ea.name];
                  const isProfit = ea.netProfit >= 0;
                  const stratCount = ea.strategies.length;

                  return (
                    <React.Fragment key={ea.name}>

                      {/* ── EA summary row ── */}
                      <tr
                        onClick={() => toggleExpand(ea.name)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'rgba(255,255,255,0.018)' : 'transparent'
                        }}
                      >
                        <td style={{ textAlign: 'center' }}>
                          {isExpanded
                            ? <ChevronDown size={16} style={{ color: 'var(--color-accent)' }} />
                            : <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Cpu size={14} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                            <span>{ea.name}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            background: 'rgba(255,255,255,0.07)',
                            borderRadius: '999px',
                            padding: '2px 10px',
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)'
                          }}>
                            {stratCount} {stratCount === 1 ? 'strategy' : 'strategies'}
                          </span>
                        </td>
                        <td>{ea.totalTrades}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '44px', height: '4px', borderRadius: '2px',
                              background: 'rgba(255,255,255,0.08)', overflow: 'hidden', flexShrink: 0
                            }}>
                              <div style={{
                                width: `${Math.min(ea.winRate, 100)}%`,
                                height: '100%',
                                background: ea.winRate >= 50 ? 'var(--color-success)' : 'var(--color-error)',
                                borderRadius: '2px'
                              }} />
                            </div>
                            <span>{ea.winRate.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td>{ea.profitFactor.toFixed(2)}</td>
                        <td>{ea.volume.toFixed(2)}</td>
                        <td className={ea.avgTrade >= 0 ? 'text-profit' : 'text-loss'}>
                          {fmt(ea.avgTrade)}
                        </td>
                        <td style={{ color: 'var(--color-error)' }}>
                          {fmt(ea.commission + ea.swap)}
                        </td>
                        <td style={{ fontWeight: 'bold' }} className={isProfit ? 'text-profit' : 'text-loss'}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {isProfit ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                            {fmt(ea.netProfit)}
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded: per magic+symbol sub-strategy rows ── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="10" style={{ padding: '0 1rem 1.5rem 3.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                            <div
                              className="animate-fade-in"
                              style={{ borderLeft: '2px solid var(--color-accent)', paddingLeft: '1rem', marginTop: '0.5rem' }}
                            >
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                                Strategies &amp; instruments under{' '}
                                <strong style={{ color: 'var(--color-accent)' }}>{ea.name}</strong>
                              </p>
                              <table className="custom-table" style={{ width: '100%', fontSize: '0.83rem' }}>
                                <thead>
                                  <tr style={{ backgroundColor: 'transparent' }}>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Strategy / Comment</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Symbol</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Magic #</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Trades</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Win %</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Profit Factor</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Volume</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Avg Trade</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Costs</th>
                                    <th style={{ padding: '0.4rem 0.6rem' }}>Net P&amp;L</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ea.strategies.map((s) => (
                                    <tr key={`${s.strategyName}_${s.symbol}`}>
                                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{s.strategyName}</td>
                                      <td style={{ padding: '0.4rem 0.6rem' }}>{s.symbol}</td>
                                      <td style={{ padding: '0.4rem 0.6rem', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        {s.magic || '—'}
                                      </td>
                                      <td style={{ padding: '0.4rem 0.6rem' }}>{s.totalTrades}</td>
                                      <td style={{ padding: '0.4rem 0.6rem' }}>{s.winRate.toFixed(1)}%</td>
                                      <td style={{ padding: '0.4rem 0.6rem' }}>{s.profitFactor.toFixed(2)}</td>
                                      <td style={{ padding: '0.4rem 0.6rem' }}>{s.volume.toFixed(2)}</td>
                                      <td style={{ padding: '0.4rem 0.6rem' }} className={s.avgTrade >= 0 ? 'text-profit' : 'text-loss'}>
                                        {fmt(s.avgTrade)}
                                      </td>
                                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--color-error)' }}>
                                        {fmt(s.commission + s.swap)}
                                      </td>
                                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: 'bold' }} className={s.netProfit >= 0 ? 'text-profit' : 'text-loss'}>
                                        {fmt(s.netProfit)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 0' }}>
                    No trading history synced yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
