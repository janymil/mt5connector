import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  Zap, 
  BookOpen, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function HelpFAQ({ embeddedUser = null }) {
  const navigate = useNavigate();
  
  const user = embeddedUser;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const serverUrl = "https://mt5connector.uk";
  const syncApiUrl = "https://mt5connector.uk/api/sync";
  const downloadEx5Url = "/AccountStatsConnector.ex5";

  const handleCopyKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(serverUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const faqs = [
    {
      category: 'setup',
      question: 'How do I connect my real or demo MetaTrader 5 account?',
      answer: `Connecting your MT5 account requires 3 quick steps:\n1. Download AccountStatsConnector.ex5 compiled EA and place it in your MT5 MQL5/Experts folder.\n2. Whitelist "https://mt5connector.uk" in MT5 Tools -> Options -> Expert Advisors.\n3. Drag "AccountStatsConnector" onto any active chart, enter your personal API Key into InpApiKey, and turn "Algo Trading" ON.`
    },
    {
      category: 'setup',
      question: 'Where do I find my personal API Key?',
      answer: `Your API Key is generated automatically when you register. Each registered user gets a unique personal API key displayed in their private Dashboard sidebar. Never share your API key with anyone.`
    },
    {
      category: 'setup',
      question: 'How often does MetaTrader 5 sync data to the dashboard?',
      answer: `By default, the Expert Advisor syncs your trade history and open positions every 30 minutes (configurable via the InpSyncIntervalMinutes parameter in EA inputs). It also syncs automatically whenever you open or restart MetaTrader 5 if InpSyncOnStartup is enabled.`
    },
    {
      category: 'accounts',
      question: 'Can I connect multiple MT5 accounts (Live, Demo, Prop Firm)?',
      answer: `Yes! You can attach the AccountStatsConnector EA to as many MetaTrader 5 terminals and accounts as you want. Each account will automatically appear in your dashboard's account selector dropdown where you can categorize them into Live, Demo, or Prop Firm challenges.`
    },
    {
      category: 'accounts',
      question: 'How do I categorize an account as a Prop Firm Challenge?',
      answer: `On your Dashboard overview, find the account card, click the edit tag icon next to the account name, and select "Prop". Your metrics for that account will now be aggregated under "All Prop Accounts".`
    },
    {
      category: 'security',
      question: 'Does MT5Connector require my broker password or investor password?',
      answer: `NO! MT5Connector NEVER asks for your broker passwords, account logins, or investor keys. The compiled EA runs locally inside your MT5 terminal and sends read-only trade statistics to your dashboard over HTTPS using your secret API Key.`
    },
    {
      category: 'security',
      question: 'Is my trading data private and isolated from other users?',
      answer: `Yes. All accounts, deals, and open positions are indexed strictly by your unique user account ID. No other user can see your trading metrics, balance, or strategy details.`
    },
    {
      category: 'troubleshooting',
      question: 'Why am I getting Error 4014 in the MT5 Experts log?',
      answer: `Error 4014 means WebRequest is blocked by MetaTrader. To fix this:\n1. In MT5, go to Tools -> Options -> Expert Advisors.\n2. Check "Allow WebRequest for listed URL:".\n3. Add "https://mt5connector.uk" (without trailing slash) and click OK.`
    },
    {
      category: 'troubleshooting',
      question: 'Sync failed with HTTP error 401 or 403. What should I check?',
      answer: `HTTP 401 or 403 means the API key entered into the EA input field "InpApiKey" is missing or invalid. Double-check your API Key in your Dashboard settings and paste it into the EA inputs.`
    },
    {
      category: 'troubleshooting',
      question: 'I attached the EA, but no deals appear on the dashboard. Why?',
      answer: `Check the following:\n1. Ensure "Algo Trading" button in the top MT5 toolbar is green (toggled ON).\n2. Check the "Experts" log tab at the bottom of MT5 (Ctrl+T) to confirm sync messages.\n3. Make sure your account has trade history recorded in MT5.`
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      
      {/* Anonymous / Public Top Navbar (if not embedded inside dashboard) */}
      {!embeddedUser && (
        <nav style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', backdropFilter: 'var(--glass-blur)', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(15, 23, 42, 0.8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--color-accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="white" />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>MT5Connector</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => navigate('/')} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}
            >
              Home
            </button>
            <button 
              onClick={() => navigate('/login')} 
              style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
            >
              Log In
            </button>
            <button 
              onClick={() => navigate('/register')} 
              style={{ padding: '0.6rem 1.25rem', background: 'var(--color-accent)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 600 }}
            >
              Sign Up Free
            </button>
          </div>
        </nav>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '20px', color: 'var(--color-accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem' }}>
            <BookOpen size={16} />
            <span>Documentation & Support</span>
          </div>
          <h1 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Help Center & MT5 Connector Guide
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
            Download the pre-compiled MetaTrader 5 Expert Advisor, configure WebRequests, and connect your trading statistics in minutes.
          </p>

          {/* Search Input */}
          <div style={{ position: 'relative', maxWidth: '540px', margin: '0 auto' }}>
            <Search size={20} style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search guide & FAQs (e.g. WebRequest, API Key, Error 4014)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.9rem 1.2rem 0.9rem 3.2rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', boxShadow: 'var(--shadow-premium)' }}
            />
          </div>
        </div>

        {/* User API Key Card (ONLY shown inside private dashboard tab) */}
        {user ? (
          <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)', border: '1px solid var(--border-color-active)', borderRadius: '16px', padding: '1.75rem', marginBottom: '3rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.1)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Zap size={18} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Your Private API Key</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Use this private API Key in the <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#fff' }}>InpApiKey</code> input of your MetaTrader 5 EA.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#60a5fa', wordBreak: 'break-all' }}>{user.api_key}</span>
              <button 
                onClick={handleCopyKey}
                style={{ background: 'var(--color-accent)', border: 'none', borderRadius: '6px', color: 'white', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
              >
                {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.75rem', marginBottom: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.3rem' }}>Ready to connect your MetaTrader account?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Each user gets a unique personal API Key upon sign up to connect MetaTrader 5.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => navigate('/login')} style={{ padding: '0.7rem 1.25rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>Log In</button>
              <button onClick={() => navigate('/register')} style={{ padding: '0.7rem 1.25rem', background: 'var(--color-accent)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Create Free Account</button>
            </div>
          </div>
        )}

        {/* COMPILED EA DOWNLOAD CARD */}
        <section style={{ marginBottom: '3.5rem', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)', border: '1px solid var(--color-accent)', borderRadius: '16px', padding: '2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Download size={22} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Download Compiled MT5 Connector (`AccountStatsConnector.ex5`)</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.5 }}>
              Ready-to-use compiled MetaTrader 5 Expert Advisor file. Place this file in your MT5 terminal's <code style={{ color: '#fff' }}>MQL5/Experts</code> folder. No code compilation needed.
            </p>
          </div>
          <a 
            href={downloadEx5Url}
            download="AccountStatsConnector.ex5"
            style={{ padding: '0.85rem 1.75rem', background: 'linear-gradient(135deg, var(--color-accent) 0%, #3b82f6 100%)', borderRadius: '10px', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)', flexShrink: 0 }}
          >
            <Download size={18} />
            <span>Download EX5 File</span>
          </a>
        </section>

        {/* STEP-BY-STEP SETUP GUIDE */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
              <Terminal size={20} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>4-Step MetaTrader 5 Setup Guide</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            
            {/* Step 1 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>1</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>Download & Install EX5</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                Download <code style={{ color: '#fff' }}>AccountStatsConnector.ex5</code> above and copy it into your MT5 folder: <code style={{ color: '#60a5fa', fontSize: '0.8rem' }}>MQL5/Experts</code>.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={14} />
                <span>Pre-Compiled File Ready</span>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>2</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>Allow WebRequest in MT5</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                In MT5, go to <strong>Tools -&gt; Options -&gt; Expert Advisors</strong> (Ctrl+O). Check "Allow WebRequest" and add:
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.8)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem', fontFamily: 'monospace', color: '#60a5fa' }}>
                <span>{serverUrl}</span>
                <button onClick={handleCopyUrl} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {copiedUrl ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>3</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>Attach EA to Chart</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                In MT5 Navigator (Ctrl+N), refresh Expert Advisors. Drag "AccountStatsConnector" onto any chart and enter your API Key into <code style={{ color: '#60a5fa' }}>InpApiKey</code>.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Set <code style={{ color: '#60a5fa' }}>InpServerURL</code> to: <br/>
                <span style={{ fontFamily: 'monospace', color: '#fff' }}>{syncApiUrl}</span>
              </div>
            </div>

            {/* Step 4 */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>4</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>Turn Algo Trading ON</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                Ensure the <strong>Algo Trading</strong> button in the top MT5 toolbar is green. Check the Experts log tab (Ctrl+T) for success.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={14} />
                <span>Syncs every 30 mins automatically</span>
              </div>
            </div>

          </div>
        </section>

        {/* FREQUENTLY ASKED QUESTIONS (FAQS) */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <HelpCircle size={24} style={{ color: 'var(--color-accent)' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Frequently Asked Questions</h2>
          </div>

          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
            {[
              { id: 'all', label: 'All Questions' },
              { id: 'setup', label: 'Installation & Setup' },
              { id: 'accounts', label: 'Account Types & Multi-Account' },
              { id: 'security', label: 'Security & Privacy' },
              { id: 'troubleshooting', label: 'Troubleshooting' }
            ].map(cat => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{ 
                  padding: '0.6rem 1.2rem', 
                  borderRadius: '20px', 
                  border: activeCategory === cat.id ? '1px solid var(--color-accent)' : '1px solid var(--border-color)', 
                  background: activeCategory === cat.id ? 'var(--color-accent)' : 'var(--bg-card)', 
                  color: 'white', 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ Accordion List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredFaqs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <AlertCircle size={32} style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }} />
                <p>No FAQ matching "{searchQuery}" in this category.</p>
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div 
                    key={idx}
                    style={{ 
                      background: 'var(--bg-card)', 
                      border: isOpen ? '1px solid var(--color-accent)' : '1px solid var(--border-color)', 
                      borderRadius: '12px', 
                      overflow: 'hidden',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    <button 
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      style={{ 
                        width: '100%', 
                        padding: '1.25rem 1.5rem', 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--text-primary)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        textAlign: 'left', 
                        fontSize: '1.05rem', 
                        fontWeight: 600, 
                        cursor: 'pointer' 
                      }}
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <ChevronUp size={20} style={{ color: 'var(--color-accent)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-muted)' }} />}
                    </button>

                    {isOpen && (
                      <div style={{ padding: '0 1.5rem 1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                        {faq.answer.split('\n').map((line, lIdx) => (
                          <p key={lIdx} style={{ marginBottom: '0.5rem' }}>{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
