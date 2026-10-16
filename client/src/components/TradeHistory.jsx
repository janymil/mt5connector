import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { matchDealsIntoTrades } from '../utils/tradeMatcher.js';

export default function TradeHistory({ deals = [], currency = 'USD' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Sorting state
  const [sortField, setSortField] = useState('closeTime');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending for new field
    }
  };

  // Convert raw deals into matched trades
  const trades = useMemo(() => {
    return matchDealsIntoTrades(deals);
  }, [deals]);

  // Filtered and sorted trades
  const processedTrades = useMemo(() => {
    let result = [...trades];

    // Apply search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(trade => {
        const cleanedEA = trade.eaName || '';
        return (
          trade.ticket.toString().includes(term) ||
          (trade.symbol && trade.symbol.toLowerCase().includes(term)) ||
          (trade.comment && trade.comment.toLowerCase().includes(term)) ||
          cleanedEA.toLowerCase().includes(term) ||
          trade.magic.toString().includes(term)
        );
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle nulls
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      // Custom numeric sums for profits
      if (sortField === 'netProfit') {
        valA = a.profit + a.commission + a.swap;
        valB = b.profit + b.commission + b.swap;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [trades, searchTerm, sortField, sortOrder]);

  // CSV Exporter (Excel-Compatible European Formatting)
  const handleExportCSV = () => {
    const headers = [
      'Ticket',
      'Open Time',
      'Close Time',
      'Symbol',
      'Type',
      'Lots',
      'Open Price',
      'Close Price',
      'Commission',
      'Swap',
      'Profit',
      'Net Profit',
      'Magic Number',
      'Comment',
      'EA Name'
    ];

    const rows = processedTrades.map(trade => {
      const typeStr = trade.type === 0 ? 'BUY' : 'SELL';
      const openTimeStr = trade.openTime ? new Date(trade.openTime * 1000).toLocaleString(undefined, {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }) : '-';
      const closeTimeStr = trade.closeTime ? new Date(trade.closeTime * 1000).toLocaleString(undefined, {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      }) : '-';
      const netProfit = (trade.profit + trade.commission + trade.swap);

      // European Excel formats decimals with commas (e.g. 112.95 -> 112,95)
      const fmt = (num) => {
        if (num === undefined || num === null || isNaN(num)) return '0,00';
        return Number(num).toFixed(2).replace('.', ',');
      };

      const fmtLots = (num) => {
        if (num === undefined || num === null || isNaN(num)) return '0,00';
        return Number(num).toFixed(2).replace('.', ',');
      };

      const fmtPrice = (num) => {
        if (!num || isNaN(num)) return '-';
        return Number(num).toFixed(5).replace('.', ',');
      };

      return [
        trade.ticket,
        openTimeStr,
        closeTimeStr,
        trade.symbol,
        typeStr,
        fmtLots(trade.volume),
        fmtPrice(trade.openPrice),
        fmtPrice(trade.closePrice),
        fmt(trade.commission),
        fmt(trade.swap),
        fmt(trade.profit),
        fmt(netProfit),
        trade.magic === 0 ? '0' : trade.magic,
        trade.comment || '',
        trade.eaName || 'Manual'
      ];
    });

    const csvContent = [
      'sep=;', // Explicitly tell Excel to parse using semicolons
      headers.join(';'),
      ...rows.map(row => row.map(val => {
        const strVal = String(val);
        if (strVal.includes(';') || strVal.includes('"') || strVal.includes('\n')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(';'))
    ].join('\r\n');

    // Add UTF-8 BOM so Excel opens it with proper character encoding
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trade_history_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculations
  const totalPages = Math.ceil(processedTrades.length / itemsPerPage);
  const paginatedTrades = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return processedTrades.slice(startIdx, startIdx + itemsPerPage);
  }, [processedTrades, currentPage]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(val);
  };

  const getDealTypeBadge = (type) => {
    switch (type) {
      case 0:
        return <span className="badge bg-profit">BUY</span>;
      case 1:
        return <span className="badge bg-loss">SELL</span>;
      default:
        return <span className="badge bg-neutral" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>BALANCE</span>;
    }
  };

  return (
    <div className="card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>Synchronized Trade History</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Matched opening and closing executions showing completed trades</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '420px' }}>
          <div style={{ position: 'relative', flexGrow: 1 }}>
            <input 
              type="text" 
              placeholder="Search symbol, comment, magic..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset page on filter change
              }}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
          <button 
            className="calendar-btn"
            onClick={handleExportCSV}
            title="Export to CSV (Excel)"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.6rem 0.85rem', fontSize: '0.85rem', height: '40px', flexShrink: 0 }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table" style={{ fontSize: '0.85rem' }}>
          <thead>
            <tr>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ticket')}>Ticket <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('openTime')}>Open Time <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('closeTime')}>Close Time <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('symbol')}>Symbol <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('type')}>Type <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('volume')}>Lots <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('openPrice')}>Open Price <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('closePrice')}>Close Price <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('magic')}>Magic <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('comment')}>Comment / EA <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('netProfit')}>Profit <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.length > 0 ? (
              paginatedTrades.map((trade) => {
                const netProfit = trade.profit + trade.commission + trade.swap;
                const formattedOpenTime = trade.openTime ? new Date(trade.openTime * 1000).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '-';
                const formattedCloseTime = new Date(trade.closeTime * 1000).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                return (
                  <tr key={trade.ticket}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{trade.ticket}</td>
                    <td>{formattedOpenTime}</td>
                    <td>{formattedCloseTime}</td>
                    <td style={{ fontWeight: 600 }}>{trade.symbol}</td>
                    <td>{getDealTypeBadge(trade.type)}</td>
                    <td>{trade.volume.toFixed(2)}</td>
                    <td style={{ fontFamily: 'monospace' }}>{trade.openPrice ? trade.openPrice.toFixed(5) : '-'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{trade.closePrice ? trade.closePrice.toFixed(5) : '-'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {trade.magic === 0 ? '-' : trade.magic}
                    </td>
                    <td>
                      <span style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>{trade.comment || '-'}</span>
                      {trade.eaName && trade.eaName !== trade.comment && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-accent)', fontWeight: 600, marginTop: '2px' }}>
                          [{trade.eaName}]
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold' }} className={netProfit >= 0 ? 'text-profit' : 'text-loss'}>
                      {netProfit >= 0 ? '+' : ''}{formatCurrency(netProfit)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                  No records match your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, processedTrades.length)} of {processedTrades.length} trades
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="calendar-btn" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{ opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="calendar-btn" 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages}
              style={{ opacity: currentPage === totalPages ? 0.3 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
