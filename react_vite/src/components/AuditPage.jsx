import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  RotateCcw,
  Bot,
  DollarSign,
  AlertTriangle,
  FileText,
  Calendar,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Building,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  CalendarOff,
  Building2,
  X
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

// Custom Executive Date Picker Dropdown with Poppins Typography
const CustomDatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Parse current selected date
  const parsed = new Date(value + 'T00:00:00');
  const [viewDate, setViewDate] = useState(() => isNaN(parsed.getTime()) ? new Date() : parsed);

  // Sync viewDate when value changes externally
  useEffect(() => {
    const p = new Date(value + 'T00:00:00');
    if (!isNaN(p.getTime())) setViewDate(p);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    playMechanicalClick();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    playMechanicalClick();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handleSelectDay = (dayNum) => {
    playMechanicalClick();
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(dayNum).padStart(2, '0');
    const dateStr = `${viewYear}-${mStr}-${dStr}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e) => {
    e.stopPropagation();
    playSuccessChime();
    const now = new Date();
    const yStr = now.getFullYear();
    const mStr = String(now.getMonth() + 1).padStart(2, '0');
    const dStr = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yStr}-${mStr}-${dStr}`;
    onChange(todayStr);
    setViewDate(now);
    setIsOpen(false);
  };

  const formattedDisplay = (() => {
    const p = new Date(value + 'T00:00:00');
    if (isNaN(p.getTime())) return value;
    return p.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="custom-datepicker-wrap" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          playMechanicalClick();
          setIsOpen(!isOpen);
        }}
        className={`custom-datepicker-trigger ${isOpen ? 'is-active' : ''}`}
        title="Choose Audit Date"
      >
        <Calendar size={15} color="#ff914d" />
        <span className="datepicker-display-val">{formattedDisplay}</span>
        <ChevronDown size={14} className={`datepicker-arrow ${isOpen ? 'rotate-up' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-datepicker-popup">
          {/* Header */}
          <div className="cdp-header">
            <button type="button" onClick={handlePrevMonth} className="cdp-nav-btn" title="Previous Month">
              <ChevronLeft size={14} />
            </button>
            <span className="cdp-month-title">{monthNames[viewMonth]} {viewYear}</span>
            <button type="button" onClick={handleNextMonth} className="cdp-nav-btn" title="Next Month">
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday Row */}
          <div className="cdp-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
              <span key={w} className="cdp-weekday">{w}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="cdp-grid">
            {/* Trailing prev month days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const day = daysInPrevMonth - firstDayIndex + idx + 1;
              return <span key={`prev-${idx}`} className="cdp-day cdp-day-muted">{day}</span>;
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dStr === value;
              const isToday = dStr === todayStr;

              return (
                <button
                  type="button"
                  key={dStr}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`cdp-day cdp-day-active ${isSelected ? 'cdp-selected' : ''} ${isToday ? 'cdp-today' : ''}`}
                >
                  {dayNum}
                </button>
              );
            })}

            {/* Leading next month days */}
            {(() => {
              const totalCells = firstDayIndex + daysInMonth;
              const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
              return Array.from({ length: remaining }).map((_, idx) => (
                <span key={`next-${idx}`} className="cdp-day cdp-day-muted">{idx + 1}</span>
              ));
            })()}
          </div>

          {/* Footer Shortcuts */}
          <div className="cdp-footer">
            <button type="button" onClick={handleSelectToday} className="cdp-today-btn">
              Today
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="cdp-close-btn">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AuditPage = ({
  onBack,
  voiceEnabled,
  onToggleVoice,
  currentTime,
  initialModal = null,
  initialModalTab = null,
  onClearInitialModal = null
}) => {
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr);
  const [activeTab, setActiveTab] = useState('briefing'); // 'briefing' | 'accounts' | 'tickets' | 'dmr' | 'plan'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [imprestSearch, setImprestSearch] = useState('');
  const [ticketsFilter, setTicketsFilter] = useState('all'); // 'all' | 'danger'
  const [dmrFilter, setDmrFilter] = useState('all'); // 'all' | 'submitted' | 'pending'
  const [dmrSearch, setDmrSearch] = useState('');

  // Drilldown Modal Popup States
  const [drilldownData, setDrilldownData] = useState(null);
  const [activeModal, setActiveModal] = useState(initialModal); // 'workforce' | 'vfm' | 'dmr' | 'tickets' | null
  const [workforceModalTab, setWorkforceModalTab] = useState(initialModalTab || 'checked'); // 'checked' | 'unchecked' | 'leave'
  const [vfmModalTab, setVfmModalTab] = useState(initialModalTab || 'submitted'); // 'submitted' | 'not_submitted'
  const [dmrModalTab, setDmrModalTab] = useState(initialModalTab || 'submitted'); // 'submitted' | 'pending'
  const [ticketsModalTab, setTicketsModalTab] = useState(initialModalTab || 'danger'); // 'danger' | 'internal' | 'external' | 'all'
  const [planModalTab, setPlanModalTab] = useState('yesterday'); // 'yesterday' | 'today' | 'week' | 'assets'
  const [imprestModalTab, setImprestModalTab] = useState('active'); // 'active' | 'all_unsettled' | 'overdue'

  // Close modal helper
  const handleCloseModal = () => {
    playMechanicalClick();
    setActiveModal(null);
    if (onClearInitialModal) onClearInitialModal();
  };

  // Sync modal when opened externally via prop or URL hash
  useEffect(() => {
    if (initialModal) {
      setActiveModal(initialModal);
      if (initialModalTab) {
        if (initialModal === 'workforce') setWorkforceModalTab(initialModalTab);
        if (initialModal === 'dmr') setDmrModalTab(initialModalTab);
        if (initialModal === 'tickets') setTicketsModalTab(initialModalTab);
        if (initialModal === 'vfm') setVfmModalTab(initialModalTab);
      }
    } else {
      try {
        const hash = window.location.hash;
        if (hash.includes('modal=')) {
          const match = hash.match(/modal=([a-z_]+)/i);
          if (match && match[1]) {
            setActiveModal(match[1]);
          }
        }
      } catch {}
    }
  }, [initialModal, initialModalTab]);

  // Dynamic Telemetry Data States
  const [aiReport, setAiReport] = useState(null);
  const [accountsData, setAccountsData] = useState(null);
  const [ticketsData, setTicketsData] = useState(null);
  const [dmrData, setDmrData] = useState(null);
  const [planData, setPlanData] = useState(null);

  // 12-hour AM/PM Formatter
  const format12HourTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
  };

  // Full Date & Time Formatter for Last Known Check-in
  const formatDateTimeDisplay = (isoStr) => {
    if (!isoStr) return null;
    try {
      const cleanStr = String(isoStr).replace('Z', '').split('.')[0];
      const parts = cleanStr.split('T');
      const datePart = parts[0];

      const d = new Date(isoStr);
      let dateFormatted = datePart;
      let dayName = '';
      if (!isNaN(d.getTime())) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        dateFormatted = `${String(d.getDate()).padStart(2, '0')}-${monthNames[d.getMonth()]}-${d.getFullYear()}`;
        dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      }

      const timeFormatted = format12HourTime(isoStr);
      return {
        dateStr: dateFormatted,
        dayName,
        timeStr: timeFormatted
      };
    } catch {
      return {
        dateStr: String(isoStr).split('T')[0] || String(isoStr),
        dayName: '',
        timeStr: ''
      };
    }
  };

  // Indian Rupee Formatter
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

    // Split by bold (**...**) and italic (*...*)
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
      // Check for inline badges like (not checked), (unchecked), Overdue, Urgent
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

      // 1. Skip empty lines
      if (!trimmed) {
        i++;
        continue;
      }

      // 2. Check for Markdown Table (starts with | and ends with |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        // Parse headers from first line
        const headerLine = tableLines[0];
        const headers = headerLine
          .split('|')
          .slice(1, -1)
          .map((h) => h.trim());

        // Find data rows (ignore separator line like |---|---|)
        const dataRows = [];
        for (let r = 1; r < tableLines.length; r++) {
          const rowLine = tableLines[r];
          // Check if separator line
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

      // 3. Blockquote / Alert callouts (> ...)
      if (trimmed.startsWith('>')) {
        const calloutText = trimmed.replace(/^>\s*/, '');
        elements.push(
          <div key={`callout-${i}`} className="briefing-callout-alert">
            <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{renderInline(calloutText)}</div>
          </div>
        );
        i++;
        continue;
      }

      // 4. Numbered Directives (e.g. 1. **Attendance Discipline** – ...)
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

      // 5. Headings
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
                    setWorkforceModalTab('checked');
                    setActiveModal('workforce');
                  }}
                  className="heading-inspect-btn success"
                  title="View checked-in staff details"
                >
                  <CheckCircle2 size={14} />
                  <span>View Checked-In ({drilldownData?.workforce?.checked_in?.length ?? 39})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setWorkforceModalTab('unchecked');
                    setActiveModal('workforce');
                  }}
                  className="heading-inspect-btn danger"
                  title="View unchecked staff and absent personnel details"
                >
                  <Users size={14} />
                  <span>View Not Checked-In ({drilldownData?.workforce?.not_checked_in?.length ?? 4})</span>
                </button>
              </div>
            )}
            {isDmr && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setDmrModalTab('submitted');
                    setActiveModal('dmr');
                  }}
                  className="heading-inspect-btn dmr"
                  title="View FMS sites that submitted DMR reports yesterday"
                >
                  <FileText size={14} />
                  <span>View Submitted DMRs ({drilldownData?.dmr_compliance?.submitted_sites?.length ?? 7})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setDmrModalTab('pending');
                    setActiveModal('dmr');
                  }}
                  className="heading-inspect-btn warning"
                  title="View FMS sites with pending DMR reports"
                >
                  <AlertTriangle size={14} />
                  <span>View Pending DMRs ({drilldownData?.dmr_compliance?.pending_sites?.length ?? 21})</span>
                </button>
              </div>
            )}
            {isTickets && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setTicketsModalTab('danger');
                    setActiveModal('tickets');
                  }}
                  className="heading-inspect-btn danger"
                  title="View tickets in SLA danger or breached status"
                >
                  <AlertTriangle size={14} />
                  <span>View Danger Tickets ({drilldownData?.tickets?.danger_tickets?.length ?? 33})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setTicketsModalTab('all');
                    setActiveModal('tickets');
                  }}
                  className="heading-inspect-btn tickets"
                  title="View all operational tickets"
                >
                  <FileText size={14} />
                  <span>View All Tickets ({drilldownData?.tickets?.all_tickets?.length ?? 34})</span>
                </button>
              </div>
            )}
            {isMaintenance && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setPlanModalTab('yesterday');
                    setActiveModal('plan');
                  }}
                  className="heading-inspect-btn success"
                  title="View yesterday's completed operational maintenance tasks"
                >
                  <CheckCircle2 size={14} />
                  <span>View Yesterday Completed ({planData?.metrics?.yesterday_completed_tasks ?? 4})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setPlanModalTab('today');
                    setActiveModal('plan');
                  }}
                  className="heading-inspect-btn dmr"
                  title="View today's planned and active site maintenance tasks"
                >
                  <Clock size={14} />
                  <span>View Today Planned ({planData?.metrics?.today_total_tasks ?? 2})</span>
                </button>
                <span className="heading-audit-window-tag" title="Data scope timeline">
                  <Clock size={12} color="#ff914d" />
                  <span>{planData?.metrics?.current_week_number ? `Week ${planData.metrics.current_week_number} Active (${planData.metrics.total_tasks_this_week || 25} Tasks)` : 'Week 42 Active'}</span>
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
                    setVfmModalTab('submitted');
                    setActiveModal('vfm');
                  }}
                  className="heading-inspect-btn vfm"
                  title="View users who submitted yesterday's work updates"
                >
                  <CheckCircle2 size={14} />
                  <span>View Submitted Updates ({drilldownData?.vfm_portal?.submitted_users?.length ?? 4})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setVfmModalTab('not_submitted');
                    setActiveModal('vfm');
                  }}
                  className="heading-inspect-btn danger"
                  title="View users who did not submit yesterday's work updates"
                >
                  <AlertTriangle size={14} />
                  <span>View Not Submitted ({drilldownData?.vfm_portal?.not_submitted_users?.length ?? 98})</span>
                </button>
              </div>
            )}
            {isImprest && (
              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setImprestModalTab('active');
                    setActiveModal('imprest');
                  }}
                  className="heading-inspect-btn success"
                  title="View active imprest holders for the current month"
                >
                  <CheckCircle2 size={14} />
                  <span>View Active Holders ({accountsData?.imprest_audit?.current_month_activity?.active_holders_count ?? accountsData?.imprest_audit?.current_month_activity?.top_active_holders?.length ?? 35})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setImprestModalTab('all_unsettled');
                    setActiveModal('imprest');
                  }}
                  className="heading-inspect-btn warning"
                  title="View all in-charges with unsettled cash balances"
                >
                  <DollarSign size={14} />
                  <span>View All Unsettled ({accountsData?.imprest_audit?.holders_with_unsettled_balance?.length ?? 100})</span>
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setImprestModalTab('overdue');
                    setActiveModal('imprest');
                  }}
                  className="heading-inspect-btn danger"
                  title="View critical overdue imprest holders with no settlement in over 180 days"
                >
                  <AlertTriangle size={14} />
                  <span>Critical Overdue &gt;180d ({accountsData?.imprest_audit?.summary?.critical_overdue_holders ?? 57})</span>
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

      // 6. Horizontal Divider
      if (trimmed.startsWith('---')) {
        elements.push(<hr key={`divider-${i}`} className="briefing-divider" />);
        i++;
        continue;
      }

      // 7. Bullet items
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

      // 8. Subtitle / Directives heading: e.g. **Managing Director Operational Directives & Enterprise Status**
      if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
        elements.push(
          <div key={`subtitle-${i}`} className="briefing-subtitle">
            {renderInline(trimmed)}
          </div>
        );
        i++;
        continue;
      }

      // 9. Regular Paragraph
      elements.push(
        <p key={`p-${i}`} className="briefing-paragraph">
          {renderInline(trimmed)}
        </p>
      );
      i++;
    }

    return elements;
  };

  // Fetch all audit data for the selected date
  const loadAuditData = async (showToastNotice = false) => {
    try {
      setLoading(true);
      setError(null);

      const [aiRes, accRes, tickRes, dmrRes, planRes, drillRes] = await Promise.allSettled([
        fetch(`/api/ai/latest-summary?date=${selectedDate}`),
        fetch(`/api/accounts/summary?date=${selectedDate}`),
        fetch(`/api/tickets/summary?date=${selectedDate}`),
        fetch(`/api/dmr/summary?date=${selectedDate}`),
        fetch(`/api/plan/summary?date=${selectedDate}`),
        fetch(`/api/audit/drilldown?date=${selectedDate}`),
      ]);

      if (aiRes.status === 'fulfilled' && aiRes.value.ok) {
        setAiReport(await aiRes.value.json());
      }
      if (accRes.status === 'fulfilled' && accRes.value.ok) {
        setAccountsData(await accRes.value.json());
      }
      if (tickRes.status === 'fulfilled' && tickRes.value.ok) {
        setTicketsData(await tickRes.value.json());
      }
      if (dmrRes.status === 'fulfilled' && dmrRes.value.ok) {
        setDmrData(await dmrRes.value.json());
      }
      if (planRes.status === 'fulfilled' && planRes.value.ok) {
        setPlanData(await planRes.value.json());
      }
      if (drillRes.status === 'fulfilled' && drillRes.value.ok) {
        setDrilldownData(await drillRes.value.json());
      }

      if (showToastNotice) {
        showToast('Audit telemetry refreshed from MongoDB.');
      }
    } catch (err) {
      console.warn('Failed to load audit data:', err);
      setError('Operations server unreachable. Ensure Python backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [selectedDate]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Trigger on-demand sync from MongoDB
  const handleResyncTelemetry = async () => {
    playMechanicalClick();
    setIsSyncing(true);
    showToast('Starting MD Agent... Pulling live telemetry from MongoDB');

    try {
      const res = await fetch('/api/checklist/trigger', { method: 'POST' });
      if (res.ok) {
        await loadAuditData(false);
        playSuccessChime();
        showToast('MD Agent Sync Complete! Fresh audit intelligence ready.');
      } else {
        await loadAuditData(true);
      }
    } catch (err) {
      console.warn('Resync trigger failed:', err);
      await loadAuditData(true);
    } finally {
      setIsSyncing(false);
    }
  };



  const formattedTime = format12HourTime(currentTime);
  const formattedDate = (currentTime || new Date()).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Extract Accounts metrics
  const accMetrics = accountsData?.metrics || {};
  const monthCollection = accMetrics.latest_month_collection || 0;
  const imprestBalance = accMetrics.current_month_imprest_net_balance ?? accMetrics.total_unsettled_cash_held ?? 0;
  const imprestHoldersCount = accMetrics.current_month_imprest_active_holders ?? accMetrics.holders_with_unsettled_cash ?? 0;
  const workUpdatesSub = accMetrics.work_updates_submitted_yesterday || 0;
  const workUpdatesTotal = accMetrics.vfm_website_users_total || 0;

  // Extract Tickets metrics
  const tickMetrics = ticketsData?.metrics || {};
  const totalTickets = tickMetrics.total_tickets || 0;
  const internalTickets = tickMetrics.total_internal_tickets || 0;
  const externalTickets = tickMetrics.total_external_tickets || 0;
  const dangerTicketsCount = tickMetrics.total_danger_tickets_overdue_3_days || 0;
  const dangerTicketsList = ticketsData?.danger_tickets_overdue_3_days || [];

  // Extract DMR metrics
  const dmrMetrics = dmrData?.metrics || {};
  const fmsSubmitted = dmrMetrics.submitted_sites_yesterday ?? dmrMetrics.fms_sites_submitted ?? 0;
  const fmsTotal = dmrMetrics.total_fms_sites ?? dmrMetrics.fms_sites_total ?? 0;
  const fmsCompliance = dmrMetrics.compliance_percent ?? dmrMetrics.fms_compliance_percentage ?? 0;

  // Extract Workforce metrics from drilldown
  const wfSummary = drilldownData?.workforce?.summary || {};
  const hoTotal = wfSummary.head_office_total || 0;
  const hoPresent = wfSummary.head_office_present || 0;
  const hoLeave = wfSummary.head_office_leave || 0;
  const incTotal = wfSummary.company_incharges_total || 0;
  const incPresent = wfSummary.company_incharges_present || 0;

  const submittedSitesList = dmrData?.submitted_sites || [];
  const pendingSitesList = dmrData?.pending_sites || [];
  const allDmrSites = [
    ...submittedSitesList.map((s) => ({ ...s, is_submitted: true })),
    ...pendingSitesList.map((s) => ({ ...s, is_submitted: false })),
  ];

  const filteredDmrSites = allDmrSites.filter((site) => {
    if (dmrFilter === 'submitted' && !site.is_submitted) return false;
    if (dmrFilter === 'pending' && site.is_submitted) return false;
    if (dmrSearch.trim()) {
      const q = dmrSearch.toLowerCase();
      return (
        (site.site_name && site.site_name.toLowerCase().includes(q)) ||
        (site.unit_code && site.unit_code.toLowerCase().includes(q)) ||
        (site.location && site.location.toLowerCase().includes(q)) ||
        (site.submitted_by && site.submitted_by.toLowerCase().includes(q)) ||
        (site.branch_code && site.branch_code.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered Imprest Holders
  const imprestHoldersList = accountsData?.imprest_audit?.top_holders || [];
  const filteredImprestHolders = imprestHoldersList.filter((h) => {
    if (!imprestSearch.trim()) return true;
    const q = imprestSearch.toLowerCase();
    return (
      (h.holder_name && h.holder_name.toLowerCase().includes(q)) ||
      (h.site && h.site.toLowerCase().includes(q)) ||
      (h.emp_no && String(h.emp_no).includes(q))
    );
  });

  // Render Loading
  if (loading && !aiReport && !accountsData) {
    return (
      <div className="checklist-loading-viewport">
        <div className="loading-card">
          <Loader2 size={32} color="#ff914d" className="animate-spin" />
          <h2 className="loading-title">Connecting to Executive Intelligence Agent</h2>
          <p className="loading-sub">Loading live audit telemetry from MongoDB...</p>
        </div>
      </div>
    );
  }

  // Render Error
  if (error && !accountsData && !aiReport) {
    return (
      <div className="checklist-loading-viewport">
        <div className="loading-card error-card">
          <h2 className="loading-title">Connection Alert</h2>
          <p className="loading-sub">{error}</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button onClick={onBack} className="btn-retry" style={{ background: '#F1F5F9', color: '#334155' }}>
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button onClick={() => loadAuditData(true)} className="btn-retry">
              <RotateCcw size={14} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-experience-viewport">
      {/* ============================================================== */}
      {/* 1. TOP EXECUTIVE HEADER BAR                                    */}
      {/* ============================================================== */}
      <header className="checklist-top-bar">
        <div className="checklist-bar-left">
          {onBack && (
            <button
              onClick={onBack}
              className="cal-back-btn"
              title="Back to Command Deck"
              style={{ marginRight: '16px' }}
            >
              <ArrowLeft size={16} />
              <span>Command Deck</span>
            </button>
          )}
          <div>
            <h2 className="checklist-main-title">Business Briefing & Executive Audit</h2>
            <div className="checklist-date-sub">{formattedDate} • Intelligence Telemetry</div>
          </div>
        </div>

        <div className="checklist-bar-right">
          {/* Custom Styled Executive Date Picker */}
          <CustomDatePicker
            value={selectedDate}
            onChange={(newDate) => {
              setSelectedDate(newDate);
            }}
          />

          {/* Resync Button */}
          <button
            onClick={handleResyncTelemetry}
            disabled={isSyncing}
            className="action-pill-btn btn-sync"
            title="Click to start MD Agent and pull fresh telemetry from MongoDB"
          >
            <RotateCcw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Agent Syncing...' : 'Resync Telemetry'}</span>
          </button>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="checklist-toast">
          <Check size={15} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}





      {/* ============================================================== */}
      {/* 4. ACTIVE TAB CONTENT                                          */}
      {/* ============================================================== */}
      <main className="audit-main-content">
        {/* TAB 1: AI EXECUTIVE BRIEFING */}
        {activeTab === 'briefing' && (
          <div className="audit-section-panel">
            <div className="audit-panel-header">
              <div className="panel-title-group">
                <span className="panel-badge">INTELLIGENCE SYNTHESIS</span>
                <h3 className="panel-heading">Daily Strategic Overview for Managing Director</h3>
              </div>
            </div>

            {/* Quick Priority Callouts */}
            <div className="briefing-priority-cards">
              <div className="priority-card border-cyan">
                <div className="priority-badge cyan">PRIORITY 01</div>
                <h4 className="priority-title">Workforce Attendance</h4>
                <p className="priority-text">
                  {hoTotal > 0 || incTotal > 0 ? (
                    <>
                      HO Staff ({hoPresent}/{hoTotal} present{hoLeave > 0 ? `, ${hoLeave} on leave` : ''}). In-charges ({incPresent}/{incTotal} checked in). Ensure unit leads reconcile unverified personnel.
                    </>
                  ) : (
                    `Attendance telemetry pending synchronization for ${selectedDate}. Click Resync to refresh.`
                  )}
                </p>
              </div>

              <div className="priority-card border-amber">
                <div className="priority-badge amber">PRIORITY 02</div>
                <h4 className="priority-title">Imprest Recovery</h4>
                <p className="priority-text">
                  {imprestHoldersCount > 0 ? (
                    <>
                      {formatINR(imprestBalance)} net cash held across {imprestHoldersCount} holders. Original vouchers required to unfreeze balances.
                    </>
                  ) : (
                    `No pending unvouched cash balances for ${selectedDate}. All accounts settled.`
                  )}
                </p>
              </div>

              <div className="priority-card border-red">
                <div className="priority-badge red">PRIORITY 03</div>
                <h4 className="priority-title">SLA Breach Containment</h4>
                <p className="priority-text">
                  {dangerTicketsCount > 0 ? (
                    <>
                      {dangerTicketsCount} {dangerTicketsCount === 1 ? 'ticket is' : 'tickets are'} overdue {'>'} 3 days. Immediate escalation to senior operations leads required.
                    </>
                  ) : (
                    `Zero critical tickets overdue > 3 days. All client operations within SLA thresholds.`
                  )}
                </p>
              </div>
            </div>

            {/* Full AI Briefing Document Render */}
            <div className="briefing-document-box">
              <div className="briefing-doc-header">
                <div className="doc-dot dot-red" />
                <div className="doc-dot dot-yellow" />
                <div className="doc-dot dot-green" />
                <span className="doc-title-text">Official Executive Dispatch • {selectedDate}</span>
              </div>

              <div className="briefing-doc-body">
                {aiReport && aiReport.has_report !== false && !aiReport.is_fallback && aiReport.date === selectedDate && aiReport.ai_response_raw ? (
                  <div className="raw-briefing-text">
                    {renderExecutiveBriefing(aiReport.ai_response_raw)}
                  </div>
                ) : (
                  <div className="empty-briefing-state">
                    <AlertCircle size={28} color="#ff914d" />
                    <h4>No AI Executive Briefing Archived for {selectedDate}</h4>
                    <p>The daily executive briefing has not been archived for this date. Each briefing is strictly date-specific.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIALS & IMPREST */}
        {activeTab === 'accounts' && (
          <div className="audit-section-panel">
            <div className="audit-panel-header">
              <div className="panel-title-group">
                <span className="panel-badge">REVENUE & CASH LEDGER</span>
                <h3 className="panel-heading">Accounts, Collections & Imprest Balances</h3>
              </div>
              <div className="imprest-search-box">
                <Search size={14} color="#64748B" />
                <input
                  type="text"
                  placeholder="Search holder name, site or emp ID..."
                  value={imprestSearch}
                  onChange={(e) => setImprestSearch(e.target.value)}
                  className="imprest-search-input"
                />
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="accounts-kpi-row">
              <div className="kpi-mini-card">
                <span className="kpi-label">TOTAL ALL-TIME COLLECTIONS</span>
                <span className="kpi-val">{formatINR(accMetrics.total_collections_all_time)}</span>
              </div>
              <div className="kpi-mini-card">
                <span className="kpi-label">CLIENT RECEIPTS (LATEST MONTH)</span>
                <span className="kpi-val">{formatINR(accMetrics.total_client_receipts)}</span>
              </div>
              <div className="kpi-mini-card">
                <span className="kpi-label">PORTAL WORK UPDATES COMPLIANCE</span>
                <span className="kpi-val">{workUpdatesSub} / {workUpdatesTotal} ({Math.round((workUpdatesSub / (workUpdatesTotal || 1)) * 100)}%)</span>
              </div>
            </div>

            {/* Imprest Table */}
            <div className="audit-table-wrapper">
              <div className="table-header-title-bar">
                <span>IMPREST BALANCES HELD ACROSS IN-CHARGES ({filteredImprestHolders.length} RECORDED)</span>
              </div>
              <table className="audit-modern-table">
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Holder Name</th>
                    <th>Site / Branch</th>
                    <th>Net Cash Balance</th>
                    <th>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImprestHolders.length > 0 ? (
                    filteredImprestHolders.map((holder, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-muted">{holder.emp_no || 'NA'}</td>
                        <td className="font-bold text-dark">{holder.holder_name || 'Holder Name'}</td>
                        <td className="text-secondary">{holder.site || 'Site / Office'}</td>
                        <td className="font-bold text-dark">{formatINR(holder.balance)}</td>
                        <td>
                          {holder.balance > 100000 ? (
                            <span className="status-badge-chip chip-danger">High Balance Alert</span>
                          ) : holder.balance > 25000 ? (
                            <span className="status-badge-chip chip-warning">Vouchers Due</span>
                          ) : (
                            <span className="status-badge-chip chip-normal">Standard</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="table-empty-row">
                        No imprest holder records match your search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TICKET ESCALATIONS */}
        {activeTab === 'tickets' && (
          <div className="audit-section-panel">
            <div className="audit-panel-header">
              <div className="panel-title-group">
                <span className="panel-badge">SLA & SERVICE ESCALATIONS</span>
                <h3 className="panel-heading">Operational & Customer Tickets Audit</h3>
              </div>
              <div className="tickets-filter-toggle">
                <button
                  onClick={() => setTicketsFilter('all')}
                  className={`filter-btn ${ticketsFilter === 'all' ? 'active' : ''}`}
                >
                  All Tickets ({totalTickets})
                </button>
                <button
                  onClick={() => setTicketsFilter('danger')}
                  className={`filter-btn ${ticketsFilter === 'danger' ? 'active' : ''}`}
                >
                  Danger Overdue ({dangerTicketsCount})
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="accounts-kpi-row">
              <div className="kpi-mini-card">
                <span className="kpi-label">TOTAL ACTIVE TICKETS</span>
                <span className="kpi-val">{totalTickets}</span>
              </div>
              <div className="kpi-mini-card">
                <span className="kpi-label">INTERNAL / CLIENT SPLIT</span>
                <span className="kpi-val">{internalTickets} Internal • {externalTickets} External</span>
              </div>
              <div className="kpi-mini-card border-red">
                <span className="kpi-label text-danger">DANGER SLA BREACHES</span>
                <span className="kpi-val text-danger">{dangerTicketsCount} Overdue &gt; 3 Days</span>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="audit-table-wrapper">
              <div className="table-header-title-bar">
                <span>CRITICAL ESCALATION LIST ({dangerTicketsList.length} DANGER TICKETS)</span>
              </div>
              <table className="audit-modern-table">
                <thead>
                  <tr>
                    <th>Ticket Code</th>
                    <th>Issue Description</th>
                    <th>Site / Department</th>
                    <th>Overdue Days</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {dangerTicketsList.length > 0 ? (
                    dangerTicketsList.map((ticket, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-cyan">{ticket.ticket_no || `TK-${idx + 1}`}</td>
                        <td className="font-medium text-dark">{ticket.title || ticket.issue || 'Operational issue pending'}</td>
                        <td className="text-secondary">{ticket.site || ticket.department || 'Operations'}</td>
                        <td className="font-bold text-danger">{ticket.days_overdue || '> 3'} Days</td>
                        <td>
                          <span className="status-badge-chip chip-danger">Overdue Critical</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="table-empty-row text-success">
                        <CheckCircle2 size={15} color="#16A34A" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
                        No overdue danger tickets recorded for today!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SITE DMR REPORTS */}
        {activeTab === 'dmr' && (
          <div className="audit-section-panel">
            <div className="audit-panel-header">
              <div className="panel-title-group">
                <span className="panel-badge">FIELD COMPLIANCE AUDIT</span>
                <h3 className="panel-heading">Daily Management Reports (FMS Sites)</h3>
              </div>
              <span className="panel-meta-tag">Compliance: {fmsCompliance}% ({fmsSubmitted}/{fmsTotal} Sites)</span>
            </div>

            {/* Progress bar */}
            <div className="dmr-progress-deck">
              <div className="dmr-progress-label-row">
                <span>FMS Submissions Status</span>
                <span>{fmsSubmitted} of {fmsTotal} Sites Submitted Yesterday</span>
              </div>
              <div className="toc-bar-track">
                <div className="toc-bar-fill" style={{ width: `${fmsCompliance}%` }} />
              </div>
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="dmr-filter-bar">
              <div className="dmr-filter-chips">
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setDmrFilter('all');
                  }}
                  className={`dmr-filter-chip ${dmrFilter === 'all' ? 'active' : ''}`}
                >
                  All Sites ({allDmrSites.length || fmsTotal})
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setDmrFilter('submitted');
                  }}
                  className={`dmr-filter-chip ${dmrFilter === 'submitted' ? 'active' : ''}`}
                >
                  <CheckCircle2 size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                  Submitted ({submittedSitesList.length || fmsSubmitted})
                </button>
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setDmrFilter('pending');
                  }}
                  className={`dmr-filter-chip ${dmrFilter === 'pending' ? 'active' : ''}`}
                >
                  <Clock size={13} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                  Pending Defaulters ({pendingSitesList.length || (fmsTotal - fmsSubmitted)})
                </button>
              </div>

              <div className="imprest-search-box">
                <Search size={14} color="#64748B" />
                <input
                  type="text"
                  placeholder="Search site, unit code or manager..."
                  value={dmrSearch}
                  onChange={(e) => setDmrSearch(e.target.value)}
                  className="imprest-search-input"
                />
              </div>
            </div>

            {/* Sites Table */}
            <div className="audit-table-wrapper">
              <div className="table-header-title-bar">
                <span>
                  FMS SITES COMPLIANCE BREAKDOWN ({filteredDmrSites.length} SITES DISPLAYED)
                </span>
              </div>
              <table className="audit-modern-table">
                <thead>
                  <tr>
                    <th>Unit Code</th>
                    <th>Site Name & Location</th>
                    <th>Branch Code</th>
                    <th>Submitted By</th>
                    <th>Submission Time</th>
                    <th>Compliance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDmrSites.length > 0 ? (
                    filteredDmrSites.map((site, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-cyan">{site.unit_code || `UC-${idx + 1}`}</td>
                        <td>
                          <div className="font-bold text-dark">{site.site_name}</div>
                          {site.location && (
                            <div className="dmr-site-meta">{site.location.split('\n')[0]}</div>
                          )}
                        </td>
                        <td className="text-secondary">{site.branch_code || 'BC001'}</td>
                        <td>
                          {site.submitted_by ? (
                            <div>
                              <span className="font-semibold text-dark">{site.submitted_by}</span>
                              {site.designation && <div className="dmr-site-meta">{site.designation}</div>}
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          {site.submitted_at ? (
                            <span className="font-medium text-dark">{format12HourTime(site.submitted_at)}</span>
                          ) : (
                            <span className="text-danger font-semibold">Not Submitted</span>
                          )}
                        </td>
                        <td>
                          {site.is_submitted ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="status-badge-chip chip-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Submitted
                              </span>
                              {site.attachment_url && (
                                <a
                                  href={site.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="attachment-link-btn"
                                  title="Download / View Daily Report"
                                >
                                  <span>View Report</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="status-badge-chip chip-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Pending DMR
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="table-empty-row">
                        No sites matching current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: 52-WEEK PLAN */}
        {activeTab === 'plan' && (
          <div className="audit-section-panel">
            <div className="audit-panel-header">
              <div className="panel-title-group">
                <span className="panel-badge">STRATEGIC ROADMAP</span>
                <h3 className="panel-heading">52-Weeks Annual Business Plan Goals</h3>
              </div>
              <span className="panel-meta-tag">Active: Week 42</span>
            </div>

            <div className="briefing-priority-cards">
              <div className="priority-card border-cyan">
                <div className="priority-badge cyan">ACTIVE WEEK</div>
                <h4 className="priority-title">Week 42 Strategic Deliverables</h4>
                <p className="priority-text">
                  Annual operational goals and milestones active for October 2026.
                </p>
              </div>

              <div className="priority-card border-emerald">
                <div className="priority-badge emerald">HOUSEKEEPING AUDIT</div>
                <h4 className="priority-title">HK Planned Tasks</h4>
                <p className="priority-text">
                  0 tasks planned for current schedule. Status: Pending field synchronization.
                </p>
              </div>

              <div className="priority-card border-amber">
                <div className="priority-badge amber">MEP ENGINEERING</div>
                <h4 className="priority-title">MEP Planned Tasks</h4>
                <p className="priority-text">
                  0 tasks planned for current schedule. Status: Pending field synchronization.
                </p>
              </div>
            </div>
          </div>
        )}


      </main>

      {/* ============================================================== */}
      {/* 5. AUDIT DRILLDOWN POPUP MODALS                                */}
      {/* ============================================================== */}
      {activeModal && (
        <div className="audit-modal-backdrop" onClick={handleCloseModal}>
          <div className="audit-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* MODAL 1: WORKFORCE ATTENDANCE AUDIT */}
            {activeModal === 'workforce' && (
              <>
                <div className="audit-modal-header">
                  <div className="modal-title-group">
                    <span className="modal-badge-tag red">ROLL-CALL AUDIT</span>
                    <h3 className="modal-title">Enterprise Workforce Attendance Audit</h3>
                    <p className="modal-subtitle">
                      Itemized roll-call of personnel present, absent, or on approved leave
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal} title="Close Modal">
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-subnav-strip">
                  <button
                    onClick={() => setWorkforceModalTab('checked')}
                    className={`modal-subnav-tab ${workforceModalTab === 'checked' ? 'active success' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={13} color={workforceModalTab === 'checked' ? '#FFFFFF' : '#059669'} />
                    <span>Checked-In ({drilldownData?.workforce?.checked_in?.length ?? 39})</span>
                  </button>
                  <button
                    onClick={() => setWorkforceModalTab('unchecked')}
                    className={`modal-subnav-tab ${workforceModalTab === 'unchecked' ? 'active danger' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={13} color={workforceModalTab === 'unchecked' ? '#FFFFFF' : '#DC2626'} />
                    <span>Not Checked-In ({drilldownData?.workforce?.not_checked_in?.length ?? 4})</span>
                  </button>
                  <button
                    onClick={() => setWorkforceModalTab('leave')}
                    className={`modal-subnav-tab ${workforceModalTab === 'leave' ? 'active' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CalendarOff size={13} color={workforceModalTab === 'leave' ? '#FFFFFF' : '#D97706'} />
                    <span>On Approved Leave ({drilldownData?.workforce?.on_leave?.length ?? 3})</span>
                  </button>
                </div>

                <div className="audit-modal-body">
                  {workforceModalTab === 'checked' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Emp ID</th>
                          <th>Employee Name</th>
                          <th>Role / Designation</th>
                          <th>Unit / Company</th>
                          <th>Status</th>
                          <th>Check-In Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownData?.workforce?.checked_in || []).map((emp, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{emp.employee_id}</td>
                            <td className="font-bold text-dark">{emp.employee_name}</td>
                            <td className="text-secondary">{emp.role}</td>
                            <td>
                              <span className="unit-pill">{emp.unit}</span>
                            </td>
                            <td>
                              <span className="status-badge-chip chip-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Present
                              </span>
                            </td>
                            <td className="font-semibold text-dark font-mono" style={{ fontSize: '11.5px' }}>
                              {emp.check_in_time ? format12HourTime(emp.check_in_time) : '08:55:00 AM'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {workforceModalTab === 'unchecked' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Emp ID</th>
                          <th>Employee Name</th>
                          <th>Role / Designation</th>
                          <th>Unit / Company</th>
                          <th>Status</th>
                          <th>Last Known Check-In</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownData?.workforce?.not_checked_in || []).map((emp, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{emp.employee_id}</td>
                            <td className="font-bold text-dark">{emp.employee_name}</td>
                            <td className="text-secondary">{emp.role}</td>
                            <td>
                              <span className="unit-pill">{emp.unit}</span>
                            </td>
                            <td>
                              <span className="status-badge-chip chip-danger">Not Checked In</span>
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              {(() => {
                                if (!emp.last_known_checkin) {
                                  return <span className="text-muted">No recent login</span>;
                                }
                                const dt = formatDateTimeDisplay(emp.last_known_checkin);
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span className="font-semibold text-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                      <span>{dt.dateStr}</span>
                                      {dt.dayName && (
                                        <span style={{ fontSize: '10.5px', color: '#ff914d', fontWeight: 700 }}>
                                          ({dt.dayName})
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-secondary font-mono" style={{ fontSize: '11px' }}>
                                      {dt.timeStr}
                                    </span>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {workforceModalTab === 'leave' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Emp ID</th>
                          <th>Employee Name</th>
                          <th>Role / Unit</th>
                          <th>Leave Type</th>
                          <th>Reason</th>
                          <th>Approval</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownData?.workforce?.on_leave || []).map((emp, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{emp.employee_id}</td>
                            <td className="font-bold text-dark">{emp.employee_name}</td>
                            <td className="text-secondary">{emp.role} ({emp.unit})</td>
                            <td>
                              <span className="status-badge-chip chip-warning">{emp.leave_type}</span>
                            </td>
                            <td className="text-secondary" style={{ maxWidth: '280px' }}>{emp.reason}</td>
                            <td>
                              <span className="status-badge-chip chip-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> {emp.approval_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* MODAL 2: VFM PORTAL SUBMITTED & NOT SUBMITTED WORK UPDATES */}
            {activeModal === 'vfm' && (
              <>
                <div className="audit-modal-header">
                  <div className="modal-title-group">
                    <span className="modal-badge-tag cyan">PORTAL LOG</span>
                    <h3 className="modal-title">VFM Yesterday Work Updates Audit</h3>
                    <p className="modal-subtitle">
                      Tracking daily work update submissions across {drilldownData?.vfm_portal?.metrics?.total_users ?? 102} registered portal staff
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal} title="Close Modal">
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-subnav-strip">
                  <button
                    onClick={() => setVfmModalTab('submitted')}
                    className={`modal-subnav-tab ${vfmModalTab === 'submitted' ? 'active' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={13} color={vfmModalTab === 'submitted' ? '#FFFFFF' : '#ff914d'} />
                    <span>Submitted Updates ({drilldownData?.vfm_portal?.submitted_users?.length ?? 4})</span>
                  </button>
                  <button
                    onClick={() => setVfmModalTab('not_submitted')}
                    className={`modal-subnav-tab ${vfmModalTab === 'not_submitted' ? 'active danger' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={13} color={vfmModalTab === 'not_submitted' ? '#FFFFFF' : '#DC2626'} />
                    <span>Not Submitted / Pending ({drilldownData?.vfm_portal?.not_submitted_users?.length ?? 98})</span>
                  </button>
                </div>

                <div className="audit-modal-body">
                  {vfmModalTab === 'submitted' ? (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Staff Name</th>
                          <th>Designation</th>
                          <th>Site / Facility</th>
                          <th>Work Type / Title</th>
                          <th>Submitted Time</th>
                          <th>Summary Snippet</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownData?.vfm_portal?.submitted_users || []).map((user, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{user.employee_id}</td>
                            <td className="font-bold text-dark">{user.name}</td>
                            <td className="text-secondary">{user.designation}</td>
                            <td className="font-medium text-dark">{user.site_name}</td>
                            <td>
                              <span className="unit-pill">{user.work_type || user.title}</span>
                            </td>
                            <td className="font-semibold text-dark">
                              {user.submitted_at ? format12HourTime(user.submitted_at) : '—'}
                            </td>
                            <td className="text-secondary" style={{ maxWidth: '240px', fontSize: '12px' }}>
                              {user.summary_snippet || user.title}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Staff Name</th>
                          <th>Designation</th>
                          <th>Role / Department</th>
                          <th>Status</th>
                          <th>Compliance Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownData?.vfm_portal?.not_submitted_users || []).map((user, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{user.employee_id}</td>
                            <td className="font-bold text-dark">{user.name}</td>
                            <td className="text-secondary">{user.designation}</td>
                            <td>
                              <span className="unit-pill">{user.role}</span>
                            </td>
                            <td>
                              <span className="status-badge-chip chip-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> Not Submitted
                              </span>
                            </td>
                            <td className="text-secondary" style={{ fontSize: '12px', maxWidth: '320px' }}>
                              {user.description || 'No operational work update submitted for previous day.'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* MODAL 3: DMR COMPLIANCE SUBMITTED & PENDING SITES */}
            {activeModal === 'dmr' && (
              <>
                <div className="audit-modal-header">
                  <div className="modal-title-group">
                    <span className="modal-badge-tag emerald">FMS AUDIT</span>
                    <h3 className="modal-title">FMS Sites DMR Compliance Audit</h3>
                    <p className="modal-subtitle">
                      Site operations report status across 28 active FMS customer sites
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal} title="Close Modal">
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-subnav-strip">
                  <button
                    onClick={() => setDmrModalTab('submitted')}
                    className={`modal-subnav-tab ${dmrModalTab === 'submitted' ? 'active success' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={13} color={dmrModalTab === 'submitted' ? '#FFFFFF' : '#059669'} />
                    <span>Submitted DMRs ({drilldownData?.dmr_compliance?.submitted_sites?.length ?? 7})</span>
                  </button>
                  <button
                    onClick={() => setDmrModalTab('pending')}
                    className={`modal-subnav-tab ${dmrModalTab === 'pending' ? 'active warning' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={13} color={dmrModalTab === 'pending' ? '#FFFFFF' : '#D97706'} />
                    <span>Pending DMR Sites ({drilldownData?.dmr_compliance?.pending_sites?.length ?? 21})</span>
                  </button>
                </div>

                <div className="audit-modal-body">
                  {dmrModalTab === 'submitted' ? (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Unit Code</th>
                          <th>Site Name & Location</th>
                          <th>Branch</th>
                          <th>Submitted By</th>
                          <th>Time Submitted</th>
                          <th>Attachment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownData?.dmr_compliance?.submitted_sites || []).map((site, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{site.unit_code}</td>
                            <td>
                              <div className="font-bold text-dark">{site.site_name}</div>
                              {site.location && (
                                <div className="dmr-site-meta">{site.location.split('\n')[0]}</div>
                              )}
                            </td>
                            <td className="text-secondary">{site.branch_code || 'BC001'}</td>
                            <td>
                              <div className="font-semibold text-dark">{site.submitted_by}</div>
                              {site.designation && <div className="dmr-site-meta">{site.designation}</div>}
                            </td>
                            <td className="font-medium text-dark">
                              {site.submitted_at ? format12HourTime(site.submitted_at) : '—'}
                            </td>
                            <td>
                              {site.attachment_url ? (
                                <a
                                  href={site.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="attachment-link-btn"
                                  title="View / Download Report"
                                >
                                  <span>View Report</span>
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span className="text-muted">No attachment</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Unit Code</th>
                          <th>Site Name</th>
                          <th>Location / Region</th>
                          <th>Status</th>
                          <th>Action Requirement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(drilldownData?.dmr_compliance?.pending_sites || []).map((site, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{site.unit_code}</td>
                            <td className="font-bold text-dark">{site.site_name}</td>
                            <td className="text-secondary">{site.location || 'Tamil Nadu'}</td>
                            <td>
                              <span className="status-badge-chip chip-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> Pending Submission
                              </span>
                            </td>
                            <td className="text-secondary" style={{ fontSize: '12px' }}>
                              Follow up with Site Facility Manager
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* MODAL 4: OPERATIONAL TICKETS & SLA DANGER (TASK 6) */}
            {activeModal === 'tickets' && (
              <>
                <div className="audit-modal-header">
                  <div className="modal-title-group">
                    <span className="modal-badge-tag amber">TASK 6 AUDIT</span>
                    <h3 className="modal-title">Operational Friction & SLA Danger Breaches</h3>
                    <p className="modal-subtitle">
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        {drilldownData?.tickets?.audit_window?.label || 'Last Day to Today before Agent Run'}
                      </span>
                      {' — '}
                      {drilldownData?.tickets?.metrics?.total_tickets ?? 34} total tickets ({drilldownData?.tickets?.metrics?.danger_tickets_count ?? 33} overdue &gt;3 days in danger zone)
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal} title="Close Modal">
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-subnav-strip">
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setTicketsModalTab('danger');
                    }}
                    className={`modal-subnav-tab ${ticketsModalTab === 'danger' ? 'active danger' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={13} color={ticketsModalTab === 'danger' ? '#FFFFFF' : '#DC2626'} />
                    <span>Danger Overdue ({drilldownData?.tickets?.danger_tickets?.length ?? 33})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setTicketsModalTab('internal');
                    }}
                    className={`modal-subnav-tab ${ticketsModalTab === 'internal' ? 'active cyan' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Building2 size={13} color={ticketsModalTab === 'internal' ? '#FFFFFF' : '#0284C7'} />
                    <span>Internal Tickets ({drilldownData?.tickets?.internal_tickets?.length ?? 13})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setTicketsModalTab('external');
                    }}
                    className={`modal-subnav-tab ${ticketsModalTab === 'external' ? 'active purple' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Users size={13} color={ticketsModalTab === 'external' ? '#FFFFFF' : '#7C3AED'} />
                    <span>External Client ({drilldownData?.tickets?.external_tickets?.length ?? 21})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setTicketsModalTab('all');
                    }}
                    className={`modal-subnav-tab ${ticketsModalTab === 'all' ? 'active neutral' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileText size={13} color={ticketsModalTab === 'all' ? '#FFFFFF' : '#334155'} />
                    <span>All Tickets ({drilldownData?.tickets?.all_tickets?.length ?? 34})</span>
                  </button>
                </div>

                <div className="audit-modal-body">
                  {(() => {
                    let list = [];
                    if (ticketsModalTab === 'danger') list = drilldownData?.tickets?.danger_tickets || [];
                    else if (ticketsModalTab === 'internal') list = drilldownData?.tickets?.internal_tickets || [];
                    else if (ticketsModalTab === 'external') list = drilldownData?.tickets?.external_tickets || [];
                    else list = drilldownData?.tickets?.all_tickets || [];

                    if (!list || list.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
                          <FileText size={36} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
                          <p style={{ fontWeight: 600 }}>No tickets found in this view.</p>
                        </div>
                      );
                    }

                    return (
                      <table className="audit-modern-table modal-table">
                        <thead>
                          <tr>
                            <th>Ticket #</th>
                            <th>Scope / Unit</th>
                            <th>Status & Priority</th>
                            <th>Age / SLA Breach</th>
                            <th>Assigned To</th>
                            <th>Created Date (Day)</th>
                            <th>Issue Summary</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((ticket, idx) => (
                            <tr key={idx}>
                              <td className="font-semibold text-cyan">
                                #{ticket.ticket_no}
                              </td>
                              <td>
                                <span className="unit-pill" style={{
                                  background: ticket.ticket_type === 'EXTERNAL' ? '#F3E8FF' : '#E0F2FE',
                                  color: ticket.ticket_type === 'EXTERNAL' ? '#6B21A8' : '#0369A1',
                                  fontWeight: 700
                                }}>
                                  {ticket.ticket_type}
                                </span>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                                  {ticket.client_name || ticket.department || 'Operations'}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span className={`status-badge-chip ${ticket.status === 'SOLVED' || ticket.status === 'CLOSED' ? 'chip-success' : 'chip-warning'}`}>
                                    {ticket.status}
                                  </span>
                                  {ticket.priority && (
                                    <span style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>
                                      Pri: {ticket.priority}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                {ticket.is_danger ? (
                                  <span className="status-badge-chip chip-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                    <AlertTriangle size={11} />
                                    {ticket.age_days}d (Danger &gt;3d)
                                  </span>
                                ) : (
                                  <span className="status-badge-chip chip-neutral">
                                    {ticket.age_days}d
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="font-bold text-dark">{ticket.assigned_name || 'Unassigned'}</div>
                                {ticket.assigned_role && (
                                  <div style={{ fontSize: '11px', color: '#64748B' }}>{ticket.assigned_role}</div>
                                )}
                              </td>
                              <td>
                                <div className="font-semibold text-dark">
                                  {ticket.created_date ? ticket.created_date.split('T')[0] : '—'}
                                </div>
                                {ticket.created_day && (
                                  <div style={{ fontSize: '11.5px', color: '#ff914d', fontWeight: 700 }}>
                                    {ticket.created_day}
                                  </div>
                                )}
                              </td>
                              <td className="text-secondary" style={{ maxWidth: '280px', fontSize: '12px', lineHeight: 1.4 }}>
                                {ticket.description || 'No description provided'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </>
            )}

            {/* MODAL 5: 52 WEEKS PLAN & PPM (TASK 8) */}
            {activeModal === 'plan' && (
              <>
                <div className="audit-modal-header">
                  <div className="modal-title-group">
                    <span className="modal-badge-tag success">TASK 8 AUDIT</span>
                    <h3 className="modal-title">Planned Maintenance & Asset Reliability Audit</h3>
                    <p className="modal-subtitle">
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        Week {planData?.metrics?.current_week_number ?? 42} ({planData?.metrics?.total_tasks_this_week ?? 25} tasks)
                      </span>
                      {' — '}
                      Yesterday ({planData?.metrics?.yesterday_weekday ?? 'Thursday'}): {planData?.metrics?.yesterday_completed_tasks ?? 4} completed tasks • Today ({planData?.metrics?.today_weekday ?? 'Friday'}): {planData?.metrics?.today_total_tasks ?? 2} planned tasks across {planData?.metrics?.total_critical_assets_tracked ?? 61} tracked facility assets
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal} title="Close Modal">
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-subnav-strip">
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setPlanModalTab('yesterday');
                    }}
                    className={`modal-subnav-tab ${planModalTab === 'yesterday' ? 'active success' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={13} color={planModalTab === 'yesterday' ? '#FFFFFF' : '#16A34A'} />
                    <span>Yesterday Completed ({planData?.yesterday_completed_plan?.tasks?.length ?? planData?.metrics?.yesterday_completed_tasks ?? 4})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setPlanModalTab('today');
                    }}
                    className={`modal-subnav-tab ${planModalTab === 'today' ? 'active cyan' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Clock size={13} color={planModalTab === 'today' ? '#FFFFFF' : '#0284C7'} />
                    <span>Today Planned ({planData?.current_day_plan?.tasks?.length ?? planData?.metrics?.today_total_tasks ?? 2})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setPlanModalTab('week');
                    }}
                    className={`modal-subnav-tab ${planModalTab === 'week' ? 'active purple' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Calendar size={13} color={planModalTab === 'week' ? '#FFFFFF' : '#7C3AED'} />
                    <span>Week {planData?.metrics?.current_week_number ?? 42} Breakdown ({planData?.metrics?.total_tasks_this_week ?? 25})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setPlanModalTab('assets');
                    }}
                    className={`modal-subnav-tab ${planModalTab === 'assets' ? 'active neutral' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Building2 size={13} color={planModalTab === 'assets' ? '#FFFFFF' : '#334155'} />
                    <span>Assets Tracked ({planData?.metrics?.total_critical_assets_tracked ?? 61})</span>
                  </button>
                </div>

                <div className="audit-modal-body">
                  {planModalTab === 'yesterday' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Task ID</th>
                          <th>Category</th>
                          <th>Assignee</th>
                          <th>Site / Facility</th>
                          <th>Title & Operations Scope</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(planData?.yesterday_completed_plan?.tasks || []).map((t, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">
                              {(t.task_id || '').slice(-8).toUpperCase() || `TSK-${idx + 1}`}
                            </td>
                            <td>
                              <span className="unit-pill">{t.category || t.work_type || 'Operations'}</span>
                            </td>
                            <td>
                              <div className="font-bold text-dark">{t.assignee || 'Unassigned'}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{t.work_type}</div>
                            </td>
                            <td>
                              <div className="font-semibold text-dark" style={{ maxWidth: '200px' }}>{t.site_name || 'Head Office'}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{t.unit_code}</div>
                            </td>
                            <td style={{ maxWidth: '320px' }}>
                              <div className="font-bold text-dark" style={{ fontSize: '13px' }}>{t.title}</div>
                              <div className="text-secondary" style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '2px' }}>
                                {t.summary || t.title}
                              </div>
                            </td>
                            <td>
                              <span className="status-badge-chip chip-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Completed Yesterday
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {planModalTab === 'today' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Task ID</th>
                          <th>Category</th>
                          <th>Assignee</th>
                          <th>Site / Facility</th>
                          <th>Title & Execution Plan</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(planData?.current_day_plan?.tasks || []).map((t, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">
                              {(t.task_id || '').slice(-8).toUpperCase() || `TSK-${idx + 1}`}
                            </td>
                            <td>
                              <span className="unit-pill">{t.category || t.work_type || 'Operations'}</span>
                            </td>
                            <td>
                              <div className="font-bold text-dark">{t.assignee || 'Unassigned'}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{t.work_type}</div>
                            </td>
                            <td>
                              <div className="font-semibold text-dark" style={{ maxWidth: '200px' }}>{t.site_name || 'Head Office'}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{t.unit_code}</div>
                            </td>
                            <td style={{ maxWidth: '320px' }}>
                              <div className="font-bold text-dark" style={{ fontSize: '13px' }}>{t.title}</div>
                              <div className="text-secondary" style={{ fontSize: '12px', lineHeight: 1.4, marginTop: '2px' }}>
                                {t.summary || t.title}
                              </div>
                            </td>
                            <td>
                              <span className="status-badge-chip chip-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> In Progress Today
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {planModalTab === 'week' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Date</th>
                          <th>Focus / Context</th>
                          <th>Total Tasks Logged</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(planData?.current_week_plan?.daily_breakdown || []).map((d, idx) => (
                          <tr key={idx} style={{ background: d.is_today ? '#F0FDF4' : d.is_yesterday ? '#F8FAFC' : 'transparent' }}>
                            <td className="font-bold text-dark">
                              {d.weekday}
                              {d.is_today && <span className="briefing-inline-chip chip-success" style={{ marginLeft: '6px' }}>Today</span>}
                              {d.is_yesterday && <span className="briefing-inline-chip chip-normal" style={{ marginLeft: '6px' }}>Yesterday</span>}
                            </td>
                            <td className="font-semibold text-cyan">{d.date}</td>
                            <td className="text-secondary">
                              {d.is_today ? "Today's Active Operational Plan" : d.is_yesterday ? "Yesterday's Completed Maintenance Updates" : `Week ${planData?.metrics?.current_week_number ?? 42} Scheduled Work`}
                            </td>
                            <td className="font-bold text-dark" style={{ fontSize: '14px' }}>
                              {d.total_tasks} Tasks
                            </td>
                            <td>
                              {d.is_today ? (
                                <span className="status-badge-chip chip-warning">Active In Progress</span>
                              ) : d.is_yesterday ? (
                                <span className="status-badge-chip chip-success">Completed & Audited</span>
                              ) : (
                                <span className="status-badge-chip chip-normal">Scheduled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {planModalTab === 'assets' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Asset Name</th>
                          <th>Unit Code / Site</th>
                          <th>Location</th>
                          <th>Reliability Tracking</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(planData?.assets_summary?.sample_assets || []).map((a, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">{idx + 1}</td>
                            <td className="font-bold text-dark">{a.asset_name}</td>
                            <td className="font-medium text-dark">{a.unit_code}</td>
                            <td className="text-secondary">{a.location}</td>
                            <td>
                              <span className="status-badge-chip chip-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={12} /> Active Tracked
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* MODAL 6: IMPREST CASH & HOLDERS AUDIT */}
            {activeModal === 'imprest' && (
              <>
                <div className="audit-modal-header">
                  <div className="modal-title-group">
                    <span className="modal-badge-tag amber">CASH LEDGER</span>
                    <h3 className="modal-title">Imprest Cash & Field Advances Audit</h3>
                    <p className="modal-subtitle">
                      Tracking {accountsData?.imprest_audit?.current_month_activity?.month || 'Current Month'} active advances and aging cash held across operational in-charges
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={handleCloseModal} title="Close Modal">
                    <X size={18} />
                  </button>
                </div>

                <div className="modal-subnav-strip">
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setImprestModalTab('active');
                    }}
                    className={`modal-subnav-tab ${imprestModalTab === 'active' ? 'active success' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={13} color={imprestModalTab === 'active' ? '#FFFFFF' : '#059669'} />
                    <span>Current Month Active ({accountsData?.imprest_audit?.current_month_activity?.active_holders_count ?? accountsData?.imprest_audit?.current_month_activity?.top_active_holders?.length ?? 35})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setImprestModalTab('all_unsettled');
                    }}
                    className={`modal-subnav-tab ${imprestModalTab === 'all_unsettled' ? 'active warning' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <DollarSign size={13} color={imprestModalTab === 'all_unsettled' ? '#FFFFFF' : '#D97706'} />
                    <span>All Unsettled Cash ({accountsData?.imprest_audit?.holders_with_unsettled_balance?.length ?? 100})</span>
                  </button>
                  <button
                    onClick={() => {
                      playMechanicalClick();
                      setImprestModalTab('overdue');
                    }}
                    className={`modal-subnav-tab ${imprestModalTab === 'overdue' ? 'active danger' : ''}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={13} color={imprestModalTab === 'overdue' ? '#FFFFFF' : '#DC2626'} />
                    <span>Critical Overdue &gt;180d ({accountsData?.imprest_audit?.summary?.critical_overdue_holders ?? 57})</span>
                  </button>
                </div>

                <div className="audit-modal-body">
                  {imprestModalTab === 'active' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Holder ID</th>
                          <th>Imprest Holder Name</th>
                          <th>Given (Credit)</th>
                          <th>Settled (Bills)</th>
                          <th>Net Cash Held</th>
                          <th>Transactions</th>
                          <th>MD Operational Directive</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(accountsData?.imprest_audit?.current_month_activity?.top_active_holders || []).map((h, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">#{h.holder_id}</td>
                            <td className="font-bold text-dark">{h.holder_name}</td>
                            <td className="font-medium text-dark">{formatINR(h.credit_received)}</td>
                            <td className="font-medium text-secondary">{formatINR(h.debit_settled)}</td>
                            <td className="font-bold text-dark" style={{ color: h.net_balance > 200000 ? '#DC2626' : '#D97706' }}>
                              {formatINR(h.net_balance)}
                            </td>
                            <td>
                              <span className="unit-pill">{h.transaction_count} Txns</span>
                            </td>
                            <td>
                              {h.net_balance > 200000 ? (
                                <span className="status-badge-chip chip-danger">Demand Bills Immediately</span>
                              ) : h.net_balance > 0 ? (
                                <span className="status-badge-chip chip-warning">Vouchers Due</span>
                              ) : (
                                <span className="status-badge-chip chip-success">Fully Settled</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {imprestModalTab === 'all_unsettled' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Holder ID</th>
                          <th>Imprest Holder Name</th>
                          <th>Total Given</th>
                          <th>Total Settled</th>
                          <th>Unsettled Balance</th>
                          <th>Last Activity</th>
                          <th>Aging Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(accountsData?.imprest_audit?.holders_with_unsettled_balance || []).map((h, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">#{h.holder_id}</td>
                            <td className="font-bold text-dark">{h.holder_name}</td>
                            <td className="font-medium text-dark">{formatINR(h.total_credit_received)}</td>
                            <td className="font-medium text-secondary">{formatINR(h.total_debit_settled)}</td>
                            <td className="font-bold text-dark" style={{ color: h.unsettled_balance > 500000 ? '#DC2626' : '#D97706' }}>
                              {formatINR(h.unsettled_balance)}
                            </td>
                            <td className="text-secondary" style={{ fontSize: '12px' }}>
                              {h.days_since_last_activity != null ? `${h.days_since_last_activity} days ago` : 'N/A'}
                            </td>
                            <td>
                              <span className={`status-badge-chip ${
                                h.duration_status === 'CRITICAL_OVERDUE_OVER_180_DAYS' ? 'chip-danger' :
                                h.duration_status === 'STALE_91_180_DAYS' ? 'chip-warning' : 'chip-normal'
                              }`}>
                                {(h.duration_status || 'Active').replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {imprestModalTab === 'overdue' && (
                    <table className="audit-modern-table modal-table">
                      <thead>
                        <tr>
                          <th>Holder ID</th>
                          <th>Imprest Holder Name</th>
                          <th>Critical Unsettled Balance</th>
                          <th>Days Inactive</th>
                          <th>First Advance Date</th>
                          <th>Last Advance Date</th>
                          <th>Recovery Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {((accountsData?.imprest_audit?.holders_with_unsettled_balance || []).filter(
                          (h) => h.duration_status === 'CRITICAL_OVERDUE_OVER_180_DAYS' || (h.days_since_last_activity && h.days_since_last_activity > 180)
                        )).map((h, idx) => (
                          <tr key={idx}>
                            <td className="font-semibold text-cyan">#{h.holder_id}</td>
                            <td className="font-bold text-dark">{h.holder_name}</td>
                            <td className="font-bold text-dark" style={{ color: '#DC2626' }}>
                              {formatINR(h.unsettled_balance)}
                            </td>
                            <td>
                              <span className="status-badge-chip chip-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> {h.days_since_last_activity} days dormant
                              </span>
                            </td>
                            <td className="text-secondary font-mono" style={{ fontSize: '11.5px' }}>
                              {h.first_disbursed_date ? h.first_disbursed_date.split('T')[0] : 'N/A'}
                            </td>
                            <td className="text-secondary font-mono" style={{ fontSize: '11.5px' }}>
                              {h.last_activity_date ? h.last_activity_date.split('T')[0] : 'N/A'}
                            </td>
                            <td>
                              <span className="status-badge-chip chip-danger">Issue Formal Notice</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
