import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Send,
  Database,
  Bot,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  TrendingUp,
  BarChart3,
  FileText,
  Copy,
  Building2,
  Zap,
  Filter,
  Check,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  Cpu
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

export const CompanyDataAIPage = ({
  currentUser,
  onLogout,
  onBack,
  onOpenNotes,
  onBackToCommandDeck,
  currentTime,
}) => {
  // Collection Category filter for query history & active scope
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isAiQuerying, setIsAiQuerying] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);

  // Active query session ID
  const [activeSessionId, setActiveSessionId] = useState('session_1');

  // Query sessions state (stored in local storage for instant recall)
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('md_company_data_sessions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'session_1',
        title: 'Executive Financial & Operational Briefing',
        category: 'accounts',
        date: 'Today',
        messages: [
          {
            id: 'm_welcome',
            sender: 'ai',
            text: 'Good day Managing Director Sir. Company Data AI is ready to query your company databases. You can ask natural language questions regarding Daily Branch Collections, Imprest Petty Cash Vouchers, Staff Attendance, and DMR Work Progress.',
            time: '09:00 AM',
            collection: 'Enterprise Hub',
          },
        ],
      },
      {
        id: 'session_2',
        title: 'Branch Collections & Revenue Audit',
        category: 'accounts',
        date: 'Yesterday',
        messages: [
          {
            id: 'm_audit_1',
            sender: 'user',
            text: 'What was the total collection recorded across all branches yesterday?',
            time: '04:15 PM',
          },
          {
            id: 'm_audit_2',
            sender: 'ai',
            text: 'Yesterday’s total consolidated branch collections were processed across all active branches. All figures have been reconciled with read-only database ledgers without discrepancy.',
            time: '04:15 PM',
            collection: 'local_db.accounts',
          },
        ],
      },
    ];
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('md_company_data_sessions', JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    playSuccessChime();
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiQuerying]);

  // Formatted Current Time
  const formattedTime =
    currentTime instanceof Date
      ? currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : typeof currentTime === 'string'
      ? currentTime
      : '';

  // Handle creating a fresh new query session
  const handleNewSession = () => {
    playMechanicalClick();
    const newId = `session_${Date.now()}`;
    const newSession = {
      id: newId,
      title: `Data Inquiry #${sessions.length + 1}`,
      category: selectedCategory === 'all' ? 'accounts' : selectedCategory,
      date: 'Just now',
      messages: [
        {
          id: `m_init_${Date.now()}`,
          sender: 'ai',
          text: 'New inquiry thread initialized under strict read-only database safeguards. What company data or collection would you like to inspect?',
          time: formattedTime || 'Now',
          collection: 'Enterprise Hub',
        },
      ],
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
    showToast('Started new company data inquiry session', 'info');
  };

  // Handle deleting a session
  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    playMechanicalClick();
    if (sessions.length <= 1) {
      showToast('At least one inquiry session must remain active', 'warning');
      return;
    }
    const filtered = sessions.filter((s) => s.id !== sessionId);
    setSessions(filtered);
    if (activeSessionId === sessionId) {
      setActiveSessionId(filtered[0].id);
    }
    showToast('Inquiry session deleted', 'info');
  };

  // Handle sending query
  const handleSendQuery = (customText = null) => {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend || isAiQuerying) return;

    playMechanicalClick();
    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: formattedTime || 'Now',
    };

    const targetSessionId = activeSessionId;
    const updatedMessages = [...(activeSession?.messages || []), userMsg];

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            title: s.messages.length <= 1 ? textToSend.slice(0, 38) + (textToSend.length > 38 ? '...' : '') : s.title,
            messages: updatedMessages,
          };
        }
        return s;
      })
    );

    setChatInput('');
    setIsAiQuerying(true);

    // Simulate AI Data Response (Frontend Mock/Preview)
    setTimeout(() => {
      let aiResponseText = '';
      let targetCollection = 'local_db.accounts';

      const lower = textToSend.toLowerCase();
      if (lower.includes('collection') || lower.includes('revenue') || lower.includes('bank') || lower.includes('account')) {
        targetCollection = 'local_db.accounts';
        aiResponseText = `Executive Collection Analysis: Live database records retrieved from collection 'accounts'. Branch receipts are synchronized with morning reconciliation logs. Cash and digital collections reflect current ledger entries.`;
      } else if (lower.includes('imprest') || lower.includes('voucher') || lower.includes('petty') || lower.includes('expense')) {
        targetCollection = 'local_db.imprest';
        aiResponseText = `Imprest & Expense Audit: Retrieved records from 'imprest'. Pending petty cash vouchers have been indexed with authorization tiers. Balance holders are mapped with current expense submissions.`;
      } else if (lower.includes('attendance') || lower.includes('staff') || lower.includes('punch') || lower.includes('absent')) {
        targetCollection = 'local_db.attendance';
        aiResponseText = `Workforce Attendance Report: Query verified against 'attendance'. Morning biometric check-ins and field personnel deployments are tracked. Field officers on active site assignments are accounted for.`;
      } else if (lower.includes('dmr') || lower.includes('progress') || lower.includes('ticket') || lower.includes('maintenance')) {
        targetCollection = 'local_db.dmr_records';
        aiResponseText = `DMR & Work Order Progress: Inspected 'dmr_records'. Active maintenance tickets and 52-week plan completion targets have been compiled with site status metrics.`;
      } else {
        targetCollection = 'local_db.enterprise';
        aiResponseText = `Data Intelligence Synthesis: Query "${textToSend}" executed against read-only MongoDB database safeguards. Ready to connect specific collection pipelines for live analytical readouts.`;
      }

      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        time: formattedTime || 'Now',
        collection: targetCollection,
      };

      setSessions((prev) =>
        prev.map((s) => (s.id === targetSessionId ? { ...s, messages: [...updatedMessages, aiMsg] } : s))
      );
      setIsAiQuerying(false);
      playSuccessChime();
    }, 900);
  };

  const handleCopy = (text, id) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast('Copied to clipboard', 'info');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  // Filter sessions by category and search
  const filteredSessions = sessions.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="company-data-viewport">
      {/* Laser Scanline Ambient Effect */}
      <div className="scanline-effect" />

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`company-data-toast toast-${toast.type}`}>
          <Sparkles size={14} color="#0284C7" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TOP EXECUTIVE HEADER                                           */}
      {/* ============================================================== */}
      <header className="company-data-top-header">
        <div className="company-data-header-left">
          {/* Back to Command Deck */}
          <button
            onMouseEnter={playHoverServo}
            onClick={() => {
              playMechanicalClick();
              if (onBackToCommandDeck) onBackToCommandDeck();
              else if (onBack) onBack();
            }}
            className="company-data-back-btn"
            title="Return to Command Deck"
          >
            <ArrowLeft size={14} />
            <span>Command Deck</span>
          </button>

          {/* Title & Badge */}
          <div className="company-data-title-box">
            <div className="company-data-tag-badge">
              <Database size={13} color="#0284C7" />
              <span>Enterprise Data Intelligence</span>
            </div>
            <h1 className="company-data-heading">Company Data AI</h1>
          </div>
        </div>

        {/* Right Header Navigation & Profile */}
        <div className="company-data-header-right">
          {/* LINK TO NOTES & DIRECTOR AI */}
          {onOpenNotes && (
            <button
              onMouseEnter={playHoverServo}
              onClick={() => {
                playMechanicalClick();
                onOpenNotes();
              }}
              className="company-data-switch-to-notes-btn"
              title="Switch to MD Notes & Director AI Workspace"
            >
              <FileText size={13} color="#EA580C" />
              <span>Notes & Director AI</span>
              <ChevronRight size={13} color="#EA580C" />
            </button>
          )}

          {/* Database Guarded Shield Pill */}
          <div className="company-data-shield-pill" title="Strictly read-only database connections active">
            <ShieldCheck size={13} color="#10B981" />
            <span>MongoDB: Read-Only Guarded</span>
          </div>

          {/* Executive Profile Capsule */}
          {currentUser && (
            <div className="exec-profile-capsule" style={{ height: '34px', padding: '0 8px 0 6px' }}>
              <span
                className={`exec-profile-avatar ${currentUser?.initials === 'MD' ? 'avatar-md' : 'avatar-ea'}`}
                style={{ width: '22px', height: '22px', fontSize: '9.5px' }}
              >
                {currentUser?.initials || 'MD'}
              </span>
              <span className="exec-profile-name" style={{ fontSize: '11.5px', paddingRight: '2px' }}>
                {currentUser?.name || 'Managing Director'}
              </span>
              {onLogout && (
                <>
                  <span className="exec-profile-divider" style={{ height: '14px' }} />
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      onLogout();
                    }}
                    className="exec-profile-logout-btn"
                    title="Sign Out"
                    style={{ height: '24px', padding: '0 6px' }}
                  >
                    <span style={{ fontSize: '10.5px' }}>Exit</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN 2-COLUMN WORKSPACE BODY                                   */}
      {/* ============================================================== */}
      <div className="company-data-body">
        {/* ============================================================== */}
        {/* LEFT COLUMN: QUERY SESSIONS & DATABASE COLLECTIONS NAV         */}
        {/* ============================================================== */}
        <aside className="company-data-sidebar">
          {/* Top Actions: Search & + New Query */}
          <div className="company-data-sidebar-top">
            <div className="company-data-search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search queries & reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="company-data-search-input"
              />
            </div>

            <button
              onMouseEnter={playHoverServo}
              onClick={handleNewSession}
              className="company-data-new-query-btn"
              title="Start a fresh data inquiry session"
            >
              <Plus size={16} />
              <span>New Data Query</span>
            </button>
          </div>

          {/* Database Collection Categories Filter */}
          <div className="company-data-filter-strip">
            <span className="filter-strip-label">Filter Collection:</span>
            <div className="filter-pills-row">
              {[
                { id: 'all', label: 'All' },
                { id: 'accounts', label: 'Accounts' },
                { id: 'imprest', label: 'Imprest' },
                { id: 'attendance', label: 'Attendance' },
                { id: 'dmr', label: 'DMR' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    playMechanicalClick();
                    setSelectedCategory(cat.id);
                  }}
                  className={`filter-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section Header */}
          <div className="company-data-sidebar-section-header">
            <span>Query Sessions ({filteredSessions.length})</span>
          </div>

          {/* Scrollable Query Sessions List */}
          <div className="company-data-session-list">
            {filteredSessions.length === 0 ? (
              <div className="company-data-empty-list">No queries match your filter</div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = s.id === activeSessionId;
                const lastMsg = s.messages?.[s.messages.length - 1]?.text || '(Fresh inquiry thread)';
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      playMechanicalClick();
                      setActiveSessionId(s.id);
                    }}
                    className={`company-data-session-card ${isSelected ? 'active' : ''}`}
                  >
                    <div className="session-card-header">
                      <span className="session-category-pill">
                        <Database size={10} />
                        <span>{s.category.toUpperCase()}</span>
                      </span>
                      <div className="session-card-actions">
                        <span className="session-card-date">{s.date}</span>
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="session-delete-icon-btn"
                          title="Delete inquiry session"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <h4 className="session-card-title">{s.title}</h4>
                    <p className="session-card-preview">{lastMsg}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer: Database Telemetry Info */}
          <div className="company-data-sidebar-footer">
            <div className="footer-status-row">
              <span className="status-live-dot" />
              <span><strong>Driver:</strong> PyMongo Direct (Read-Only)</span>
            </div>
            <div className="footer-status-row">
              <Building2 size={11} color="#0284C7" />
              <span><strong>Tenant:</strong> Executive MD Office</span>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: AI QUERY CONVERSATION & REPORTING HUB             */}
        {/* ============================================================== */}
        <main className="company-data-main-card">
          {/* Header Bar */}
          <div className="company-data-chat-header">
            <div className="company-data-chat-title-group">
              <div className="company-data-bot-avatar">
                <Database size={22} color="#0284C7" />
              </div>
              <div className="company-data-chat-info">
                <h2 className="company-data-chat-title">{activeSession?.title || 'Data Inquiry'}</h2>
                <p className="company-data-chat-subtitle">
                  Natural language database query copilot for Managing Director S GANESAMOORTHY
                </p>
              </div>
            </div>

            <div className="company-data-chat-header-actions">
              <button
                onClick={handleNewSession}
                className="company-data-header-action-btn"
                title="Start fresh inquiry thread"
              >
                <Plus size={13} />
                <span>New Inquiry</span>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="company-data-messages-container">
            {/* 1. Initial Interactive Exploration Cards (Shown when conversation is fresh) */}
            {messages.length <= 1 && (
              <div className="company-data-hub-hero">
                <div className="hero-top-pill">
                  <Sparkles size={13} color="#0284C7" />
                  <span>Enterprise Intelligence Ready</span>
                </div>
                <h3 className="hero-heading">What company data would you like to query?</h3>
                <p className="hero-subheading">
                  Select a company data pillar below or type your inquiry in the search bar.
                </p>

                {/* 4 Database Domain Pillars */}
                <div className="company-data-pillars-grid">
                  <div
                    onClick={() =>
                      handleSendQuery('Give me today’s consolidated branch collections, total receipts, and bank deposit status.')
                    }
                    className="pillar-card pillar-accounts"
                  >
                    <div className="pillar-icon-box" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                      <TrendingUp size={20} />
                    </div>
                    <h4 className="pillar-title">Daily Branch Collections</h4>
                    <p className="pillar-desc">
                      Inspect total revenue, collection totals, and bank lodgements across branches.
                    </p>
                    <span className="pillar-action">Query Accounts &rarr;</span>
                  </div>

                  <div
                    onClick={() =>
                      handleSendQuery('Audit the current pending imprest petty cash vouchers and list holders with high balances.')
                    }
                    className="pillar-card pillar-imprest"
                  >
                    <div className="pillar-icon-box" style={{ background: '#ECFDF5', color: '#047857' }}>
                      <BarChart3 size={20} />
                    </div>
                    <h4 className="pillar-title">Imprest & Cash Vouchers</h4>
                    <p className="pillar-desc">
                      Review petty cash spending, pending voucher clearances, and expense trends.
                    </p>
                    <span className="pillar-action">Query Imprest &rarr;</span>
                  </div>

                  <div
                    onClick={() =>
                      handleSendQuery('What is today’s workforce attendance count, field manager check-ins, and absent list?')
                    }
                    className="pillar-card pillar-attendance"
                  >
                    <div className="pillar-icon-box" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                      <User size={20} />
                    </div>
                    <h4 className="pillar-title">Workforce & Staff Attendance</h4>
                    <p className="pillar-desc">
                      Breakdown of site personnel, biometric punch-in times, and deployed officers.
                    </p>
                    <span className="pillar-action">Query Attendance &rarr;</span>
                  </div>

                  <div
                    onClick={() =>
                      handleSendQuery('Show the completion status of site maintenance tickets under the 52-week DMR schedule.')
                    }
                    className="pillar-card pillar-dmr"
                  >
                    <div className="pillar-icon-box" style={{ background: '#FAF5FF', color: '#7E22CE' }}>
                      <Cpu size={20} />
                    </div>
                    <h4 className="pillar-title">DMR Progress & 52-Week Plan</h4>
                    <p className="pillar-desc">
                      Track site progress percentage, completed work orders, and target milestones.
                    </p>
                    <span className="pillar-action">Query DMR &rarr;</span>
                  </div>
                </div>

                {/* Sample Prompt Chips */}
                <div className="company-data-sample-strip">
                  <span className="sample-strip-title">
                    <Compass size={12} color="#0284C7" />
                    <span>Quick Questions:</span>
                  </span>
                  <div className="sample-chips-row">
                    {[
                      'Total collection today across all branches',
                      'Pending imprest vouchers above Rs. 5000',
                      'Field managers absent this morning',
                      'DMR completed work orders this week',
                    ].map((sample, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendQuery(sample)}
                        className="sample-prompt-chip"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. Messages Stream */}
            {messages.map((msg, idx) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id || idx}
                  className={`company-data-chat-row ${isUser ? 'user-row' : 'ai-row'}`}
                >
                  <div className="chat-avatar-box">
                    {isUser ? <User size={15} /> : <Database size={15} color="#0284C7" />}
                  </div>

                  <div className={`company-data-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`}>
                    {!isUser && (
                      <div className="bubble-meta-header">
                        <span className="bubble-bot-tag">
                          <Database size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                          Company Data AI
                        </span>
                        {msg.collection && (
                          <span className="bubble-collection-tag">
                            {msg.collection}
                          </span>
                        )}
                        {msg.text && (
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.text, msg.id || idx)}
                            className="bubble-copy-btn"
                            title="Copy response"
                          >
                            <Copy size={11} />
                            <span>{copiedId === (msg.id || idx) ? 'Copied!' : 'Copy'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    <p className="bubble-text">{msg.text}</p>
                    <span className="bubble-timestamp">{msg.time}</span>
                  </div>
                </div>
              );
            })}

            {/* Thinking / Querying Indicator */}
            {isAiQuerying && (
              <div className="company-data-chat-row ai-row">
                <div className="chat-avatar-box">
                  <Database size={15} color="#0284C7" />
                </div>
                <div className="company-data-bubble ai-bubble querying-bubble">
                  <div className="querying-dots">
                    <span className="pulse-dot" />
                    <span className="pulse-dot" />
                    <span className="pulse-dot" />
                    <span className="querying-text">Consulting MongoDB collections & aggregating data...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* ============================================================== */}
          {/* STICKY BOTTOM QUERY INPUT BAR                                  */}
          {/* ============================================================== */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="company-data-input-bar"
          >
            <div className="input-row">
              <input
                type="text"
                placeholder="Ask Company Data AI (e.g. 'What is today’s total collection across branches?')..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isAiQuerying}
                className="query-input-field"
                autoFocus
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isAiQuerying}
                className="query-submit-btn"
                title="Execute Data Query (Enter)"
              >
                <Send size={15} />
                <span>Query</span>
              </button>
            </div>

            <div className="input-meta-bar">
              <span className="meta-hint">
                <Database size={11} color="#0284C7" style={{ marginRight: '5px', verticalAlign: '-1px' }} />
                Company Data AI • Natural Language MongoDB Engine • Read-Only Guarded
              </span>
              <span className="meta-key">Press ↵ Enter to query</span>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};
