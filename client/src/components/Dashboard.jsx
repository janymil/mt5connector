import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Cpu, 
  Calendar, 
  History, 
  RefreshCw,
  Server,
  TrendingUp,
  AlertCircle,
  BarChart3,
  LogOut,
  Key,
  HelpCircle
} from 'lucide-react';

import DashboardOverview from './DashboardOverview.jsx';
import EAPerformance from './EAPerformance.jsx';
import CalendarView from './CalendarView.jsx';
import TradeHistory from './TradeHistory.jsx';
import AnalyticsCharts from './AnalyticsCharts.jsx';
import HelpFAQ from './HelpFAQ.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('all_live');
  
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [rawDeals, setRawDeals] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
      throw new Error('Session expired');
    }
    return res;
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetchWithAuth('/api/accounts');
      if (!res.ok) throw new Error('Failed to load accounts list.');
      const data = await res.json();
      setAccounts(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const fetchDeals = async (accountId) => {
    try {
      setLoading(true);
      const url = accountId && accountId !== 'all' 
        ? `/api/deals?account_id=${accountId}`
        : '/api/deals';
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error('Failed to load deal history.');
      const data = await res.json();
      setRawDeals(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPositions = async (accountId) => {
    try {
      const url = accountId && accountId !== 'all' 
        ? `/api/positions?account_id=${accountId}`
        : '/api/positions';
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error('Failed to load open positions.');
      const data = await res.json();
      setPositions(data);
    } catch (err) {
      console.error('Error fetching open positions:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAccounts();
    await fetchDeals(selectedAccountId);
    await fetchPositions(selectedAccountId);
    setRefreshing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchDeals('all_live');
      fetchPositions('all_live');
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDeals(selectedAccountId);
      fetchPositions(selectedAccountId);
    }
  }, [selectedAccountId, user]);

  const deals = useMemo(() => {
    if (dateFilter === 'all') return rawDeals;

    const now = new Date();
    let startTimestamp = 0;
    let endTimestamp = Math.floor(now.getTime() / 1000) + 86400;

    if (dateFilter === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startTimestamp = Math.floor(startOfToday.getTime() / 1000);
    } else if (dateFilter === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startTimestamp = Math.floor(sevenDaysAgo.getTime() / 1000);
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);
    } else if (dateFilter === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startTimestamp = Math.floor(startOfMonth.getTime() / 1000);
    } else if (dateFilter === 'custom') {
      if (customStart) {
        const start = new Date(customStart);
        startTimestamp = Math.floor(start.getTime() / 1000);
      }
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        endTimestamp = Math.floor(end.getTime() / 1000);
      }
    }

    return rawDeals.filter(deal => deal.time >= startTimestamp && deal.time <= endTimestamp);
  }, [rawDeals, dateFilter, customStart, customEnd]);

  const getActiveCurrency = () => {
    if (['all', 'all_live', 'all_demo', 'all_prop'].includes(selectedAccountId) || accounts.length === 0) return 'USD';
    const activeAcc = accounts.find(a => a.account_id === selectedAccountId);
    return activeAcc ? activeAcc.currency : 'USD';
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return { title: 'Analytics Dashboard', subtitle: 'Overview of profit growth and trading statistics' };
      case 'ea-performance': return { title: 'Expert Advisor Profile', subtitle: 'Performance metrics grouped by EA Magic Number & Comment' };
      case 'calendar': return { title: 'P&L Calendar', subtitle: 'Daily net trading outcomes and trade drawers' };
      case 'analytics': return { title: 'Session & Symbol Charts', subtitle: 'Trade distributions by currency pair, weekday, and hour' };
      case 'history': return { title: 'Trade Logs', subtitle: 'Detailed chronological deal ledger' };
      case 'help': return { title: 'Help & Installation Guide', subtitle: 'Step-by-step MT5 connector setup, WebRequest whitelisting, and FAQs' };
      default: return { title: 'Dashboard', subtitle: '' };
    }
  };

  if (!user) return null;

  const pageMeta = getPageTitle();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">
            <TrendingUp size={22} />
          </div>
          <span className="logo-text">MT5 STATS</span>
        </div>

        <nav style={{ flex: 1 }}>
          <ul className="nav-menu">
            <li className={"nav-item " + (activeTab === 'dashboard' ? 'active' : '')} onClick={() => setActiveTab('dashboard')}>
              <LayoutDashboard /><span>Dashboard</span>
            </li>
            <li className={"nav-item " + (activeTab === 'ea-performance' ? 'active' : '')} onClick={() => setActiveTab('ea-performance')}>
              <Cpu /><span>EA Performance</span>
            </li>
            <li className={"nav-item " + (activeTab === 'calendar' ? 'active' : '')} onClick={() => setActiveTab('calendar')}>
              <Calendar /><span>P&L Calendar</span>
            </li>
            <li className={"nav-item " + (activeTab === 'analytics' ? 'active' : '')} onClick={() => setActiveTab('analytics')}>
              <BarChart3 /><span>Session Charts</span>
            </li>
            <li className={"nav-item " + (activeTab === 'history' ? 'active' : '')} onClick={() => setActiveTab('history')}>
              <History /><span>Trade Logs</span>
            </li>
            <li className={"nav-item " + (activeTab === 'help' ? 'active' : '')} onClick={() => setActiveTab('help')}>
              <HelpCircle /><span>Help & Guide</span>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <Key size={14} style={{ color: 'var(--color-accent)' }} />
            <span style={{ fontWeight: 600 }}>API Key</span>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.7rem', wordBreak: 'break-all', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
            {user.api_key}
          </div>
          <button onClick={handleLogout} className="sync-btn" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div className="page-title">
            <h1>{pageMeta.title}</h1>
            <p>{pageMeta.subtitle}</p>
          </div>

          {activeTab !== 'help' && (
            <div className="header-controls">
              <button className="sync-btn" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                <span>Sync Data</span>
              </button>

              <div className="select-wrapper">
                <select className="account-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ minWidth: '150px' }}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range...</option>
                </select>
              </div>

              {dateFilter === 'custom' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="date" className="search-input" style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', width: '130px' }} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>to</span>
                  <input type="date" className="search-input" style={{ padding: '0.6rem 0.75rem', fontSize: '0.8rem', width: '130px' }} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </div>
              )}

              <div className="select-wrapper">
                <select className="account-select" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                  <option value="all_live">All Live Accounts</option>
                  <option value="all_prop">All Prop Accounts</option>
                  <option value="all_demo">All Demo Accounts</option>
                  <option value="all">All Accounts</option>
                  {accounts.map(acc => {
                    const tag = acc.account_type === 'Prop' ? 'PROP' : acc.trade_mode === 'Demo' ? 'DEMO' : 'LIVE';
                    return <option key={acc.account_id} value={acc.account_id}>[{tag}] {acc.broker} - {acc.account_id}</option>;
                  })}
                </select>
              </div>
            </div>
          )}
        </header>

        {activeTab !== 'help' && !loading && accounts.length === 0 && (
          <div className="sync-banner animate-fade-in">
            <AlertCircle size={24} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <div className="sync-banner-text">
              <span className="sync-banner-highlight">Getting Started:</span> Copy your API Key from the sidebar, paste it into the <span style={{ fontFamily: 'monospace', color: '#fff' }}>AccountStatsConnector.mq5</span> EA input settings on MetaTrader 5, enable WebRequest, and attach to a chart.
            </div>
          </div>
        )}

        {error && activeTab !== 'help' && (
          <div className="sync-banner" style={{ border: '1px solid var(--color-error)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <AlertCircle size={20} style={{ color: 'var(--color-error)' }} />
            <div className="sync-banner-text" style={{ color: 'var(--color-error)' }}>Error: {error}</div>
          </div>
        )}

        {activeTab === 'help' ? (
          <HelpFAQ embeddedUser={user} />
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
            <span>Loading synchronized trade logs...</span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardOverview deals={deals} rawDeals={rawDeals} positions={positions} currency={getActiveCurrency()} accounts={accounts} selectedAccountId={selectedAccountId} onAccountTypeChange={handleRefresh} fetchWithAuth={fetchWithAuth} />}
            {activeTab === 'ea-performance' && <EAPerformance deals={deals} currency={getActiveCurrency()} />}
            {activeTab === 'calendar' && <CalendarView deals={deals} currency={getActiveCurrency()} accounts={accounts} selectedAccountId={selectedAccountId} />}
            {activeTab === 'analytics' && <AnalyticsCharts deals={deals} currency={getActiveCurrency()} />}
            {activeTab === 'history' && <TradeHistory deals={deals} currency={getActiveCurrency()} />}
          </>
        )}
      </main>
    </div>
  );
}
