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
  HelpCircle,
  Bot,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';
import { AuditDrilldownModals } from './AuditDrilldownModals';

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
  const [aiReport, setAiReport] = useState(null);
  const [dmrData, setDmrData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('ALL');

  // Drilldown Modal Popup States
  const [activeModal, setActiveModal] = useState(null); // 'workforce' | 'vfm' | 'dmr' | 'tickets' | 'plan' | 'imprest' | null
  const [modalInitialTab, setModalInitialTab] = useState(null);

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
      const [dayRes, drillRes, accRes, tickRes, aiRes, dmrRes, planRes] = await Promise.allSettled([
        fetch(`/api/calendar/day-detail?date=${targetDate}`),
        fetch(`/api/audit/drilldown?date=${targetDate}`),
        fetch(`/api/accounts/summary?date=${targetDate}`),
        fetch(`/api/tickets/summary?date=${targetDate}`),
        fetch(`/api/ai/latest-summary?date=${targetDate}`),
        fetch(`/api/dmr/summary?date=${targetDate}`),
        fetch(`/api/plan/summary?date=${targetDate}`)
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

      if (aiRes.status === 'fulfilled' && aiRes.value.ok) {
        setAiReport(await aiRes.value.json());
      } else {
        setAiReport(null);
      }

      if (dmrRes.status === 'fulfilled' && dmrRes.value.ok) {
        setDmrData(await dmrRes.value.json());
      } else {
        setDmrData(null);
      }

      if (planRes.status === 'fulfilled' && planRes.value.ok) {
        setPlanData(await planRes.value.json());
      } else {
        setPlanData(null);
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
    if (val == null || isNaN(val)) return '₹ 0';
    const num = Math.round(Number(val));
    const isNeg = num < 0;
    const s = String(Math.abs(num));
    if (s.length <= 3) {
      return `${isNeg ? '-' : ''}₹ ${s}`;
    }
    const last3 = s.slice(-3);
    let rest = s.slice(0, -3);
    const groups = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) groups.unshift(rest);
    return `${isNeg ? '-' : ''}₹ ${groups.join(',')},${last3}`;
  };

  // Text Normalizer: Replaces western currencies & formats raw 24-hr times
  const formatIndianText = (str) => {
    if (!str || typeof str !== 'string') return str || '';
    let formatted = str.replace(/Rs\.?\s*([\d,]+(?:\.\d+)?)/gi, (match, numStr) => {
      const rawNum = parseFloat(numStr.replace(/,/g, ''));
      if (isNaN(rawNum)) return match;
      return formatINR(rawNum);
    });
    formatted = formatted.replace(/\bat\s+(\d{1,2}):(\d{2})(?!\s*(?:AM|PM|am|pm))\b/gi, (match, h, m) => {
      const hr = parseInt(h, 10);
      const ampm = hr >= 12 ? 'PM' : 'AM';
      const hr12 = hr % 12 || 12;
      return `at ${String(hr12).padStart(2, '0')}:${m} ${ampm}`;
    });
    return formatted;
  };

  // Parses inline markdown: **bold**, *italic*, badges, currencies
  const renderInline = (str) => {
    if (!str) return null;
    const text = formatIndianText(str);

    const tokens = text.split(/(\*\*.*?\*\*|\*[^*]+?\*)/g);
    return tokens.map((token, idx) => {
      if (!token) return null;
      if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
        return (
          <strong key={idx} className="briefing-strong">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
        return (
          <em key={idx} className="briefing-em">
            {token.slice(1, -1)}
          </em>
        );
      }
      if (/\((?:not checked|unchecked|Overdue|Urgent)\)/i.test(token)) {
        const subParts = token.split(/(\((?:not checked|unchecked|Overdue|Urgent)\))/i);
        return (
          <React.Fragment key={idx}>
            {subParts.map((sub, sIdx) => {
              if (/^\((?:not checked|unchecked|Overdue|Urgent)\)$/i.test(sub)) {
                return (
                  <span key={sIdx} className="briefing-inline-chip chip-warning">
                    {sub}
                  </span>
                );
              }
              return sub;
            })}
          </React.Fragment>
        );
      }
      return token;
    });
  };

  // Parses full executive markdown briefing into clean, structured HTML blocks
  const renderExecutiveBriefing = (rawMarkdown) => {
    if (!rawMarkdown) return null;

    const lines = rawMarkdown.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Check for Markdown Table
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        const headerLine = tableLines[0];
        const headers = headerLine
          .split('|')
          .slice(1, -1)
          .map((h) => h.trim());

        const dataRows = [];
        for (let r = 1; r < tableLines.length; r++) {
          const rowLine = tableLines[r];
          if (/^\|[\s-:]+\|$/.test(rowLine) || rowLine.replace(/[|\s-:]/g, '').length === 0) {
            continue;
          }
          const cells = rowLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          dataRows.push(cells);
        }

        elements.push(
          <div key={`table-${i}`} className="briefing-table-wrap">
            <table className="briefing-render-table">
              <thead>
                <tr>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx}>{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{renderInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      // Blockquote / Alert callouts (> ...)
      if (trimmed.startsWith('>')) {
        const calloutText = trimmed.replace(/^>\s*/, '');
        elements.push(
          <div key={`callout-${i}`} className="briefing-callout-alert">
            <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{renderInline(calloutText)}</div>
          </div>
        );
        i++;
        continue;
      }

      // Numbered Directives (e.g. 1. **Directive Title** – ...)
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        const num = numMatch[1];
        const content = numMatch[2];
        elements.push(
          <div key={`directive-${i}`} className="briefing-directive-item">
            <div className="directive-number-badge">{String(num).padStart(2, '0')}</div>
            <div className="directive-content">{renderInline(content)}</div>
          </div>
        );
        i++;
        continue;
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="briefing-h1">
            {renderInline(trimmed.replace(/^#\s*/, ''))}
          </h1>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('## ')) {
        const h2Text = trimmed.replace(/^##\s*/, '');
        const isWorkforce = /Enterprise Workforce|Roll‑Call Audit|Tasks 1 & 3/i.test(h2Text);
        const isDmr = /Site Operations|DMR Compliance|Task 7/i.test(h2Text);
        const isTickets = /Operational Friction|SLA Danger|Task 6/i.test(h2Text);
        const isMaintenance = /Planned Maintenance|Asset Reliability|Task 8/i.test(h2Text);

        elements.push(
          <div key={`h2-${i}`} className="briefing-h2-wrap">
            <h2 className="briefing-h2">
              {renderInline(h2Text)}
            </h2>
            {isWorkforce && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('checked');
                    setActiveModal('workforce');
                  }}
                  className="heading-inspect-btn success"
                  title="View checked-in staff details"
                >
                  <CheckCircle2 size={14} />
                  <span>View Checked-In ({drilldown?.workforce?.checked_in?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('unchecked');
                    setActiveModal('workforce');
                  }}
                  className="heading-inspect-btn danger"
                  title="View unchecked staff and absent personnel details"
                >
                  <Users size={14} />
                  <span>View Not Checked-In ({drilldown?.workforce?.not_checked_in?.length ?? 0})</span>
                </button>
              </div>
            )}
            {isDmr && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('submitted');
                    setActiveModal('dmr');
                  }}
                  className="heading-inspect-btn dmr"
                  title="View FMS sites that submitted DMR reports yesterday"
                >
                  <FileText size={14} />
                  <span>View Submitted DMRs ({drilldown?.dmr_compliance?.submitted_sites?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('pending');
                    setActiveModal('dmr');
                  }}
                  className="heading-inspect-btn warning"
                  title="View FMS sites with pending DMR reports"
                >
                  <AlertTriangle size={14} />
                  <span>View Pending DMRs ({drilldown?.dmr_compliance?.pending_sites?.length ?? 0})</span>
                </button>
              </div>
            )}
            {isTickets && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('danger');
                    setActiveModal('tickets');
                  }}
                  className="heading-inspect-btn danger"
                  title="View tickets in SLA danger or breached status"
                >
                  <AlertTriangle size={14} />
                  <span>View Danger Tickets ({drilldown?.tickets?.danger_tickets?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('all');
                    setActiveModal('tickets');
                  }}
                  className="heading-inspect-btn tickets"
                  title="View all operational tickets"
                >
                  <FileText size={14} />
                  <span>View All Tickets ({drilldown?.tickets?.all_tickets?.length ?? 0})</span>
                </button>
              </div>
            )}
            {isMaintenance && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('yesterday');
                    setActiveModal('plan');
                  }}
                  className="heading-inspect-btn success"
                  title="View yesterday's completed operational maintenance tasks"
                >
                  <CheckCircle2 size={14} />
                  <span>View Yesterday Completed ({planData?.metrics?.yesterday_completed_tasks ?? 0})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('today');
                    setActiveModal('plan');
                  }}
                  className="heading-inspect-btn dmr"
                  title="View today's planned and active site maintenance tasks"
                >
                  <Clock size={14} />
                  <span>View Today Planned ({planData?.metrics?.today_total_tasks ?? 0})</span>
                </button>
                <span className="heading-audit-window-tag" title="Data scope timeline">
                  <Clock size={12} color="#ff914d" />
                  <span>{planData?.metrics?.current_week_number ? `Week ${planData.metrics.current_week_number} Active (${planData.metrics.total_tasks_this_week || 0} Tasks)` : 'Week 42 Active'}</span>
                </span>
              </div>
            )}
          </div>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('### ')) {
        const h3Text = trimmed.replace(/^###\s*/, '');
        const isVfm = /3\.3|VFM Portal|Work Updates/i.test(h3Text);
        const isImprest = /Imprest Holder|Imprest Management/i.test(h3Text);

        elements.push(
          <div key={`h3-${i}`} className="briefing-h3-wrap">
            <h3 className="briefing-h3">
              {renderInline(h3Text)}
            </h3>
            {isVfm && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('submitted');
                    setActiveModal('vfm');
                  }}
                  className="heading-inspect-btn vfm"
                  title="View users who submitted yesterday's work updates"
                >
                  <CheckCircle2 size={14} />
                  <span>View Submitted Updates ({drilldown?.vfm_portal?.submitted_users?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('not_submitted');
                    setActiveModal('vfm');
                  }}
                  className="heading-inspect-btn danger"
                  title="View users who did not submit yesterday's work updates"
                >
                  <AlertTriangle size={14} />
                  <span>View Not Submitted ({drilldown?.vfm_portal?.not_submitted_users?.length ?? 0})</span>
                </button>
              </div>
            )}
            {isImprest && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('active');
                    setActiveModal('imprest');
                  }}
                  className="heading-inspect-btn success"
                  title="View active imprest holders for the current month"
                >
                  <CheckCircle2 size={14} />
                  <span>View Active Holders ({accounts?.imprest_audit?.current_month_activity?.active_holders_count ?? accounts?.imprest_audit?.current_month_activity?.top_active_holders?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('all_unsettled');
                    setActiveModal('imprest');
                  }}
                  className="heading-inspect-btn warning"
                  title="View all in-charges with unsettled cash balances"
                >
                  <DollarSign size={14} />
                  <span>View All Unsettled ({accounts?.imprest_audit?.holders_with_unsettled_balance?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setModalInitialTab('overdue');
                    setActiveModal('imprest');
                  }}
                  className="heading-inspect-btn danger"
                  title="View critical overdue imprest holders with no settlement in over 180 days"
                >
                  <AlertTriangle size={14} />
                  <span>Critical Overdue &gt;180d ({accounts?.imprest_audit?.summary?.critical_overdue_holders ?? 0})</span>
                </button>
              </div>
            )}
          </div>
        );
        i++;
        continue;
      }

      if (trimmed.startsWith('#### ')) {
        elements.push(
          <h4 key={`h4-${i}`} className="briefing-h4">
            {renderInline(trimmed.replace(/^####\s*/, ''))}
          </h4>
        );
        i++;
        continue;
      }

      // Horizontal Divider
      if (trimmed.startsWith('---')) {
        elements.push(<hr key={`divider-${i}`} className="briefing-divider" />);
        i++;
        continue;
      }

      // Bullet items
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.replace(/^[-*]\s*/, '');
        elements.push(
          <div key={`bullet-${i}`} className="briefing-bullet-item">
            <span className="bullet-dot">•</span>
            <span>{renderInline(bulletText)}</span>
          </div>
        );
        i++;
        continue;
      }

      // Subtitle / Directives heading
      if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
        elements.push(
          <div key={`subtitle-${i}`} className="briefing-subtitle">
            {renderInline(trimmed)}
          </div>
        );
        i++;
        continue;
      }

      // Regular Paragraph
      elements.push(
        <p key={`p-${i}`} className="briefing-paragraph">
          {renderInline(trimmed)}
        </p>
      );
      i++;
    }

    return elements;
  };

  return (
    <div className="day-dossier-viewport">
      {/* 1. TOP HEADER HUD */}
      <header className="dossier-top-bar">
        <div className="dossier-bar-left">
          {onBack && (
            <button
              onClick={() => {
                playMechanicalClick();
                onBack();
              }}
              className="btn-step-nav"
              style={{ marginRight: 10 }}
              title="Return to Calendar / Previous View"
            >
              <ArrowLeft size={16} />
            </button>
          )}
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
            setActiveTab('briefing');
          }}
          className={`dossier-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
        >
          <Bot size={14} />
          <span>AI Executive Briefing</span>
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
          <p className="dossier-state-sub">Fetching live checklist, meetings, workforce & AI executive brief for {currentDateStr}</p>
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
          {/* SECTION 0: DAILY AI EXECUTIVE INTELLIGENCE BRIEFING      */}
          {/* ======================================================== */}
          {/* ======================================================== */}
          {/* SECTION 0: DAILY AI EXECUTIVE INTELLIGENCE BRIEFING      */}
          {/* ======================================================== */}
          {(activeTab === 'all' || activeTab === 'briefing') && (() => {
            const hasValidReport = Boolean(
              aiReport &&
              aiReport.has_report !== false &&
              !aiReport.is_fallback &&
              aiReport.date === currentDateStr &&
              aiReport.ai_response_raw
            );

            return (
              <section className="dossier-section-card ai-briefing-dossier-card">
                <div className="dossier-card-header">
                  <div className="header-left">
                    <div className="section-badge badge-orange" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Bot size={13} color="#ff914d" />
                      <span>DAILY EXECUTIVE INTELLIGENCE</span>
                    </div>
                    <h2 className="section-title">
                      {hasValidReport && aiReport?.model_used
                        ? `AI Executive Intelligence Briefing (${aiReport.model_used.includes('local') ? 'Local AI' : 'AI Engine'})`
                        : 'AI Executive Intelligence Briefing'}
                    </h2>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {hasValidReport && aiReport?.timestamp && (
                      <span className="heading-audit-window-tag" title="Generation Timestamp">
                        <Clock size={12} color="#ff914d" />
                        <span>Archived: {new Date(aiReport.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    )}
                  </div>
                </div>

                {!hasValidReport ? (
                  <div className="dossier-empty-card" style={{ padding: '44px 20px', textAlign: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(255, 145, 77, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                      border: '1px solid rgba(255, 145, 77, 0.2)'
                    }}>
                      <Bot size={24} color="#ff914d" />
                    </div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: '#1E293B', fontFamily: "'Space Grotesk', sans-serif" }}>
                      No AI Executive Briefing Archived for {formattedDisplay}
                    </h4>
                    <p style={{ margin: '0 auto 14px auto', maxWidth: '420px', fontSize: '12.5px', color: '#64748B', lineHeight: 1.5, fontFamily: "'Space Grotesk', sans-serif" }}>
                      The AI executive briefing has not been archived for {currentDateStr}. Each intelligence briefing is strictly date-specific.
                    </p>
                    {aiReport?.available_dates && aiReport.available_dates.length > 0 && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: '#F1F5F9', fontSize: '12px', color: '#475569', fontFamily: "'Space Grotesk', sans-serif" }}>
                        <span>Archived Briefings:</span>
                        {aiReport.available_dates.map((d) => (
                          <button
                            key={d}
                            onClick={() => {
                              playMechanicalClick();
                              setCurrentDateStr(d);
                            }}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '10px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#ff914d',
                              cursor: 'pointer',
                              fontFamily: "'Space Grotesk', sans-serif"
                            }}
                            title={`Switch to ${d} Dossier`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="dossier-briefing-body" style={{ marginTop: '12px' }}>
                    {renderExecutiveBriefing(aiReport.ai_response_raw)}
                  </div>
                )}
              </section>
            );
          })()}

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

      {/* 5. AUDIT DRILLDOWN POPUP MODALS */}
      <AuditDrilldownModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        drilldownData={drilldown}
        accountsData={accounts}
        ticketsData={tickets}
        dmrData={dmrData}
        planData={planData}
        initialTab={modalInitialTab}
        selectedDate={currentDateStr}
      />
    </div>
  );
}
