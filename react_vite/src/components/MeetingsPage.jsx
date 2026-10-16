import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap,
  Flame,
  ArrowLeft,
  Clock,
  RotateCcw,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  Sparkles,
  Edit3,
  CalendarDays,
  ArrowRightLeft,
  Loader2,
  X,
  Building,
  Briefcase,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { MeetingDeskPage } from './MeetingDeskPage';
import { renderCompanyBadge } from './CompanyBadge';
import { CustomSelect } from './CustomSelect';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

const COMPANY_OPTIONS = [
  { value: 'ALL', label: 'All Companies' },
  { value: 'VFMS', label: 'VFMS' },
  { value: 'VTS', label: 'VTS' },
  { value: 'CC', label: 'City Coolies' },
  { value: 'PROFOX', label: 'Profox' },
];

const DAY_OPTIONS = [
  { value: 'ALL', label: 'All Days' },
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'SATURDAY', label: 'Saturday' },
];

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'All Priorities' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'NORMAL', label: 'Normal Priority' },
  { value: 'POSTPONE', label: 'Postpone' },
  { value: 'SKIP', label: 'Skip' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'POSTPONED', label: 'Postponed' },
];

const INSPECT_PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High Priority (Inherits Next Week)' },
  { value: 'NORMAL', label: 'Normal Priority' },
  { value: 'POSTPONE', label: 'Postpone to Next Week' },
  { value: 'SKIP', label: 'Skip Next Week' },
];

// Helper: Parse meeting start time string into 24-hr minutes from midnight
const parseMeetingStartTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Helper: Strictly sort meetings by Date (YYYY-MM-DD) and then Start Time (chronological)
const compareMeetingsByDateTime = (a, b) => {
  const dateA = a?.date || '';
  const dateB = b?.date || '';
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }
  return parseMeetingStartTime(a?.time) - parseMeetingStartTime(b?.time);
};

// Custom Executive Calendar Picker
const CustomDatePicker = ({ value, onChange, label, onlySaturdays = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedDate = value ? new Date(value) : null;
  const [viewYear, setViewYear] = useState(() => (selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate.getMonth() : new Date().getMonth()));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const daysArray = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const formatDisplay = (ymdStr) => {
    if (!ymdStr) return 'Choose Date';
    const d = new Date(ymdStr);
    if (isNaN(d.getTime())) return 'Choose Date';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleSelectDay = (dayNum) => {
    if (!dayNum) return;
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    const ymd = `${viewYear}-${m}-${d}`;
    onChange(ymd);
    setIsOpen(false);
  };

  return (
    <div className="custom-datepicker-wrap" ref={containerRef}>
      {label && <label className="custom-select-label">{label}</label>}
      <button
        type="button"
        className={`custom-datepicker-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={15} color="#ff914d" />
        <span className="custom-datepicker-val">{formatDisplay(value)}</span>
        <ChevronDown size={14} className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-calendar-popover">
          <div className="cal-pop-header">
            <button type="button" onClick={handlePrevMonth} className="cal-pop-nav-btn" aria-label="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <div className="cal-pop-month-title">
              {monthNames[viewMonth]} {viewYear}
            </div>
            <button type="button" onClick={handleNextMonth} className="cal-pop-nav-btn" aria-label="Next Month">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="cal-pop-weekdays-grid">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
              <span key={w} className={`cal-pop-weekday ${idx === 6 ? 'sat' : ''}`}>{w}</span>
            ))}
          </div>

          <div className="cal-pop-days-grid">
            {daysArray.map((dayNum, idx) => {
              if (dayNum === null) {
                return <span key={`empty-${idx}`} className="cal-pop-day-cell empty" />;
              }

              const cellDate = new Date(viewYear, viewMonth, dayNum);
              const dayOfWeek = cellDate.getDay();
              const isSaturday = dayOfWeek === 6;

              const mStr = String(viewMonth + 1).padStart(2, '0');
              const dStr = String(dayNum).padStart(2, '0');
              const cellYMD = `${viewYear}-${mStr}-${dStr}`;
              const isSelected = value === cellYMD;
              const isToday = new Date().toISOString().slice(0, 10) === cellYMD;
              const isHighlight = onlySaturdays && isSaturday;

              return (
                <button
                  type="button"
                  key={cellYMD}
                  onClick={() => handleSelectDay(dayNum)}
                  className={`cal-pop-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isHighlight ? 'highlight' : ''}`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div className="cal-pop-footer">
            <button
              type="button"
              className="cal-pop-quick-btn"
              onClick={() => {
                const today = new Date();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                onChange(`${today.getFullYear()}-${m}-${d}`);
                setIsOpen(false);
              }}
            >
              Today
            </button>
            {onlySaturdays && (
              <button
                type="button"
                className="cal-pop-quick-btn sat"
                onClick={() => {
                  const today = new Date();
                  const distance = (6 - today.getDay() + 7) % 7 || 7;
                  const nextSat = new Date(today);
                  nextSat.setDate(today.getDate() + distance);
                  const m = String(nextSat.getMonth() + 1).padStart(2, '0');
                  const d = String(nextSat.getDate()).padStart(2, '0');
                  onChange(`${nextSat.getFullYear()}-${m}-${d}`);
                  setIsOpen(false);
                }}
              >
                Upcoming Sat
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const MeetingsPage = ({
  currentUser,
  onLogout,
  onBack,
  onBackToSchedule,
  onNavigate,
  currentView,
  voiceEnabled,
  onToggleVoice,
  currentTime
}) => {
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

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Week State (Default Monday of current week)
  const getInitialMonday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - distanceToMonday);
    mon.setHours(0, 0, 0, 0);
    return mon;
  };
  const [activeMonday, setActiveMonday] = useState(getInitialMonday);
  const [activeDeskMeetingId, setActiveDeskMeetingId] = useState(() => {
    try {
      return sessionStorage.getItem('active_desk_meeting_id') || null;
    } catch {
      return null;
    }
  });

  // Sync active desk meeting ID with currentView from router
  useEffect(() => {
    if (currentView === 'meetings' && activeDeskMeetingId) {
      setActiveDeskMeetingId(null);
      try {
        sessionStorage.removeItem('active_desk_meeting_id');
      } catch {}
    } else if (currentView === 'meeting_desk' && !activeDeskMeetingId) {
      try {
        const savedId = sessionStorage.getItem('active_desk_meeting_id');
        if (savedId) {
          setActiveDeskMeetingId(savedId);
        }
      } catch {}
    }
  }, [currentView]);

  const openMeetingDesk = (meetingId) => {
    setActiveDeskMeetingId(meetingId);
    try {
      if (meetingId) {
        sessionStorage.setItem('active_desk_meeting_id', meetingId);
        if (onNavigate) {
          onNavigate('meeting_desk');
        } else {
          window.location.hash = 'meeting_desk';
        }
      } else {
        sessionStorage.removeItem('active_desk_meeting_id');
        if (onBackToSchedule) {
          onBackToSchedule();
        } else {
          window.location.hash = 'meetings';
        }
      }
    } catch {}
  };

  const [deskKey, setDeskKey] = useState(0);

  // Modal Dialog States
  const [inspectMeeting, setInspectMeeting] = useState(null);
  const [inspectFeedback, setInspectFeedback] = useState('');
  const [inspectPriority, setInspectPriority] = useState('NORMAL');
  const [inspectPriorityNotes, setInspectPriorityNotes] = useState('');
  const [inspectTopics, setInspectTopics] = useState([]);

  const [rescheduleMeeting, setRescheduleMeeting] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('11:00 AM - 01:00 PM');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleOmFm, setRescheduleOmFm] = useState(false);

  const [swapMeetingA, setSwapMeetingA] = useState(null);
  const [swapMeetingIdB, setSwapMeetingIdB] = useState('');
  const [swapReason, setSwapReason] = useState('');

  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [assemblyDate, setAssemblyDate] = useState('');
  const [assemblyLocation, setAssemblyLocation] = useState('Head Office Boardroom');

  // View Mode: 'TODAY' (default active), 'WEEK' (regular week table) or 'MONTH' (full month schedule)
  const [viewMode, setViewMode] = useState('TODAY');
  const [monthYear, setMonthYear] = useState(2026);
  const [monthNum, setMonthNum] = useState(10);
  const [monthBreakdown, setMonthBreakdown] = useState(null);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Load all meetings from API
  const loadMeetings = async (showNotice = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/meetings?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to load meetings data');
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data.slice().sort(compareMeetingsByDateTime) : []);
      if (showNotice) {
        showToast('Meetings schedule refreshed from local storage.');
      }
    } catch (err) {
      console.warn('Error loading meetings:', err);
      setError('Meetings server unreachable. Ensure Python server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Load comprehensive full-month breakdown
  const loadMonthBreakdown = async (y = monthYear, m = monthNum) => {
    try {
      setLoadingMonth(true);
      const res = await fetch(`/api/meetings/month?year=${y}&month=${m}`);
      if (!res.ok) throw new Error('Failed to load month breakdown');
      const data = await res.json();
      setMonthBreakdown(data);
    } catch (err) {
      console.warn('Error loading month breakdown:', err);
      showToast('Could not load monthly schedule.');
    } finally {
      setLoadingMonth(false);
    }
  };

  const handlePrevMonth = () => {
    playMechanicalClick();
    let newM = monthNum - 1;
    let newY = monthYear;
    if (newM < 1) {
      newM = 12;
      newY -= 1;
    }
    setMonthYear(newY);
    setMonthNum(newM);
    loadMonthBreakdown(newY, newM);
  };

  const handleNextMonth = () => {
    playMechanicalClick();
    let newM = monthNum + 1;
    let newY = monthYear;
    if (newM > 12) {
      newM = 1;
      newY += 1;
    }
    setMonthYear(newY);
    setMonthNum(newM);
    loadMonthBreakdown(newY, newM);
  };

  const handleCurrentMonth = () => {
    playMechanicalClick();
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    setMonthYear(y);
    setMonthNum(m);
    loadMonthBreakdown(y, m);
  };

  const handleRegenerateMonth = async () => {
    playMechanicalClick();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/meetings/generate-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: monthYear, month: monthNum, force: false }),
      });
      if (res.ok) {
        playSuccessChime();
        const data = await res.json();
        setMonthBreakdown(data.breakdown);
        await loadMeetings();
        showToast(`Full month schedule synchronized for ${data.breakdown.month_name}!`);
      } else {
        showToast('Month schedule synchronization failed.');
      }
    } catch {
      showToast('Error synchronizing month schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const jumpToWeekView = (mondayDateStr) => {
    playMechanicalClick();
    const parts = mondayDateStr.split('-');
    const mon = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    mon.setHours(0, 0, 0, 0);
    setActiveMonday(mon);
    setViewMode('WEEK');
  };

  useEffect(() => {
    loadMeetings();
    loadMonthBreakdown(monthYear, monthNum);
  }, []);

  // Auto-recovery: If meetings list is ever unexpectedly empty when switching views, automatically reload
  useEffect(() => {
    if (meetings.length === 0 && !loading) {
      loadMeetings();
    }
  }, [viewMode, currentView]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Week Helpers
  const toYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const initialMonday = useMemo(getInitialMonday, []);
  const isCurrentWeek = toYMD(activeMonday) === toYMD(initialMonday);
  const isPastWeek = toYMD(activeMonday) < toYMD(initialMonday);

  const handleCurrentWeek = () => {
    playMechanicalClick();
    setActiveMonday(getInitialMonday());
  };

  const activeSaturday = useMemo(() => {
    const sat = new Date(activeMonday);
    sat.setDate(activeMonday.getDate() + 5);
    return sat;
  }, [activeMonday]);

  const weekDateRangeLabel = useMemo(() => {
    const monFmt = activeMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const satFmt = activeSaturday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${monFmt} – ${satFmt}`;
  }, [activeMonday, activeSaturday]);

  const handlePrevWeek = () => {
    playMechanicalClick();
    const next = new Date(activeMonday);
    next.setDate(activeMonday.getDate() - 7);
    setActiveMonday(next);
  };

  const handleNextWeek = () => {
    playMechanicalClick();
    const next = new Date(activeMonday);
    next.setDate(activeMonday.getDate() + 7);
    setActiveMonday(next);
  };

  // Prepare upcoming week schedule
  const handlePrepareUpcomingWeek = async () => {
    playMechanicalClick();
    setIsSubmitting(true);
    try {
      const nextWeekMon = new Date(activeMonday);
      nextWeekMon.setDate(activeMonday.getDate() + 7);
      const res = await fetch('/api/meetings/generate-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: toYMD(nextWeekMon) }),
      });
      if (res.ok) {
        playSuccessChime();
        await loadMeetings();
        setActiveMonday(nextWeekMon);
        showToast('Upcoming week meetings schedule prepared successfully!');
      } else {
        showToast('Schedule preparation returned notice.');
      }
    } catch {
      showToast('Error connecting to meetings schedule service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Inspect Modal
  const handleOpenInspect = (mtg) => {
    playMechanicalClick();
    setInspectMeeting(mtg);
    setInspectFeedback(mtg.md_feedback || '');
    setInspectPriority(mtg.md_priority || 'NORMAL');
    setInspectPriorityNotes(mtg.md_priority_notes || '');
    setInspectTopics(mtg.topics ? JSON.parse(JSON.stringify(mtg.topics)) : []);
  };

  // Toggle Topic Completed
  const handleToggleTopic = (topicId) => {
    setInspectTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, completed: !t.completed } : t))
    );
  };

  // Save Inspect Directives
  const handleSaveInspectDirectives = async (statusOverride = null) => {
    if (!inspectMeeting) return;
    playMechanicalClick();
    setIsSubmitting(true);
    const finalStatus = statusOverride || inspectMeeting.status;

    // Instant optimistic update
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === inspectMeeting.id
          ? {
              ...m,
              status: finalStatus,
              md_feedback: inspectFeedback,
              md_priority: inspectPriority,
              md_priority_notes: inspectPriorityNotes,
              topics: inspectTopics,
            }
          : m
      )
    );

    try {
      const res = await fetch(`/api/meetings/${inspectMeeting.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          md_feedback: inspectFeedback,
          md_priority: inspectPriority,
          md_priority_notes: inspectPriorityNotes,
          topics: inspectTopics,
          status: finalStatus,
          updated_by: currentUser?.name || 'Managing Director',
        }),
      });
      if (res.ok) {
        playSuccessChime();
        await loadMeetings();
        setInspectMeeting(null);
        showToast(finalStatus === 'COMPLETED' ? 'Meeting marked as COMPLETED & Locked!' : 'MD Directives & Topic status updated successfully!');
      } else {
        showToast('Failed to save directives.');
      }
    } catch {
      showToast('Error connecting to meetings service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Reschedule Modal
  const handleOpenReschedule = (mtg) => {
    if (mtg.status === 'COMPLETED') {
      showToast('Completed meetings cannot be rescheduled.');
      return;
    }
    playMechanicalClick();
    setRescheduleMeeting(mtg);
    setRescheduleDate(mtg.date || toYMD(new Date()));
    setRescheduleTime(mtg.time || '11:00 AM - 01:00 PM');
    setRescheduleReason('');
    setRescheduleOmFm(false);
  };

  // Submit Reschedule
  const handleSubmitReschedule = async () => {
    if (!rescheduleMeeting) return;
    playMechanicalClick();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/meetings/${rescheduleMeeting.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_date: rescheduleDate,
          new_time: rescheduleTime,
          reason: rescheduleReason || 'Executive reschedule instruction',
          reschedule_om_fm: rescheduleOmFm,
          updated_by: currentUser?.name || 'Managing Director',
        }),
      });
      if (res.ok) {
        playSuccessChime();
        await loadMeetings();
        setDeskKey((prev) => prev + 1);
        setRescheduleMeeting(null);
        showToast(
          rescheduleOmFm
            ? `Meeting & OM/FM Assembly rescheduled to ${rescheduleDate}!`
            : `Meeting rescheduled to ${rescheduleDate} (OM/FM unchanged)!`
        );
      } else {
        showToast('Failed to reschedule meeting.');
      }
    } catch {
      showToast('Error connecting to meetings service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Swap Modal
  const handleOpenSwap = (mtg) => {
    if (mtg.status === 'COMPLETED') {
      showToast('Completed meetings cannot be swapped.');
      return;
    }
    playMechanicalClick();
    setSwapMeetingA(mtg);
    setSwapMeetingIdB('');
    setSwapReason('');
  };

  // Submit Swap
  const handleSubmitSwap = async () => {
    if (!swapMeetingA || !swapMeetingIdB) return;
    playMechanicalClick();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/meetings/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id_a: swapMeetingA.id,
          meeting_id_b: swapMeetingIdB,
          reason: swapReason || 'Schedule optimization by MD',
          updated_by: currentUser?.name || 'Managing Director',
        }),
      });
      if (res.ok) {
        playSuccessChime();
        await loadMeetings();
        setDeskKey((prev) => prev + 1);
        setSwapMeetingA(null);
        showToast('Meeting schedule slots swapped successfully!');
      } else {
        showToast('Failed to swap meeting slots.');
      }
    } catch {
      showToast('Error connecting to meetings service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Schedule Monthly Assembly (Half Day)
  const handleSubmitAssembly = async () => {
    if (!assemblyDate) {
      showToast('Please select a Saturday for the monthly assembly.');
      return;
    }
    playMechanicalClick();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/meetings/schedule-monthly-assembly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: assemblyDate,
          time: '08:30 AM - 01:30 PM (Half Day)',
          location: assemblyLocation || 'Main Assembly Hall / Head Office Boardroom',
          created_by: currentUser?.name || 'Managing Director',
        }),
      });
      if (res.ok) {
        playSuccessChime();
        await loadMeetings();
        await loadMonthBreakdown(monthYear, monthNum);
        setIsAssemblyModalOpen(false);
        showToast('Monthly OM & FM Half-Day Assembly (8:30 AM - 1:30 PM) scheduled!');
      } else {
        showToast('Assembly already scheduled or failed.');
      }
    } catch {
      showToast('Error scheduling monthly assembly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Meetings
  const filteredMeetings = useMemo(() => {
    const today = new Date();
    const todayStr = toYMD(today);
    const monStr = toYMD(activeMonday);
    const satStr = toYMD(activeSaturday);

    const list = meetings.filter((m) => {
      // Date filter based on view mode
      if (viewMode === 'TODAY') {
        if (m.date !== todayStr) return false;
      } else {
        // Date range filter for Week view
        if (m.date < monStr || m.date > satStr) return false;
      }

      // Company
      if (selectedCompany !== 'ALL') {
        const c = (m.company || '').toUpperCase();
        const match = selectedCompany === 'VFMS' ? (c === 'VFMS' || c === 'VFM') : (c === selectedCompany);
        if (!match) return false;
      }

      // Day (only applies in Week view)
      if (viewMode !== 'TODAY' && selectedDay !== 'ALL') {
        const d = new Date(m.date);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
        if (dayName.toUpperCase() !== selectedDay.toUpperCase()) return false;
      }

      // Priority
      if (selectedPriority !== 'ALL' && (m.md_priority || 'NORMAL').toUpperCase() !== selectedPriority) {
        return false;
      }

      // Status
      if (selectedStatus !== 'ALL' && (m.status || 'SCHEDULED').toUpperCase() !== selectedStatus) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t = (m.title || '').toLowerCase();
        const c = (m.company || '').toLowerCase();
        const d = (m.department || '').toLowerCase();
        const loc = (m.location || '').toLowerCase();
        if (!t.includes(q) && !c.includes(q) && !d.includes(q) && !loc.includes(q)) {
          return false;
        }
      }

      return true;
    });

    return list.slice().sort(compareMeetingsByDateTime);
  }, [meetings, viewMode, activeMonday, activeSaturday, selectedCompany, selectedDay, selectedPriority, selectedStatus, searchQuery]);

  const formattedTime = format12HourTime(currentTime);
  const formattedDate = (currentTime || new Date()).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (loading && meetings.length === 0) {
    return (
      <div className="checklist-loading-viewport">
        <div className="loading-card">
          <Loader2 size={32} color="#ff914d" className="animate-spin" />
          <h2 className="loading-title">Executive Meetings Desk</h2>
          <p className="loading-sub">Synchronizing meeting agendas and department schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {activeDeskMeetingId ? (
        <MeetingDeskPage
          key={`${activeDeskMeetingId}_${deskKey}`}
          meetingId={activeDeskMeetingId}
          currentUser={currentUser}
          onMeetingUpdated={(updated) => {
            setMeetings((prev) =>
              prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
            );
          }}
          onBack={() => {
            playMechanicalClick();
            openMeetingDesk(null);
            loadMeetings();
          }}
          onOpenReschedule={(m) => handleOpenReschedule(m)}
          onOpenSwap={(m) => handleOpenSwap(m)}
        />
      ) : (
        <div className="meetings-desk-viewport">
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
                <h2 className="checklist-main-title">Review Meetings & MD Directives Desk</h2>
                <div className="checklist-date-sub">{formattedDate} • 4 Enterprise Companies Schedule</div>
              </div>
            </div>
          </header>


      {/* ============================================================== */}
      {/* 3. WEEK CONTROLLER & TOOLBAR                                   */}
      {/* ============================================================== */}
      <div className="meetings-toolbar-box">
        <div className="meetings-toolbar-top-row">
          {/* View Mode Segmented Switch */}
          <div className="view-mode-toggle-deck">
            <button
              className={`view-toggle-btn ${viewMode === 'TODAY' ? 'active' : ''}`}
              onClick={() => {
                playMechanicalClick();
                setViewMode('TODAY');
              }}
              title="Today's Operational Schedule"
            >
              <Calendar size={14} />
              <span>Today</span>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'WEEK' ? 'active' : ''}`}
              onClick={() => {
                playMechanicalClick();
                setViewMode('WEEK');
              }}
              title="Weekly Operational Schedule"
            >
              <Calendar size={14} />
              <span>Week View</span>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'MONTH' ? 'active' : ''}`}
              onClick={() => {
                playMechanicalClick();
                setViewMode('MONTH');
                loadMonthBreakdown(monthYear, monthNum);
              }}
              title="Full Month Complete Schedule View"
            >
              <CalendarDays size={14} />
              <span>Full Month Schedule</span>
            </button>
          </div>

          {/* Calendar Navigation (Today, Week or Month) */}
          {viewMode === 'TODAY' ? (
            <div className="week-navigation-group">
              <div className="week-badge-pill current">
                <Calendar size={14} color="#ff914d" />
                <span className="week-badge-text">
                  Today • {new Date().toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="week-status-chip current">Active Today</span>
              </div>
            </div>
          ) : viewMode === 'WEEK' ? (
            <div className="week-navigation-group">
              <button onClick={handlePrevWeek} className="week-nav-btn" title="View Previous Week Schedule">
                <ChevronLeft size={15} />
                <span>Prev Week</span>
              </button>

              <div className={`week-badge-pill ${isPastWeek ? 'past' : isCurrentWeek ? 'current' : 'future'}`}>
                <Calendar size={14} color={isPastWeek ? '#64748B' : '#ff914d'} />
                <span className="week-badge-text">{weekDateRangeLabel}</span>
                {isCurrentWeek && <span className="week-status-chip current">Current</span>}
                {isPastWeek && <span className="week-status-chip past">Past</span>}
              </div>

              {!isCurrentWeek && (
                <button onClick={handleCurrentWeek} className="week-nav-btn jump-current" title="Jump to Current Week">
                  <RotateCcw size={13} color="#1D4ED8" />
                  <span>Current Week</span>
                </button>
              )}

              <button onClick={handleNextWeek} className="week-nav-btn" title="View Next Week Schedule">
                <span>Next Week</span>
                <ChevronRight size={15} />
              </button>
            </div>
          ) : (
            <div className="week-navigation-group">
              <button onClick={handlePrevMonth} className="week-nav-btn" title="View Previous Month">
                <ChevronLeft size={15} />
                <span>Prev Month</span>
              </button>
              <div className="week-badge-pill current">
                <CalendarDays size={14} color="#ff914d" />
                <span className="week-badge-text">
                  {monthBreakdown?.month_name || 'October 2026'}
                </span>
                <span className="week-status-chip current">Active Month</span>
              </div>
              <button onClick={handleCurrentMonth} className="week-nav-btn jump-current" title="Jump to Current Month">
                <RotateCcw size={13} color="#1D4ED8" />
                <span>Current Month</span>
              </button>
              <button onClick={handleNextMonth} className="week-nav-btn" title="View Next Month">
                <span>Next Month</span>
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Filter Strip with Custom Styled Dropdowns (Active in Today & Week View) */}
        {(viewMode === 'WEEK' || viewMode === 'TODAY') && (
          <>
            <div className="meetings-toolbar-divider" />
            <div className="meetings-filter-strip">
            <CustomSelect
              label="Company:"
              value={selectedCompany}
              options={COMPANY_OPTIONS}
              onChange={setSelectedCompany}
            />

            {viewMode === 'WEEK' && (
              <CustomSelect
                label="Day:"
                value={selectedDay}
                options={DAY_OPTIONS}
                onChange={setSelectedDay}
              />
            )}

            <CustomSelect
              label="Priority:"
              value={selectedPriority}
              options={PRIORITY_OPTIONS}
              onChange={setSelectedPriority}
            />

            <CustomSelect
              label="Status:"
              value={selectedStatus}
              options={STATUS_OPTIONS}
              onChange={setSelectedStatus}
            />

            <div className="meetings-search-box">
              <Search size={14} color="#64748B" />
              <input
                type="text"
                placeholder="Search meeting, title, topic or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="meetings-search-input"
              />
            </div>
          </div>
        </>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. MAIN CONTENT: FULL MONTH VIEW vs REGULAR WEEK VIEW           */}
      {/* ============================================================== */}
      {viewMode === 'MONTH' ? (
        <section className="month-desk-container">
          {/* Month Controller Strip */}
          <div className="month-nav-header">
            <div className="month-nav-left">
              <div>
                <h3 className="month-main-title">
                  <CalendarDays size={22} color="#ff914d" />
                  <span>{monthBreakdown?.month_name || 'October 2026'} Master Executive Schedule</span>
                </h3>
                <div className="month-date-sub">
                  Month-at-a-Glance • {monthBreakdown?.total_meetings || 0} Total Scheduled Meetings across {monthBreakdown?.total_weeks || 0} Calendar Weeks
                </div>
              </div>
            </div>

            <div className="month-nav-right">
              <span className="month-pill-counter">
                {monthBreakdown?.total_meetings || 0} Meetings Scheduled
              </span>

              <button
                onClick={handleRegenerateMonth}
                disabled={isSubmitting}
                className="action-pill-btn btn-sync"
                title="Synchronize and pre-schedule all weeks for this month"
              >
                <Sparkles size={13} />
                <span>Resync Month</span>
              </button>

              <button
                onClick={() => {
                  playMechanicalClick();
                  setViewMode('WEEK');
                }}
                className="action-pill-btn btn-month-view"
                title="Switch back to regular week view"
              >
                <ArrowLeft size={13} />
                <span>Back to Week View</span>
              </button>
            </div>
          </div>

          {/* ⭐ Spotlight: Monthly OM & FM Half-Day Assembly */}
          {monthBreakdown?.monthly_assembly && (
            <div className="month-spotlight-card">
              <div className="spotlight-top-strip">
                <span className="spotlight-badge">⭐ SPECIAL MONTHLY ASSEMBLY • HALF DAY (5 HOURS)</span>
                <span className="spotlight-timing-pill">
                  <Clock size={13} />
                  <span>{monthBreakdown.monthly_assembly.time}</span>
                </span>
              </div>

              <div className="spotlight-content">
                <h4 className="spotlight-title">{monthBreakdown.monthly_assembly.title}</h4>
                <p className="spotlight-desc">
                  Half-Day Operations Leadership Assembly with all site OM & FM heads across VFMS operations. Comprehensive site review, resource allocation, and direct MD executive orders.
                </p>
              </div>

              <div className="spotlight-bottom-bar">
                <div className="spotlight-meta-group">
                  <span className="spotlight-meta-item">
                    <Calendar size={13} color="#0D9488" />
                    <strong>Date:</strong> {monthBreakdown.monthly_assembly.date} (Saturday)
                  </span>
                  <span className="spotlight-meta-item">
                    <Users size={13} color="#0D9488" />
                    <strong>Attendees:</strong> All OM & FM site heads + GMs + MD
                  </span>
                  <span className="spotlight-meta-item">
                    <span className="status-badge-chip chip-info">{monthBreakdown.monthly_assembly.status || 'SCHEDULED'}</span>
                  </span>
                </div>

                <div className="spotlight-actions">
                  <button
                    onClick={() => handleOpenInspect(monthBreakdown.monthly_assembly)}
                    className="btn-action-pill inspect"
                    title="Log MD Directives & Feedback"
                  >
                    <Edit3 size={12} />
                    <span>MD Directives</span>
                  </button>
                  <button
                    onClick={() => handleOpenReschedule(monthBreakdown.monthly_assembly)}
                    className="btn-action-pill reschedule"
                    title="Reschedule Monthly Half-Day Assembly"
                  >
                    <CalendarDays size={12} />
                    <span>Reschedule Half-Day</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Weeks Stack */}
          <div className="month-weeks-stack">
            {monthBreakdown?.weeks && monthBreakdown.weeks.length > 0 ? (
              monthBreakdown.weeks.map((w) => (
                <div key={w.week_index} className={`month-week-block ${w.is_current ? 'current-week' : ''}`}>
                  <div className="month-week-header">
                    <div className="week-header-left">
                      <span className="week-header-title">{w.label}: {w.date_range}</span>
                      {w.is_current && <span className="current-week-tag">CURRENT ACTIVE WEEK</span>}
                      <span className="week-meetings-count-pill">{w.total_meetings} Meetings</span>
                    </div>

                    <button
                      onClick={() => jumpToWeekView(w.monday)}
                      className="jump-to-week-btn"
                      title="Switch to detailed Week View for this week"
                    >
                      <span>Open in Week View</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="month-week-table-wrap">
                    <table className="meetings-table">
                      <thead>
                        <tr>
                          <th style={{ width: '120px', textAlign: 'center' }}>Day & Date</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Time Window</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Company</th>
                          <th style={{ textAlign: 'center' }}>Department & Title</th>
                          <th style={{ width: '110px', textAlign: 'center' }}>Priority</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                          <th style={{ width: '90px', textAlign: 'center' }}>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.meetings && w.meetings.length > 0 ? (
                          w.meetings.slice().sort(compareMeetingsByDateTime).map((mtg) => {
                            const d = new Date(mtg.date);
                            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                            const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                            const isHigh = (mtg.md_priority || 'NORMAL').toUpperCase() === 'HIGH';
                            const totalTop = mtg.topics?.length || 0;
                            const completedTop = mtg.topics?.filter((t) => t.completed)?.length || 0;
                            const topPct = totalTop > 0 ? Math.round((completedTop / totalTop) * 100) : 0;

                            return (
                              <tr key={mtg.id} className={mtg.is_half_day ? 'half-day-row' : ''}>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="font-bold text-dark">{dayName}</div>
                                  <div className="text-muted" style={{ fontSize: '11px' }}>{dateStr}</div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                    <span className="font-semibold text-cyan">{mtg.time}</span>
                                    {mtg.is_half_day && (
                                      <span className="half-day-pill" title="Half-Day Executive Assembly">
                                        HALF DAY
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {renderCompanyBadge(mtg.company)}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div className="font-bold text-dark" title={mtg.title}>
                                    {mtg.department || mtg.title}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {isHigh ? (
                                      <span className="status-badge-chip chip-danger">HIGH</span>
                                    ) : (
                                      <span className="status-badge-chip chip-normal">Normal</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    {mtg.status === 'COMPLETED' ? (
                                      <span className="status-badge-chip chip-success">Completed</span>
                                    ) : mtg.status === 'POSTPONED' ? (
                                      <span className="status-badge-chip chip-warning">⏳ Postponed</span>
                                    ) : (
                                      <span className="status-badge-chip chip-info">{mtg.status || 'Scheduled'}</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <button
                                      onClick={() => {
                                        playMechanicalClick();
                                        openMeetingDesk(mtg.id);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="btn-view-details"
                                      title="Open Full-Page Executive Meeting Desk & Briefing Dossier"
                                    >
                                      <Eye size={13} />
                                      <span>View</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="table-empty-row">No meetings scheduled for this week.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="table-empty-row">No weekly breakdown available. Click Resync Month to schedule.</div>
            )}
          </div>
        </section>
      ) : (
        <main className="meetings-table-container">
          <div className="meetings-table-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {viewMode === 'TODAY'
                ? `TODAY'S EXECUTIVE REVIEW SCHEDULE (${filteredMeetings.length} SESSIONS ON ${formattedDate.toUpperCase()})`
                : isPastWeek
                ? `PAST WEEK REVIEWS ARCHIVE (${filteredMeetings.length} MEETINGS IN ${weekDateRangeLabel.toUpperCase()})`
                : isCurrentWeek
                ? `CURRENT ACTIVE WEEK SCHEDULE (${filteredMeetings.length} MEETINGS IN ${weekDateRangeLabel.toUpperCase()})`
                : `UPCOMING WEEK SCHEDULE (${filteredMeetings.length} MEETINGS IN ${weekDateRangeLabel.toUpperCase()})`}
            </span>
            {viewMode === 'TODAY' && (
              <span className="past-week-indicator" style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}>
                Live Daily Track
              </span>
            )}
            {isPastWeek && viewMode === 'WEEK' && (
              <span className="past-week-indicator">Completed Historical Records</span>
            )}
          </div>

          <table className="audit-modern-table meetings-table">
            <thead>
              <tr>
                <th style={{ width: '130px', textAlign: 'center' }}>Day & Date</th>
                <th style={{ width: '160px', textAlign: 'center' }}>Time Window</th>
                <th style={{ width: '150px', textAlign: 'center' }}>Company</th>
                <th style={{ textAlign: 'center' }}>Meeting Title</th>
                <th style={{ width: '135px', textAlign: 'center' }} title="Active priority for this session (inherited from previous review directive)">Active Priority</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeetings.length > 0 ? (
                filteredMeetings.map((mtg) => {
                  const mtgDate = new Date(mtg.date);
                  const dayName = mtgDate.toLocaleDateString('en-US', { weekday: 'short' });
                  const dateStr = mtgDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                  const totalTop = mtg.topics?.length || 0;
                  const completedTop = mtg.topics?.filter((t) => t.completed)?.length || 0;
                  const topPct = totalTop > 0 ? Math.round((completedTop / totalTop) * 100) : 0;

                  const isHigh = (mtg.md_priority || '').toUpperCase() === 'HIGH';

                  return (
                    <tr key={mtg.id} className={isHigh ? 'row-high-priority' : ''}>
                      {/* Day & Date */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="font-bold text-dark">{dayName}</div>
                        <div className="text-muted" style={{ fontSize: '11px' }}>{dateStr}</div>
                      </td>

                      {/* Time Window */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          <span className="font-semibold text-cyan">{mtg.time}</span>
                          {mtg.is_half_day && (
                            <span className="half-day-pill" title="Half-Day Executive Assembly">
                              HALF DAY
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Company */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {renderCompanyBadge(mtg.company)}
                        </div>
                      </td>

                      {/* Title / Department */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="font-bold text-dark" title={mtg.title}>
                          {mtg.department || mtg.title}
                        </div>
                      </td>

                      {/* Active Priority */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                          {isHigh ? (
                            <span className="status-badge-chip chip-danger" title="High Priority Review - prioritized schedule position">
                              ⚡ HIGH
                            </span>
                          ) : (
                            <span className="status-badge-chip chip-normal" title="Normal Priority Review">
                              Normal
                            </span>
                          )}
                          {mtg.md_priority_notes && (
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#64748B',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={mtg.md_priority_notes}
                            >
                              {mtg.md_priority_notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {mtg.status === 'COMPLETED' ? (
                            <span className="status-badge-chip chip-success">Completed</span>
                          ) : mtg.status === 'POSTPONED' ? (
                            <span className="status-badge-chip chip-warning">⏳ Postponed</span>
                          ) : (
                            <span className="status-badge-chip chip-info">{mtg.status || 'Scheduled'}</span>
                          )}
                        </div>
                      </td>

                      {/* View Action */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              playMechanicalClick();
                              openMeetingDesk(mtg.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="btn-view-details"
                            title="Open Full-Page Executive Meeting Desk & Briefing Dossier"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="table-empty-row">
                    {viewMode === 'TODAY' ? (
                      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                          No review meetings scheduled for today ({formattedDate}).
                        </span>
                        <span style={{ fontSize: '13px', color: '#64748B' }}>
                          Executive calendar is clear today. You can view the full weekly schedule or upcoming reviews.
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewMode('WEEK')}
                          className="action-pill-btn btn-month-view"
                          style={{ marginTop: '8px' }}
                        >
                          <Calendar size={13} />
                          <span>Switch to Week View</span>
                        </button>
                      </div>
                    ) : meetings.length === 0 ? (
                      <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                          Loading or synchronizing meetings schedule...
                        </span>
                        <button
                          type="button"
                          onClick={() => loadMeetings(true)}
                          className="action-pill-btn btn-month-view"
                          style={{ marginTop: '4px' }}
                        >
                          <RotateCcw size={13} />
                          <span>Refresh Schedule</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span>No meetings scheduled for this week matching selected filters.</span>
                        {(selectedCompany !== 'ALL' || selectedDay !== 'ALL' || selectedPriority !== 'ALL' || selectedStatus !== 'ALL' || searchQuery) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCompany('ALL');
                              setSelectedDay('ALL');
                              setSelectedPriority('ALL');
                              setSelectedStatus('ALL');
                              setSearchQuery('');
                            }}
                            className="btn-retry"
                            style={{ fontSize: '12px', padding: '4px 10px', marginTop: '4px' }}
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      )}
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="checklist-toast">
          <Check size={15} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. INSPECT & MD DIRECTIVES MODAL                               */}
      {/* ============================================================== */}
      {inspectMeeting && (
        <div className="audit-modal-backdrop" onClick={() => setInspectMeeting(null)}>
          <div className="audit-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="modal-badge-tag cyan">{inspectMeeting.company} REVIEW</span>
                  {inspectMeeting.is_half_day && (
                    <span className="half-day-pill">HALF DAY ASSEMBLY</span>
                  )}
                  <span className={`status-badge-chip ${inspectMeeting.status === 'COMPLETED' ? 'chip-success' : 'chip-info'}`}>
                    {inspectMeeting.status || 'Scheduled'}
                  </span>
                </div>
                <h3 className="modal-title">{inspectMeeting.title}</h3>
                <p className="modal-subtitle">
                  {inspectMeeting.date} • {inspectMeeting.time}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {inspectMeeting.status !== 'COMPLETED' ? (
                  <>
                    <button
                      onClick={() => {
                        const m = inspectMeeting;
                        setInspectMeeting(null);
                        handleOpenReschedule(m);
                      }}
                      className="btn-modal-action reschedule"
                      title="Reschedule Meeting Date/Time"
                    >
                      <CalendarDays size={13} />
                      <span>Reschedule</span>
                    </button>
                    <button
                      onClick={() => {
                        const m = inspectMeeting;
                        setInspectMeeting(null);
                        handleOpenSwap(m);
                      }}
                      className="btn-modal-action swap"
                      title="Swap Schedule Slot"
                    >
                      <ArrowRightLeft size={13} />
                      <span>Swap</span>
                    </button>
                  </>
                ) : (
                  <span className="status-badge-chip chip-success" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600 }}>
                    🔒 Completed & Locked
                  </span>
                )}
                <button
                  className="modal-close-btn"
                  onClick={() => setInspectMeeting(null)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="audit-modal-body" style={{ maxHeight: 'calc(85vh - 160px)' }}>
              {/* 1. Meeting Overview Grid */}
              <div className="modal-overview-grid">
                <div className="modal-overview-card">
                  <div className="modal-overview-icon" style={{ color: '#ff914d' }}>
                    <Clock size={16} />
                  </div>
                  <div className="modal-overview-content">
                    <span className="modal-overview-label">Time Window</span>
                    <span className="modal-overview-val">{inspectMeeting.time}</span>
                  </div>
                </div>

                <div className="modal-overview-card">
                  <div className="modal-overview-icon" style={{ color: '#4F46E5' }}>
                    <Building size={16} />
                  </div>
                  <div className="modal-overview-content">
                    <span className="modal-overview-label">Department</span>
                    <span className="modal-overview-val">{inspectMeeting.department || inspectMeeting.company}</span>
                  </div>
                </div>

                <div className="modal-overview-card">
                  <div className="modal-overview-icon" style={{ color: '#059669' }}>
                    <Calendar size={16} />
                  </div>
                  <div className="modal-overview-content">
                    <span className="modal-overview-label">Schedule Mode</span>
                    <span className="modal-overview-val">
                      {inspectMeeting.is_half_day ? 'Monthly Assembly' : 'Weekly Review'}
                    </span>
                  </div>
                </div>

                <div className="modal-overview-card">
                  <div className="modal-overview-icon" style={{ color: '#D97706' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="modal-overview-content">
                    <span className="modal-overview-label">Agenda Scope</span>
                    <span className="modal-overview-val">
                      {inspectTopics.length > 0 ? `${inspectTopics.length} Specific Topics` : 'Strategic Discussion'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Agenda Topics (Only when specific checklist topics exist) */}
              {inspectTopics.length > 0 ? (
                <>
                  <div className="modal-quick-stats-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>
                        Agenda Topics Coverage: {inspectTopics.filter((t) => t.completed).length} of {inspectTopics.length} Completed
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#ff914d' }}>
                        {Math.round((inspectTopics.filter((t) => t.completed).length / inspectTopics.length) * 100)}%
                      </span>
                    </div>
                    <div className="mini-prog-track" style={{ height: '7px', background: '#E2E8F0', borderRadius: '4px' }}>
                      <div
                        className="mini-prog-fill"
                        style={{
                          width: `${Math.round((inspectTopics.filter((t) => t.completed).length / inspectTopics.length) * 100)}%`,
                          background: '#ff914d',
                          height: '100%',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>

                  <div className="inspect-topics-block">
                    <div className="inspect-section-title">
                      <span>DEPARTMENT AGENDA TOPICS ({inspectTopics.filter((t) => t.completed).length}/{inspectTopics.length} COVERED)</span>
                    </div>

                    <div className="topics-checklist-grid">
                      {inspectTopics.map((topic, idx) => (
                        <label
                          key={topic.id || idx}
                          className={`topic-check-item ${topic.completed ? 'checked' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={!!topic.completed}
                            onChange={() => handleToggleTopic(topic.id)}
                            className="topic-checkbox"
                          />
                          <div className="topic-text-content">
                            <span className="topic-num">{idx + 1}.</span>
                            {topic.scope && <span className="topic-scope-tag">{topic.scope}</span>}
                            <span className="topic-title">{topic.title}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="inspect-no-topics-card">
                  <div className="no-topics-icon-wrap">
                    <Briefcase size={20} color="#ff914d" />
                  </div>
                  <div className="no-topics-text-wrap">
                    <div className="no-topics-title">Executive Strategic & Operations Review</div>
                    <div className="no-topics-desc">
                      This session is dedicated to strategic operational alignment, high-level business objectives, team KPIs, and client acquisition reviews directly with the Managing Director.
                    </div>
                  </div>
                </div>
              )}

              {/* MD Feedback & Directives */}
              <div className="inspect-directives-block">
                <div className="inspect-section-title">
                  <span>MANAGING DIRECTOR DIRECTIVES & INSTRUCTIONS</span>
                </div>
                <textarea
                  value={inspectFeedback}
                  onChange={(e) => setInspectFeedback(e.target.value)}
                  placeholder="Record your executive orders, feedback and action items for the department heads..."
                  rows={4}
                  className="audit-directive-textarea"
                  style={{ width: '100%', marginBottom: '14px' }}
                />

                <div className="priority-control-row">
                  <div className="priority-input-group">
                    <CustomSelect
                      label="Next Week Priority:"
                      value={inspectPriority}
                      options={INSPECT_PRIORITY_OPTIONS}
                      onChange={setInspectPriority}
                    />
                  </div>

                  <div className="priority-input-group" style={{ flex: 1 }}>
                    <label>Priority Notes / Reason:</label>
                    <input
                      type="text"
                      value={inspectPriorityNotes}
                      onChange={(e) => setInspectPriorityNotes(e.target.value)}
                      placeholder="e.g. Must close 5 admin vacancies..."
                      className="imprest-search-input"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer-bar" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setInspectMeeting(null)}
                className="btn-retry"
              >
                Cancel
              </button>
              {inspectMeeting.status !== 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => handleSaveInspectDirectives('COMPLETED')}
                  disabled={isSubmitting}
                  className="audit-directive-submit-btn"
                  style={{ background: '#10B981', color: '#fff' }}
                >
                  <CheckCircle2 size={14} />
                  <span>Mark Completed & Lock</span>
                </button>
              )}
              <button
                onClick={() => handleSaveInspectDirectives()}
                disabled={isSubmitting}
                className="audit-directive-submit-btn"
              >
                <Check size={14} />
                <span>{isSubmitting ? 'Saving...' : 'Save MD Directives'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. RESCHEDULE MODAL                                            */}
      {/* ============================================================== */}
      {rescheduleMeeting && (
        <div className="audit-modal-backdrop" onClick={() => setRescheduleMeeting(null)}>
          <div className="audit-modal-container" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge-tag amber">RESCHEDULE</span>
                <h3 className="modal-title">Reschedule Meeting</h3>
                <p className="modal-subtitle">{rescheduleMeeting.title}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setRescheduleMeeting(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="audit-modal-body" style={{ minHeight: '340px' }}>
              <div className="modal-form-group">
                <CustomDatePicker
                  label="New Meeting Date (Mon, Tue, Wed, Sat):"
                  value={rescheduleDate}
                  onChange={setRescheduleDate}
                />
              </div>

              <div className="modal-form-group">
                <label>New Time Window:</label>
                <input
                  type="text"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  placeholder="e.g. 11:00 AM - 01:00 PM"
                  className="imprest-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="modal-form-group">
                <label>Reason for Rescheduling:</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Executive travel, client review..."
                  className="imprest-search-input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* OM & FM Assembly Reschedule Policy (User explicit requirement) */}
              <div className="modal-form-group">
                <label>OM & FM Assembly Policy (Saturday 08:00 AM):</label>
                <div className="om-policy-selection-wrap">
                  <div
                    className={`om-policy-card ${!rescheduleOmFm ? 'active' : ''}`}
                    onClick={() => setRescheduleOmFm(false)}
                  >
                    <div className="om-policy-radio">
                      {!rescheduleOmFm && <div className="om-radio-dot" />}
                    </div>
                    <div className="om-policy-info">
                      <span className="om-policy-title">Exclude OM & FM Meeting (Default)</span>
                      <span className="om-policy-desc">
                        Reschedule this meeting only. Saturday 08:00 AM OM & FM Assembly remains on its scheduled slot.
                      </span>
                    </div>
                  </div>

                  <div
                    className={`om-policy-card ${rescheduleOmFm ? 'active' : ''}`}
                    onClick={() => setRescheduleOmFm(true)}
                  >
                    <div className="om-policy-radio">
                      {rescheduleOmFm && <div className="om-radio-dot" />}
                    </div>
                    <div className="om-policy-info">
                      <span className="om-policy-title">Also Reschedule OM & FM Assembly</span>
                      <span className="om-policy-desc">
                        Cascade and move Saturday's 08:00 AM OM & FM Assembly to match this new week's Saturday.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer-bar">
              <button
                onClick={() => setRescheduleMeeting(null)}
                className="btn-retry"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReschedule}
                disabled={isSubmitting}
                className="audit-directive-submit-btn"
              >
                <span>{isSubmitting ? 'Updating...' : 'Confirm Reschedule'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. SWAP MODAL                                                  */}
      {/* ============================================================== */}
      {swapMeetingA && (
        <div className="audit-modal-backdrop" onClick={() => setSwapMeetingA(null)}>
          <div className="audit-modal-container" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge-tag cyan">SWAP SCHEDULE SLOTS</span>
                <h3 className="modal-title">Swap Meeting Slots</h3>
                <p className="modal-subtitle">Exchange time slot with another meeting</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSwapMeetingA(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="audit-modal-body" style={{ minHeight: '340px' }}>
              <div className="modal-form-group">
                <label>Source Meeting A:</label>
                <div className="font-bold text-dark">{swapMeetingA.title}</div>
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  {swapMeetingA.date} • {swapMeetingA.time}
                </div>
              </div>

              <div className="modal-form-group">
                <CustomSelect
                  label="Swap With Target Meeting B:"
                  value={swapMeetingIdB}
                  placeholder="Select target meeting to swap with..."
                  options={meetings
                    .filter((m) => m.id !== swapMeetingA.id && m.status !== 'COMPLETED')
                    .slice()
                    .sort(compareMeetingsByDateTime)
                    .map((m) => ({
                      value: m.id,
                      label: `${m.title} (${m.date} • ${m.time})`
                    }))}
                  onChange={setSwapMeetingIdB}
                />
              </div>

              <div className="modal-form-group">
                <label>Swap Reason:</label>
                <input
                  type="text"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  placeholder="e.g. Schedule priority alignment..."
                  className="imprest-search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="modal-footer-bar">
              <button
                onClick={() => setSwapMeetingA(null)}
                className="btn-retry"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitSwap}
                disabled={isSubmitting || !swapMeetingIdB}
                className="audit-directive-submit-btn"
              >
                <span>{isSubmitting ? 'Swapping...' : 'Confirm Swap'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 8. MONTHLY ASSEMBLY MODAL (HALF DAY SATURDAY)                  */}
      {/* ============================================================== */}
      {isAssemblyModalOpen && (
        <div className="audit-modal-backdrop" onClick={() => setIsAssemblyModalOpen(false)}>
          <div className="audit-modal-container" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge-tag emerald">MONTHLY ASSEMBLY • HALF DAY</span>
                <h3 className="modal-title">Schedule OM & FM Half-Day Assembly</h3>
                <p className="modal-subtitle">Comprehensive half-day operations assembly (08:30 AM - 01:30 PM)</p>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAssemblyModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="audit-modal-body" style={{ minHeight: '340px' }}>
              <div className="modal-form-group">
                <CustomDatePicker
                  label="Select Saturday Date:"
                  value={assemblyDate}
                  onChange={setAssemblyDate}
                  onlySaturdays={true}
                />
              </div>

              <div className="modal-form-group">
                <label>Assembly Timing (Half Day Window):</label>
                <div className="font-bold text-dark" style={{ color: '#0F766E', fontSize: '14px' }}>
                  08:30 AM - 01:30 PM (Half Day Session • 5 Hours)
                </div>
              </div>
            </div>

            <div className="modal-footer-bar">
              <button
                onClick={() => setIsAssemblyModalOpen(false)}
                className="btn-retry"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssembly}
                disabled={isSubmitting || !assemblyDate}
                className="audit-directive-submit-btn"
              >
                <span>{isSubmitting ? 'Scheduling...' : 'Schedule Half-Day Assembly'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
