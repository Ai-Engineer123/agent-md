import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Briefcase,
  Sparkles,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Loader2,
  Check,
  XCircle,
  Layers,
  HelpCircle
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

export function DayDossierPage({
  date,
  onBack,
  onChangeDate,
  currentTime,
  voiceEnabled
}) {
  const [currentDateStr, setCurrentDateStr] = useState(date || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })());

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'meetings' | 'routine' | 'operations' | 'briefing'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live datasets
  const [dayDetail, setDayDetail] = useState(null);
  const [drilldown, setDrilldown] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [tickets, setTickets] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('ALL');

  // Sync internal date when prop changes
  useEffect(() => {
    if (date && date !== currentDateStr) {
      setCurrentDateStr(date);
    }
  }, [date]);

  // Fetch full telemetry for currentDateStr
  const fetchDayData = useCallback(async (targetDate) => {
    setLoading(true);
    setError(null);
    try {
      const [dayRes, drillRes, accRes, tickRes] = await Promise.allSettled([
        fetch(`/api/calendar/day-detail?date=${targetDate}`),
        fetch(`/api/audit/drilldown?date=${targetDate}`),
        fetch(`/api/accounts/summary?date=${targetDate}`),
        fetch(`/api/tickets/summary?date=${targetDate}`)
      ]);

      if (dayRes.status === 'fulfilled' && dayRes.value.ok) {
        setDayDetail(await dayRes.value.json());
      } else {
        setDayDetail(null);
      }

      if (drillRes.status === 'fulfilled' && drillRes.value.ok) {
        setDrilldown(await drillRes.value.json());
      } else {
        setDrilldown(null);
      }

      if (accRes.status === 'fulfilled' && accRes.value.ok) {
        setAccounts(await accRes.value.json());
      } else {
        setAccounts(null);
      }

      if (tickRes.status === 'fulfilled' && tickRes.value.ok) {
        setTickets(await tickRes.value.json());
      } else {
        setTickets(null);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load day dossier:', err);
      setError('Failed to fetch data for this date. Check Python server connection.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDayData(currentDateStr);
  }, [currentDateStr, fetchDayData]);

  // Day navigation helpers
  const handlePrevDay = () => {
    playMechanicalClick();
    const d = new Date(currentDateStr + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const newStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setCurrentDateStr(newStr);
    if (onChangeDate) onChangeDate(newStr);
  };

  const handleNextDay = () => {
    playMechanicalClick();
    const d = new Date(currentDateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const newStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setCurrentDateStr(newStr);
    if (onChangeDate) onChangeDate(newStr);
  };

  const handleToday = () => {
    playSuccessChime();
    const d = new Date();
    const newStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setCurrentDateStr(newStr);
    if (onChangeDate) onChangeDate(newStr);
  };

  // Formatted date string
  const formattedDisplay = (() => {
    const d = new Date(currentDateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return currentDateStr;
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  })();

  // Extract variables
  const meetings = dayDetail?.meetings || [];
  const routine = dayDetail?.routine;
  const routineItems = routine?.items || [];
  const routineMetrics = routine?.metrics || {};
  const hasRoutine = Boolean(dayDetail?.has_routine && routine);

  const wfSummary = drilldown?.workforce?.summary || {};
  const hoPresent = wfSummary.head_office_present || 0;
  const hoTotal = wfSummary.head_office_total || 0;
  const incPresent = wfSummary.company_incharges_present || 0;
  const incTotal = wfSummary.company_incharges_total || 0;

  const accMetrics = accounts?.metrics || {};
  const imprestBalance = accMetrics.current_month_imprest_net_balance ?? accMetrics.total_unsettled_cash_held ?? 0;
  const imprestHolders = accMetrics.current_month_imprest_active_holders ?? accMetrics.holders_with_unsettled_cash ?? 0;

  const tickMetrics = tickets?.metrics || {};
  const dangerTickets = tickMetrics.total_danger_tickets_overdue_3_days || 0;

  // Filter meetings by company
  const filteredMeetings = meetings.filter((m) => {
    if (companyFilter === 'ALL') return true;
    const c = (m.company || '').toUpperCase();
    if (companyFilter === 'VFMS') return c === 'VFMS' || c === 'VFM';
    return c === companyFilter;
  });

  // Currency formatter
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="day-dossier-viewport">
      {/* 1. TOP HEADER HUD */}
      <header className="dossier-top-bar">
        <div className="dossier-bar-left">
          <div className="dossier-title-group">
            <h1 className="dossier-main-title">{formattedDisplay}</h1>
            <span className="dossier-sub-caption">Comprehensive Executive Operations, Meetings & Daily Verification Record</span>
          </div>
        </div>

        <div className="dossier-bar-right">
          {/* Day Stepper */}
          <div className="dossier-date-stepper">
            <button onClick={handlePrevDay} className="btn-step-nav" title="Previous Day">
              <ChevronLeft size={15} />
            </button>
            <span className="dossier-current-date-pill">{currentDateStr}</span>
            <button onClick={handleNextDay} className="btn-step-nav" title="Next Day">
              <ChevronRight size={15} />
            </button>
            <button onClick={handleToday} className="btn-step-today" title="Jump to Today">
              Today
            </button>
          </div>
        </div>
      </header>

      {/* 2. STATS & SUMMARY PILLARS BAR */}
      <div className="dossier-kpi-bar">
        {/* KPI 1: Executive Meetings */}
        <div className="dossier-kpi-card border-blue">
          <div className="dossier-kpi-icon icon-blue">
            <Briefcase size={18} />
          </div>
          <div className="dossier-kpi-content">
            <span className="dossier-kpi-label">EXECUTIVE MEETINGS</span>
            <div className="dossier-kpi-val-row">
              <span className="dossier-kpi-num">{meetings.length}</span>
              <span className="dossier-kpi-sub">
                {meetings.length === 1 ? 'Session Scheduled' : 'Sessions Scheduled'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Routine Checklist Status */}
        <div className="dossier-kpi-card border-emerald">
          <div className="dossier-kpi-icon icon-emerald">
            <ClipboardCheck size={18} />
          </div>
          <div className="dossier-kpi-content">
            <span className="dossier-kpi-label">10:30 AM ROUTINE CHECKLIST</span>
            <div className="dossier-kpi-val-row">
              <span className="dossier-kpi-num">
                {hasRoutine ? `${routineMetrics.completed_items || 0}/${routineMetrics.total_items || 8}` : '0/8'}
              </span>
              <span className="dossier-kpi-sub">
                {hasRoutine
                  ? `${routineMetrics.completion_percentage || 0}% Completed`
                  : 'Pending Log'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Workforce Attendance */}
        <div className="dossier-kpi-card border-amber">
          <div className="dossier-kpi-icon icon-amber">
            <Users size={18} />
          </div>
          <div className="dossier-kpi-content">
            <span className="dossier-kpi-label">WORKFORCE ATTENDANCE</span>
            <div className="dossier-kpi-val-row">
              <span className="dossier-kpi-num">
                {hoTotal > 0 ? `${hoPresent}/${hoTotal}` : '—'}
              </span>
              <span className="dossier-kpi-sub">
                {hoTotal > 0
                  ? `HO Staff Present • In-charges: ${incPresent}/${incTotal}`
                  : 'No attendance records'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Operations & Imprest */}
        <div className="dossier-kpi-card border-purple">
          <div className="dossier-kpi-icon icon-purple">
            <ShieldCheck size={18} />
          </div>
          <div className="dossier-kpi-content">
            <span className="dossier-kpi-label">SLA & IMPREST TELEMETRY</span>
            <div className="dossier-kpi-val-row">
              <span className="dossier-kpi-num">
                {dangerTickets > 0 ? `${dangerTickets} Breaches` : '0 Breaches'}
              </span>
              <span className="dossier-kpi-sub">
                {imprestHolders > 0
                  ? `${formatINR(imprestBalance)} across ${imprestHolders} holders`
                  : 'All Imprest Reconciled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION NAVIGATION TABS */}
      <div className="dossier-nav-tabs">
        <button
          onClick={() => {
            playMechanicalClick();
            setActiveTab('all');
          }}
          className={`dossier-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        >
          <Layers size={14} />
          <span>Full Operations Dossier</span>
        </button>
        <button
          onClick={() => {
            playMechanicalClick();
            setActiveTab('meetings');
          }}
          className={`dossier-tab-btn ${activeTab === 'meetings' ? 'active' : ''}`}
        >
          <Briefcase size={14} />
          <span>Executive Meetings ({meetings.length})</span>
        </button>
        <button
          onClick={() => {
            playMechanicalClick();
            setActiveTab('routine');
          }}
          className={`dossier-tab-btn ${activeTab === 'routine' ? 'active' : ''}`}
        >
          <ClipboardCheck size={14} />
          <span>10:30 AM Routine Checklist ({routineItems.length})</span>
        </button>
        <button
          onClick={() => {
            playMechanicalClick();
            setActiveTab('operations');
          }}
          className={`dossier-tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
        >
          <TrendingUp size={14} />
          <span>Workforce & Telemetry</span>
        </button>
      </div>

      {/* 4. MAIN DOSSIER CONTENT */}
      {loading ? (
        <div className="dossier-loading-state">
          <Loader2 size={32} className="animate-spin text-cyan" />
          <h3 className="dossier-state-title">Retrieving Day Operations Dossier...</h3>
          <p className="dossier-state-sub">Fetching live checklist, meetings, and workforce records for {currentDateStr}</p>
        </div>
      ) : error ? (
        <div className="dossier-error-state">
          <AlertCircle size={32} color="#EF4444" />
          <h3 className="dossier-state-title">Telemetry Connection Alert</h3>
          <p className="dossier-state-sub">{error}</p>
          <button onClick={() => fetchDayData(currentDateStr)} className="btn-dossier-retry">
            <RotateCcw size={14} />
            <span>Retry Sync</span>
          </button>
        </div>
      ) : (
        <main className="dossier-body-grid">
          {/* ======================================================== */}
          {/* SECTION 1: EXECUTIVE MEETINGS                            */}
          {/* ======================================================== */}
          {(activeTab === 'all' || activeTab === 'meetings') && (
            <section className="dossier-section-card">
              <div className="dossier-card-header">
                <div className="header-left">
                  <div className="section-badge badge-blue">ENTERPRISE REVIEWS</div>
                  <h2 className="section-title">Executive Review Meetings ({meetings.length})</h2>
                </div>

                {/* Company Filter Pills */}
                {meetings.length > 0 && (
                  <div className="company-filter-pills">
                    {['ALL', 'VFMS', 'VTS', 'CC', 'PROFOX'].map((co) => (
                      <button
                        key={co}
                        onClick={() => {
                          playMechanicalClick();
                          setCompanyFilter(co);
                        }}
                        className={`co-pill-btn ${companyFilter === co ? 'active' : ''}`}
                      >
                        {co}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {filteredMeetings.length === 0 ? (
                <div className="dossier-empty-card">
                  <Briefcase size={28} color="#94A3B8" />
                  <h4>No Executive Meetings Found</h4>
                  <p>
                    {companyFilter !== 'ALL'
                      ? `No ${companyFilter} meetings scheduled for ${currentDateStr}.`
                      : `Zero corporate review meetings scheduled on ${currentDateStr}.`}
                  </p>
                </div>
              ) : (
                <div className="dossier-meetings-list">
                  {filteredMeetings.map((m) => {
                    const co = (m.company || 'GEN').toUpperCase();
                    const status = (m.status || 'SCHEDULED').toUpperCase();
                    const topics = m.topics || [];

                    return (
                      <article key={m.id || m.title} className="dossier-meeting-item">
                        <div className="meeting-item-top">
                          <div className="item-identity">
                            <span className={`company-pill-badge badge-${co.toLowerCase()}`}>
                              {co}
                            </span>
                            <span className="department-tag">{m.department || 'Operations'}</span>
                            <span className={`status-pill pill-${status.toLowerCase()}`}>
                              {status === 'COMPLETED' ? 'Completed' : status === 'IN_PROGRESS' ? 'In Progress' : 'Scheduled'}
                            </span>
                          </div>

                          <div className="time-location-pill">
                            <Clock size={12} color="#ff914d" />
                            <span>{m.time || '10:00 AM - 11:30 AM'}</span>
                            {m.location && <span className="loc-sep">•</span>}
                            {m.location && <span className="loc-text">{m.location}</span>}
                          </div>
                        </div>

                        <h3 className="meeting-item-title">{m.title}</h3>

                        {m.md_priority_notes && (
                          <div className="md-priority-callout">
                            <span className="priority-label">MD Directive:</span>
                            <span className="priority-text">{m.md_priority_notes}</span>
                          </div>
                        )}

                        {/* Topics Discussion Checklist */}
                        {topics.length > 0 && (
                          <div className="meeting-topics-box">
                            <div className="topics-header">
                              <span className="topics-label">Agenda & Review Topics ({topics.length}):</span>
                            </div>
                            <div className="topics-grid">
                              {topics.map((t, tIdx) => (
                                <div key={t.id || tIdx} className="topic-chip">
                                  <span className="topic-num">{tIdx + 1}.</span>
                                  <span className="topic-name">{t.title || t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ======================================================== */}
          {/* SECTION 2: 10:30 AM ROUTINE CHECKLIST (8 ITEMS)          */}
          {/* ======================================================== */}
          {(activeTab === 'all' || activeTab === 'routine') && (
            <section className="dossier-section-card">
              <div className="dossier-card-header">
                <div className="header-left">
                  <div className="section-badge badge-emerald">OPERATIONAL GOVERNANCE</div>
                  <h2 className="section-title">Daily Routine Checklist (10:30 AM Protocol)</h2>
                </div>
                <div className="checklist-completion-chip">
                  <CheckCircle2 size={13} color="#059669" />
                  <span>
                    {hasRoutine
                      ? `${routineMetrics.completed_items || 0} of ${routineMetrics.total_items || 8} Verified`
                      : 'Log Not Started'}
                  </span>
                </div>
              </div>

              {!hasRoutine || routineItems.length === 0 ? (
                <div className="dossier-empty-card">
                  <ClipboardCheck size={28} color="#94A3B8" />
                  <h4>No Checklist Log Recorded</h4>
                  <p>Daily routine items have not been initialized or submitted for {currentDateStr}.</p>
                </div>
              ) : (
                <div className="dossier-checklist-grid">
                  {routineItems.map((item, idx) => {
                    const isCompleted = Boolean(item.completed);
                    const isManual = Boolean(item.manual_verified);
                    const isAi = Boolean(item.ai_verified);

                    return (
                      <div
                        key={item.id || item.number || idx}
                        className={`dossier-chk-card ${isCompleted ? 'is-completed' : 'is-pending'}`}
                      >
                        <div className="chk-card-top">
                          <span className="chk-num-badge">#{item.number || idx + 1}</span>
                          <span className="chk-category-tag">{item.category || 'General'}</span>

                          <div className="chk-badges-row">
                            {isAi && (
                              <span className="verification-pill ai-pill" title="AI Verification Complete">
                                <Sparkles size={10} /> AI Verified
                              </span>
                            )}
                            {isManual && (
                              <span className="verification-pill manual-pill" title="Manual Verification Complete">
                                <Check size={10} /> Manual Verified
                              </span>
                            )}
                            {!isCompleted && (
                              <span className="verification-pill pending-pill">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        <h4 className="chk-card-title">{item.title}</h4>
                        <p className="chk-card-desc">{item.english_summary || item.description || ''}</p>

                        {item.feedback && (
                          <div className="chk-feedback-box">
                            <span className="fb-label">Feedback:</span> {item.feedback}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ======================================================== */}
          {/* SECTION 3: WORKFORCE & OPERATIONAL TELEMETRY             */}
          {/* ======================================================== */}
          {(activeTab === 'all' || activeTab === 'operations') && (
            <section className="dossier-section-card">
              <div className="dossier-card-header">
                <div className="header-left">
                  <div className="section-badge badge-amber">ORGANIZATIONAL TELEMETRY</div>
                  <h2 className="section-title">Workforce Attendance & Accounts Snapshot</h2>
                </div>
              </div>

              <div className="dossier-telemetry-grid">
                {/* Workforce Box */}
                <div className="telemetry-box">
                  <div className="telemetry-box-head">
                    <Users size={16} color="#ff914d" />
                    <h4>Workforce Roll Call</h4>
                  </div>
                  <div className="telemetry-stats-row">
                    <div className="sub-stat">
                      <span className="stat-label">Head Office Staff</span>
                      <span className="stat-val">{hoPresent}/{hoTotal}</span>
                      <span className="stat-sub">Present Today</span>
                    </div>
                    <div className="sub-stat">
                      <span className="stat-label">Company In-charges</span>
                      <span className="stat-val">{incPresent}/{incTotal}</span>
                      <span className="stat-sub">Checked In</span>
                    </div>
                  </div>
                  {drilldown?.workforce?.on_leave?.length > 0 && (
                    <div className="leave-details-list">
                      <span className="leave-heading">On Leave ({drilldown.workforce.on_leave.length}):</span>
                      <div className="leave-chips-wrap">
                        {drilldown.workforce.on_leave.map((p, pIdx) => (
                          <span key={pIdx} className="leave-pill">
                            {p.name || p.employee_name} ({p.department || 'HO'})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Imprest & Cash Box */}
                <div className="telemetry-box">
                  <div className="telemetry-box-head">
                    <ShieldCheck size={16} color="#D97706" />
                    <h4>Imprest Cash & Vouchers</h4>
                  </div>
                  <div className="telemetry-stats-row">
                    <div className="sub-stat">
                      <span className="stat-label">Unsettled Imprest Held</span>
                      <span className="stat-val text-amber">{formatINR(imprestBalance)}</span>
                      <span className="stat-sub">Across {imprestHolders} Active Holders</span>
                    </div>
                    <div className="sub-stat">
                      <span className="stat-label">SLA Breach Overdue &gt; 3 Days</span>
                      <span className={`stat-val ${dangerTickets > 0 ? 'text-danger' : 'text-emerald'}`}>
                        {dangerTickets} Tickets
                      </span>
                      <span className="stat-sub">Immediate Escalations</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: OFFICIAL AI BRIEFING DISPATCH                 */}
          {/* ======================================================== */}
          {dayDetail?.ai_report?.summary && (
            <section className="dossier-section-card">
              <div className="dossier-card-header">
                <div className="header-left">
                  <div className="section-badge badge-purple">AI EXECUTIVE SYNTHESIS</div>
                  <h2 className="section-title">Official AI Briefing Dispatch</h2>
                </div>
              </div>
              <div className="ai-report-box">
                <p className="ai-report-text">{dayDetail.ai_report.summary}</p>
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
