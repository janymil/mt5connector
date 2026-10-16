import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function AnalyticsCharts({ deals = [], currency = 'USD' }) {
  
  // 1. Calculate Profit by Symbol
  const symbolData = useMemo(() => {
    const symbols = {};
    deals.forEach(deal => {
      if (deal.type !== 0 && deal.type !== 1) return;
      if (deal.entry === 0) return; // closed trades only
      
      const symbol = deal.symbol || 'Balance';
      const profit = deal.profit + deal.commission + deal.swap;
      
      if (!symbols[symbol]) {
        symbols[symbol] = { name: symbol, profit: 0, trades: 0 };
      }
      
      symbols[symbol].profit += profit;
      symbols[symbol].trades++;
    });

    return Object.values(symbols)
      .map(s => ({ ...s, profit: Number(s.profit.toFixed(2)) }))
      .sort((a, b) => b.profit - a.profit);
  }, [deals]);

  // 2. Calculate Profit by Hour of Day (00:00 to 23:00)
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      profit: 0,
      trades: 0
    }));

    deals.forEach(deal => {
      if (deal.type !== 0 && deal.type !== 1) return;
      if (deal.entry === 0) return; // closed trades only

      const date = new Date(deal.time * 1000);
      const hour = date.getHours();
      const profit = deal.profit + deal.commission + deal.swap;

      hours[hour].profit += profit;
      hours[hour].trades++;
    });

    return hours.map(h => ({ ...h, profit: Number(h.profit.toFixed(2)) }));
  }, [deals]);

  // 3. Calculate Profit by Weekday
  const weekdayData = useMemo(() => {
    const days = [
      { name: 'Monday', profit: 0, trades: 0, order: 1 },
      { name: 'Tuesday', profit: 0, trades: 0, order: 2 },
      { name: 'Wednesday', profit: 0, trades: 0, order: 3 },
      { name: 'Thursday', profit: 0, trades: 0, order: 4 },
      { name: 'Friday', profit: 0, trades: 0, order: 5 },
      { name: 'Saturday', profit: 0, trades: 0, order: 6 },
      { name: 'Sunday', profit: 0, trades: 0, order: 0 }
    ];

    deals.forEach(deal => {
      if (deal.type !== 0 && deal.type !== 1) return;
      if (deal.entry === 0) return; // closed trades only

      const date = new Date(deal.time * 1000);
      let dayIndex = date.getDay(); // Sunday=0, Monday=1...
      
      const profit = deal.profit + deal.commission + deal.swap;

      // Find the corresponding day item
      const dayItem = days.find(d => d.order === dayIndex);
      if (dayItem) {
        dayItem.profit += profit;
        dayItem.trades++;
      }
    });

    // Reorder so calendar week starts on Monday
    return [...days].sort((a, b) => {
      const valA = a.order === 0 ? 7 : a.order;
      const valB = b.order === 0 ? 7 : b.order;
      return valA - valB;
    }).map(d => ({ ...d, profit: Number(d.profit.toFixed(2)) }));
  }, [deals]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Symbol Profit Chart */}
      <div className="card chart-card">
        <div className="chart-title">
          <span>Profit / Loss by Currency Symbol</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Trading performance by asset class</span>
        </div>
        <div className="chart-container" style={{ height: '300px' }}>
          {symbolData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={symbolData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value) => [formatCurrency(value), 'Net Profit']}
                />
                <Bar dataKey="profit">
                  {symbolData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)'} 
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No trade data available for symbols in this period.
            </div>
          )}
        </div>
      </div>

      {/* Hourly and Weekday Grids */}
      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))' }}>
        
        {/* Hourly distribution */}
        <div className="card chart-card">
          <div className="chart-title">
            <span>Session Profit Distribution by Hour (Local Time)</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Trades grouped by close hour</span>
          </div>
          <div className="chart-container" style={{ height: '300px' }}>
            {deals.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={9} interval={1} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Net Profit']}
                  />
                  <Bar dataKey="profit">
                    {hourlyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)'} 
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No hourly trade data available.
              </div>
            )}
          </div>
        </div>

        {/* Weekday distribution */}
        <div className="card chart-card">
          <div className="chart-title">
            <span>Weekday Profit Performance</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Performance grouped by close day</span>
          </div>
          <div className="chart-container" style={{ height: '300px' }}>
            {deals.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value) => [formatCurrency(value), 'Net Profit']}
                  />
                  <Bar dataKey="profit">
                    {weekdayData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.profit >= 0 ? 'var(--color-success)' : 'var(--color-error)'} 
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                No weekday trade data available.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
