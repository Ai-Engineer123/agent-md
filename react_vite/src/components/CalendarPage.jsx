import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Sparkles,
  Clock,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

export const CalendarPage = ({ onBack, onOpenChecklist, onOpenMeetings, onOpenDayDossier, voiceEnabled, onToggleVoice, currentTime }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [hoveredDate, setHoveredDate] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const leaveTimerRef = useRef(null);

  // Smooth hover handlers with grace period
  const handleCellMouseEnter = (dateStr) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHoveredDate(dateStr);
  };

  const handleCellMouseLeave = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setHoveredDate(null);
    }, 240); // 240ms bridge allows arrow cursor to comfortably move into popover
  };

  const handlePopoverMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
    }
    leaveTimerRef.current = setTimeout(() => {
      setHoveredDate(null);
    }, 200);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // Fetch month summary from backend API
  const fetchMonth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar/month-summary?year=${year}&month=${month}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMonthData(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load month calendar:', err);
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  const handlePrevMonth = () => {
    playMechanicalClick();
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    playMechanicalClick();
    setCurrentDate(new Date(year, month, 1));
  };

  const handleToday = () => {
    playSuccessChime();
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Python calendar.monthrange: first_weekday is 0=Monday ... 6=Sunday
  const daysInMonth = monthData?.days_in_month || new Date(year, month, 0).getDate();
  const startOffset = monthData?.first_weekday !== undefined 
    ? monthData.first_weekday 
    : (new Date(year, month - 1, 1).getDay() + 6) % 7;

  const daysMap = monthData?.days || {};

  return (
    <div className="calendar-page-viewport">
      {/* 1. TOP EXECUTIVE HEADER */}
      <header className="cal-header-hud">
        <div className="cal-hud-left">
          {onBack && (
            <button onClick={onBack} className="cal-back-btn" title="Back to Command Deck">
              <ArrowLeft size={16} />
              <span>Command Deck</span>
            </button>
          )}
          <div className="cal-brand-pill">
            <CalendarIcon size={16} color="#ff914d" />
            <span className="cal-brand-title">Operations & Work Calendar</span>
          </div>
        </div>

        <div className="cal-hud-right">
          <div className="cal-month-stepper">
            <button onClick={handlePrevMonth} className="btn-month-nav" title="Previous Month">
              <ChevronLeft size={16} />
            </button>
            <span className="cal-month-label">{monthNames[month - 1]} {year}</span>
            <button onClick={handleNextMonth} className="btn-month-nav" title="Next Month">
              <ChevronRight size={16} />
            </button>
            <button onClick={handleToday} className="btn-today-pill" title="Jump to Today">
              Today
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE: FULL-WIDTH 7-COLUMN CALENDAR GRID */}
      <div className="cal-workspace-layout">
        <section className="cal-grid-card">
          <div className="cal-card-inner-header">
            <div>
              <h2 className="cal-grid-title">{monthNames[month - 1]} {year} Operations Horizon</h2>
              <span className="cal-grid-instruction">Monthly Operational Checklist Verification & Company Review Sessions</span>
            </div>
          </div>

          <div className="cal-weekdays-row">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div key={day} className="cal-weekday-head">{day}</div>
            ))}
          </div>

          <div className="cal-cells-grid">
            {/* Previous month filler days */}
            {(() => {
              const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
              return Array.from({ length: startOffset }).map((_, idx) => {
                const dayNum = prevMonthLastDay - startOffset + idx + 1;
                return (
                  <div key={`prev-${idx}`} className="cal-day-cell cal-filler-cell">
                    <div className="cal-day-cell-top">
                      <span className="cal-filler-num">{dayNum}</span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Current Month Active Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayData = daysMap[dateStr];
              const isSelected = selectedDateStr === dateStr;
              const isToday = dayData?.is_today;
              const hasChecklist = dayData?.checklist?.has_record;
              const meetings = dayData?.meetings || [];

              const colIndex = (startOffset + idx) % 7;
              const rowIndex = Math.floor((startOffset + idx) / 7);
              const popoverPosClass = rowIndex <= 1 ? 'pos-below' : 'pos-above';
              const popoverAlignClass = colIndex <= 1 ? 'align-left' : colIndex >= 5 ? 'align-right' : 'align-center';

              return (
                <div
                  key={dateStr}
                  onMouseEnter={() => handleCellMouseEnter(dateStr)}
                  onMouseLeave={handleCellMouseLeave}
                  onClick={() => {
                    playMechanicalClick();
                    setSelectedDateStr(dateStr);
                    if (onOpenDayDossier) {
                      onOpenDayDossier(dateStr);
                    }
                  }}
                  className={`cal-day-cell ${isSelected ? 'cal-cell-selected' : ''} ${isToday ? 'cal-cell-today' : ''}`}
                >
                  {/* Cell Top Header */}
                  <div className="cal-day-cell-top">
                    <span className={`cal-day-number ${isToday ? 'badge-today-num' : ''}`}>
                      {dayNum}
                    </span>
                    {isToday && <span className="today-chip">TODAY</span>}
                  </div>

                  {/* Cell Content: Checklist Counts (Single-Line) + Meeting Count Company-Wise */}
                  <div className="cal-day-cell-content">
                    {/* 1. Daily Routine Checklist Counts: Manual & AI Verified */}
                    {hasChecklist && (
                      <div className="cal-chk-pill">
                        <span className="chk-ai" title={`AI Verified: ${dayData?.checklist?.ai_verified_count || 0}`}>
                          <Sparkles size={9} /> AI: {dayData?.checklist?.ai_verified_count || 0}
                        </span>
                        <span className="chk-divider">·</span>
                        <span className="chk-man" title={`Manual Verified: ${dayData?.checklist?.manual_verified_count || 0}`}>
                          <ClipboardCheck size={9} /> Man: {dayData?.checklist?.manual_verified_count || 0}
                        </span>
                      </div>
                    )}

                    {/* 2. Meeting Count Company-Wise */}
                    {meetings.length > 0 && (() => {
                      const coCounts = {};
                      meetings.forEach((m) => {
                        const c = (m.company || '').toUpperCase();
                        if (c) coCounts[c] = (coCounts[c] || 0) + 1;
                      });

                      return (
                        <div className="cal-cell-company-counts">
                          {Object.entries(coCounts).map(([cKey, cVal]) => (
                            <span
                              key={cKey}
                              className={`cal-co-count-pill pill-${cKey.toLowerCase()}`}
                              title={`${cKey}: ${cVal} ${cVal === 1 ? 'Meeting' : 'Meetings'}`}
                            >
                              {cKey}: {cVal}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* 3. Hover Popover Modal: Meeting Details & Status */}
                  {hoveredDate === dateStr && (
                    <div
                      className={`cal-hover-popover ${popoverPosClass} ${popoverAlignClass}`}
                      onMouseEnter={handlePopoverMouseEnter}
                      onMouseLeave={handlePopoverMouseLeave}
                      onClick={(e) => {
                        e.stopPropagation();
                        playMechanicalClick();
                        if (onOpenDayDossier) {
                          onOpenDayDossier(dateStr);
                        }
                      }}
                    >
                      <div className="cal-popover-header">
                        <div className="cal-popover-title">
                          <CalendarIcon size={12} color="#ff914d" />
                          <span>{dayNum} {monthNames[month - 1]} {year}</span>
                        </div>
                        <span className="cal-popover-count-badge">
                          {meetings.length} {meetings.length === 1 ? 'Meeting' : 'Meetings'}
                        </span>
                      </div>

                      <div className="cal-popover-body">
                        {meetings.length === 0 ? (
                          <div className="cal-popover-empty">
                            <Clock size={13} color="#94A3B8" />
                            <span>No meetings scheduled</span>
                          </div>
                        ) : (
                          <div className="cal-popover-meetings-list">
                            {meetings.map((m, mIdx) => {
                              const co = (m.company || 'GEN').toUpperCase();
                              const status = (m.status || 'SCHEDULED').toUpperCase();
                              return (
                                <div key={m.id || mIdx} className="cal-popover-meeting-item">
                                  <div className="popover-meeting-top-line">
                                    <span className={`popover-co-badge badge-${co.toLowerCase()}`}>
                                      {co}
                                    </span>
                                    <span className={`popover-status-badge status-${status.toLowerCase()}`}>
                                      {status === 'COMPLETED' ? 'Completed' : status === 'IN_PROGRESS' ? 'In Progress' : 'Scheduled'}
                                    </span>
                                  </div>
                                  <div className="popover-meeting-title">{m.title}</div>
                                  {m.time && (
                                    <div className="popover-meeting-time">
                                      <Clock size={10} color="#64748B" />
                                      <span>{m.time}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="cal-popover-footer">
                        <button
                          type="button"
                          className="popover-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            playMechanicalClick();
                            if (onOpenDayDossier) {
                              onOpenDayDossier(dateStr);
                            }
                          }}
                        >
                          <span>Open Full Day Dossier</span>
                          <ExternalLink size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Next month filler days to complete 7-col grid */}
            {(() => {
              const totalSoFar = startOffset + daysInMonth;
              const trailingCount = totalSoFar % 7 === 0 ? 0 : 7 - (totalSoFar % 7);
              return Array.from({ length: trailingCount }).map((_, idx) => (
                <div key={`next-${idx}`} className="cal-day-cell cal-filler-cell">
                  <div className="cal-day-cell-top">
                    <span className="cal-filler-num">{idx + 1}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </section>
      </div>
    </div>
  );
};
