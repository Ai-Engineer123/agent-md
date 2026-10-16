import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Lock,
  Volume2,
  VolumeX,
  Sparkles,
  ClipboardCheck,
  FileSpreadsheet,
  Calendar,
  Users,
  ArrowRight,
  Send,
  Mic,
  CheckCircle2,
  Building2,
  StickyNote,
  LogOut
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

const EXECUTIVE_MODULES = [
  {
    id: 'checklist',
    categoryChip: 'Morning Routine',
    badgeText: 'Synchronizing...',
    title: 'Daily 10:30 AM Checklist',
    subtitle: 'Morning verification & attendance audit',
    icon: ClipboardCheck,
    accent: '#00bf63',
    glowColor: 'rgba(0, 191, 99, 0.14)',
    statValue: 'Checking...',
    statLabel: 'Morning Status',
    bullets: [
      'Synchronizing 10:30 AM routine items from MongoDB...',
      'Verifying Head Office & In-charge roll call...',
      'Auditing morning cash collection telemetry...',
    ],
    actionText: 'Open 10:30 AM Checklist',
    link: '/checklist',
  },
  {
    id: 'briefing',
    categoryChip: 'Daily Summary',
    badgeText: 'Synchronizing...',
    title: 'Daily Business Briefing',
    subtitle: 'Accounts, tickets & manager reports',
    icon: FileSpreadsheet,
    accent: '#ff914d',
    glowColor: 'rgba(255, 145, 77, 0.14)',
    statValue: 'Checking...',
    statLabel: 'Current Month Collection',
    bullets: [
      'Retrieving client & subcontractor receipts from MongoDB...',
      'Auditing unreconciled imprest balances...',
      'Scanning support ticket SLA breach escalations...',
    ],
    actionText: 'Read Daily Briefing',
    link: '/audit',
  },
  {
    id: 'meetings',
    categoryChip: 'Department Reviews',
    badgeText: 'Synchronizing...',
    title: 'Review Meetings & MD Directives',
    subtitle: 'Team agendas & management instructions',
    icon: Users,
    accent: '#0D9488',
    glowColor: 'rgba(13, 148, 136, 0.14)',
    statValue: 'Checking...',
    statLabel: 'Executive Schedule',
    bullets: [
      'Loading corporate review schedules across all entities...',
      'Verifying agenda topics and MD directives...',
      'Synchronizing department status across VFMS, VTS, CC & Profox...',
    ],
    actionText: 'Open Meetings Desk',
    link: '/meetings',
  },
];

export const ExecutiveCommandDeck = ({
  currentUser,
  onLogout,
  onBack,
  onOpenChecklist,
  onOpenAudit,
  onOpenMeetings,
  onOpenCalendar,
  onOpenNotes,
  voiceEnabled,
  onToggleVoice,
  currentTime
}) => {
  const [activeModuleId, setActiveModuleId] = useState('checklist');
  const [directiveInput, setDirectiveInput] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [modules, setModules] = useState(EXECUTIVE_MODULES);

  // Dynamic live data fetching for all 3 cards from MongoDB
  React.useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        const [checklistRes, accountsRes, ticketsRes, meetingsRes] = await Promise.allSettled([
          fetch('/api/checklist'),
          fetch('/api/accounts/summary'),
          fetch('/api/tickets/summary'),
          fetch('/api/meetings'),
        ]);

        let updatedChecklistStat = 'Pending Sync';
        let updatedChecklistValue = '0 / 8 Verified';
        let checklistBullets = null;

        if (checklistRes.status === 'fulfilled' && checklistRes.value.ok) {
          const cData = await checklistRes.value.json();
          if (cData && cData.items) {
            const completed = cData.items.filter((i) => i.completed || i.manual_verified).length;
            const total = cData.items.length;
            const pending = total - completed;
            updatedChecklistValue = `${completed} / ${total} Verified`;
            updatedChecklistStat = pending === 0 ? 'All 8 Verified' : `${pending} Pending`;

            const checkinItem = cData.items.find((i) => i.number === 1);
            const attendanceItem = cData.items.find((i) => i.number === 3);
            const accountsItem = cData.items.find((i) => i.number === 5);

            checklistBullets = [
              checkinItem?.ai_feedback || (checkinItem?.completed ? 'MD attendance verified for today' : 'MD Check-in pending verification'),
              attendanceItem?.ai_feedback || 'Head Office & In-charges attendance record live',
              accountsItem?.ai_feedback ? accountsItem.ai_feedback.split('|')[0].trim() : 'Daily accounts and collection audit standing by',
            ];
          }
        }

        let accountsValue = 'Live Telemetry';
        let accountsLabel = 'Executive Financials';
        let accountsBadge = 'Live Telemetry';
        let accountsBullets = null;

        let ticketsData = null;
        if (ticketsRes.status === 'fulfilled' && ticketsRes.value.ok) {
          ticketsData = await ticketsRes.value.json();
        }

        if (accountsRes.status === 'fulfilled' && accountsRes.value.ok) {
          const aData = await accountsRes.value.json();
          if (aData && aData.metrics) {
            const m = aData.metrics;
            const monthCol = m.latest_month_collection || 0;
            const monthName = m.latest_month_name || 'Current Month';
            const monthCr = (monthCol / 10000000).toFixed(2);
            const allTimeCr = (m.total_collections_all_time / 10000000).toFixed(2);
            const clientCr = (m.total_client_receipts / 10000000).toFixed(2);
            const imprestNet = m.current_month_imprest_net_balance ?? m.total_unsettled_cash_held ?? 0;
            const imprestHolders = m.current_month_imprest_active_holders ?? m.holders_with_unsettled_cash ?? 0;
            const dangerTicketsCount = ticketsData?.metrics?.total_danger_tickets_overdue_3_days || 0;

            accountsValue = `₹ ${monthCr} Cr`;
            accountsLabel = `${monthName} Collection`;
            accountsBadge = 'Verified Live';
            accountsBullets = [
              `Cumulative Collections: ₹${allTimeCr} Cr (₹${clientCr} Cr Client Receipts)`,
              `Imprest Held: ₹${(imprestNet / 100000).toFixed(2)} Lakhs across ${imprestHolders} active holders`,
              `SLA Breach Containment: ${dangerTicketsCount} critical tickets overdue > 3 days`,
            ];
          }
        }

        let meetingsValue = '4 Companies';
        let meetingsLabel = 'Weekly Reviews';
        let meetingsBadge = 'Schedule Live';
        let meetingsBullets = null;

        if (meetingsRes.status === 'fulfilled' && meetingsRes.value.ok) {
          const allMeetings = await meetingsRes.value.json();
          if (Array.isArray(allMeetings)) {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const todayMeetings = allMeetings.filter((m) => m.date === todayStr);
            const activeCompanies = Array.from(new Set(allMeetings.map((m) => (m.company || '').toUpperCase()))).filter(Boolean);

            if (todayMeetings.length > 0) {
              meetingsValue = `${todayMeetings.length} ${todayMeetings.length === 1 ? 'Session' : 'Sessions'} Today`;
              meetingsLabel = 'Executive Schedule';
              meetingsBadge = `${todayMeetings.length} Scheduled Today`;
              const completedCount = todayMeetings.filter((m) => m.status === 'COMPLETED').length;

              meetingsBullets = [
                `Today: ${todayMeetings[0].company} — ${todayMeetings[0].title} (${todayMeetings[0].time || 'Scheduled'})`,
                `Entities active today: ${Array.from(new Set(todayMeetings.map((m) => m.company))).join(', ')}`,
                `Session Status: ${completedCount} Completed, ${todayMeetings.length - completedCount} Pending`,
              ];
            } else {
              const upcoming = allMeetings
                .filter((m) => m.date >= todayStr)
                .sort((a, b) => a.date.localeCompare(b.date));
              const nextM = upcoming[0];

              meetingsValue = '0 Today';
              meetingsLabel = 'Schedule Clear';
              meetingsBadge = '0 Scheduled Today';
              meetingsBullets = [
                'Today: No review meetings scheduled (Calendar Clear)',
                nextM
                  ? `Next Upcoming: ${nextM.company} — ${nextM.title} on ${nextM.date}`
                  : `All company review schedules synchronized`,
                `Corporate entities mapped: ${activeCompanies.join(', ')} (${allMeetings.length} total sessions tracked)`,
              ];
            }
          }
        }

        setModules((prev) =>
          prev.map((mod) => {
            if (mod.id === 'checklist') {
              return {
                ...mod,
                statValue: updatedChecklistValue,
                badgeText: updatedChecklistStat,
                bullets: checklistBullets || mod.bullets,
              };
            }
            if (mod.id === 'briefing' && accountsBullets) {
              return {
                ...mod,
                statValue: accountsValue,
                statLabel: accountsLabel,
                badgeText: accountsBadge,
                bullets: accountsBullets,
              };
            }
            if (mod.id === 'meetings' && meetingsBullets) {
              return {
                ...mod,
                statValue: meetingsValue,
                statLabel: meetingsLabel,
                badgeText: meetingsBadge,
                bullets: meetingsBullets,
              };
            }
            return mod;
          })
        );
      } catch (err) {
        console.warn('Command deck metrics fetch error:', err);
      }
    };

    fetchLiveMetrics();
  }, []);

  const handleDirectiveSubmit = (e) => {
    e.preventDefault();
    if (!directiveInput.trim()) return;

    playSuccessChime();
    showToast(`Instruction sent: "${directiveInput}"`);
    setDirectiveInput('');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenModule = (mod) => {
    playSuccessChime();
    if (mod.id === 'checklist' && onOpenChecklist) {
      onOpenChecklist();
      return;
    }
    if ((mod.id === 'briefing' || mod.link === '/audit') && onOpenAudit) {
      onOpenAudit();
      return;
    }
    if ((mod.id === 'meetings' || mod.link === '/meetings') && onOpenMeetings) {
      onOpenMeetings();
      return;
    }
    if (window.location.port === '5173') {
      window.location.href = `http://localhost:8000${mod.link}`;
    } else {
      window.location.href = mod.link;
    }
  };

  // 12-hour AM/PM Time Formatter
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

  const formattedTime = format12HourTime(currentTime);

  const formattedDate = (currentTime || new Date()).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const activeModule = modules.find((m) => m.id === activeModuleId) || modules[0];

  return (
    <div className="innovative-deck-stage">
      {/* Top Ambient Glow */}
      <div className="laser-horizon-glow" />

      {/* ============================================================== */}
      {/* 1. TOP EXECUTIVE HEADER                                        */}
      {/* ============================================================== */}
      <header className="spatial-top-hud">
        <div className="spatial-hud-left">
          <div className="spatial-brand-pill">
            <Building2 size={16} color="#ff914d" />
            <span className="spatial-brand-title">Managing Director's Office</span>
          </div>
        </div>

        <div className="spatial-hud-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Notes Navigation Button */}
          <button
            onMouseEnter={playHoverServo}
            onClick={() => {
              playMechanicalClick();
              onOpenNotes?.();
            }}
            className="spatial-notes-btn"
            title="MD Notes & AI Directives"
            aria-label="MD Notes & AI Directives"
          >
            <StickyNote size={16} color="#00bf63" />
          </button>

          {/* Calendar Navigation Button (Icon Only) */}
          <button
            onMouseEnter={playHoverServo}
            onClick={() => {
              playMechanicalClick();
              onOpenCalendar?.();
            }}
            className="spatial-calendar-btn"
            title="Operations & Meetings Calendar"
            aria-label="Calendar"
          >
            <Calendar size={16} color="#ff914d" />
          </button>

          {/* Sleek Executive Profile & Sign Out Capsule */}
          {currentUser && (
            <div className="exec-profile-capsule" style={{ height: '34px', padding: '0 6px 0 6px' }}>
              <span
                className={`exec-profile-avatar ${currentUser?.initials === 'MD' ? 'avatar-md' : 'avatar-ea'}`}
                style={{ width: '24px', height: '24px', fontSize: '10px' }}
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLogout();
                    }}
                    className="exec-profile-logout-btn"
                    title="Sign Out / Switch account"
                    style={{ height: '24px', padding: '0 6px', fontSize: '10px' }}
                  >
                    <LogOut size={12} />
                    <span>Exit</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="spatial-toast">
          <CheckCircle2 size={16} color="#059669" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SIMPLE, DIGNIFIED EXECUTIVE INTRO                           */}
      {/* ============================================================== */}
      <div className="spatial-deck-hero">
        <div className="spatial-hero-capsule">
          <Sparkles size={13} color="#ff914d" />
          <span>Daily Executive Operations</span>
        </div>
        <h2 className="spatial-hero-heading">Welcome, {currentUser?.name || 'Managing Director'}</h2>
        <p className="spatial-hero-sub">
          Here is your company's daily morning checklist, accounts collection, attendance status, and meeting schedules for today.
        </p>
      </div>

      {/* ============================================================== */}
      {/* 3. 4 EXECUTIVE CARDS (CLEAN, NON-TECH, PRACTICAL)              */}
      {/* ============================================================== */}
      <div className="spatial-cards-chamber">
        {modules.map((mod) => {
          const IconComp = mod.icon;
          const isSelected = activeModuleId === mod.id;

          return (
            <div
              key={mod.id}
              onMouseEnter={playHoverServo}
              onClick={() => {
                setActiveModuleId(mod.id);
                handleOpenModule(mod);
              }}
              className={`kinetic-holo-card ${isSelected ? 'kinetic-card-active' : ''}`}
              style={{
                '--card-accent': mod.accent,
                '--card-glow': mod.glowColor,
                cursor: 'pointer',
              }}
              role="button"
              tabIndex={0}
              title={`Click to open ${mod.title}`}
            >
              {/* Card Header: Category & Badge */}
              <div className="kinetic-card-top">
                <span className="kinetic-index-tag">{mod.categoryChip}</span>
                <span className="kinetic-status-pill">{mod.badgeText}</span>
              </div>

              {/* Icon Box */}
              <div className="kinetic-icon-box">
                <IconComp size={26} color={mod.accent} />
              </div>

              {/* Title & Subtitle */}
              <div className="kinetic-title-box">
                <h3 className="kinetic-card-title">{mod.title}</h3>
                <p className="kinetic-card-sub">{mod.subtitle}</p>
              </div>

              {/* Key Number Stat Pod */}
              <div className="kinetic-stat-pod">
                <div className="kinetic-stat-value" style={{ color: mod.accent }}>
                  {mod.statValue}
                </div>
                <div className="kinetic-stat-label">{mod.statLabel}</div>
              </div>

              {/* Plain English Key Highlights */}
              <div className="kinetic-preview-list">
                {mod.bullets.map((b, idx) => (
                  <div key={idx} className="kinetic-preview-point">
                    <span className="point-diamond" style={{ backgroundColor: mod.accent }} />
                    <span className="point-text">{b}</span>
                  </div>
                ))}
              </div>

              {/* Open Action Button */}
              <div className="kinetic-card-footer">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenModule(mod);
                  }}
                  className="kinetic-action-btn"
                >
                  <span>{mod.actionText}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 4. FLOATING DIRECTIVE BAR (SIMPLE PRACTICAL INSTRUCTION)        */}
      {/* ============================================================== */}
      <footer className="spatial-directive-capsule">
        <form onSubmit={handleDirectiveSubmit} className="directive-form">
          <div className="directive-core-node">
            <span className="directive-pulse-dot" />
            <span className="directive-core-text">Assistant Ready</span>
          </div>

          <input
            type="text"
            value={directiveInput}
            onChange={(e) => setDirectiveInput(e.target.value)}
            placeholder={`Type an instruction for your managers or staff regarding ${activeModule.title}...`}
            className="directive-input-field"
          />

          <div className="directive-btn-group">
            <button
              type="button"
              onClick={() => {
                playMechanicalClick();
                showToast('Listening... Please speak your instruction.');
              }}
              className="directive-mic-btn"
              title="Speak Instruction"
            >
              <Mic size={16} />
            </button>

            <button type="submit" className="directive-transmit-btn">
              <span>Send Instruction</span>
              <Send size={14} />
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};
