import React, { useState, useEffect } from 'react';
import {
  Zap,
  Flame,
  CheckCircle2,
  ArrowLeft,
  Calendar,
  Clock,
  Building,
  AlertCircle,
  HelpCircle,
  Plus,
  Trash2,
  Save,
  CalendarDays,
  ArrowRightLeft,
  Briefcase,
  History,
  Target,
  Sparkles,
  Check,
  Pencil,
  X
} from 'lucide-react';
import { playMechanicalClick, playSuccessChime } from '../audio/soundEffects';
import { renderCompanyBadge } from './CompanyBadge';
import { CustomSelect } from './CustomSelect';

export function MeetingDeskPage({
  meetingId,
  currentUser,
  onBack,
  onMeetingUpdated,
  onOpenReschedule,
  onOpenSwap
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dossier, setDossier] = useState(null);

  // Form states
  const [todayTopics, setTodayTopics] = useState([]);
  const [openingQueries, setOpeningQueries] = useState([]);
  const [mdDirectives, setMdDirectives] = useState('');
  const [nextWeekPriority, setNextWeekPriority] = useState('NORMAL');
  const [priorityNotes, setPriorityNotes] = useState('');
  const [nextMeetingQueries, setNextMeetingQueries] = useState([]);
  const [newNextQuery, setNewNextQuery] = useState('');
  const [meetingStatus, setMeetingStatus] = useState('SCHEDULED');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Dynamic Agenda States
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [editTopicTitle, setEditTopicTitle] = useState('');

  // Add dynamic topic to meeting
  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;
    playMechanicalClick();
    const title = newTopicTitle.trim();

    try {
      const res = await fetch(`/api/meetings/${meetingId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          scope: 'Specific',
          created_by: currentUser?.name || 'Managing Director'
        })
      });
      if (res.ok) {
        const data = await res.json();
        const serverTopics = data.topics || [];
        setTodayTopics((prev) => {
          const localMap = Object.fromEntries(prev.map((t) => [t.id, t.completed]));
          return serverTopics.map((t) => ({
            ...t,
            completed: localMap[t.id] !== undefined ? localMap[t.id] : t.completed
          }));
        });
        setNewTopicTitle('');
      } else {
        console.error('Failed to save agenda topic to backend API');
      }
    } catch (err) {
      console.error('Network error saving agenda topic:', err);
    }
  };

  // Start inline editing of topic
  const handleStartEditTopic = (topic) => {
    playMechanicalClick();
    setEditingTopicId(topic.id);
    setEditTopicTitle(topic.title || '');
  };

  // Cancel inline editing
  const handleCancelEditTopic = () => {
    playMechanicalClick();
    setEditingTopicId(null);
    setEditTopicTitle('');
  };

  // Save edited topic
  const handleSaveEditTopic = async (topicId) => {
    if (!editTopicTitle.trim()) return;
    playMechanicalClick();
    const targetTopic = todayTopics.find((t) => t.id === topicId);
    const updatedCompleted = targetTopic ? targetTopic.completed : false;

    try {
      const res = await fetch(`/api/meetings/${meetingId}/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTopicTitle.trim(),
          completed: updatedCompleted
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTodayTopics(data.topics || []);
      } else {
        setTodayTopics((prev) =>
          prev.map((t) =>
            t.id === topicId
              ? { ...t, title: editTopicTitle.trim() }
              : t
          )
        );
      }
    } catch (err) {
      setTodayTopics((prev) =>
        prev.map((t) =>
          t.id === topicId
            ? { ...t, title: editTopicTitle.trim() }
            : t
        )
      );
    }
    setEditingTopicId(null);
  };

  // Delete topic from meeting
  const handleDeleteTopic = async (topicId) => {
    playMechanicalClick();
    try {
      const res = await fetch(`/api/meetings/${meetingId}/topics/${topicId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setTodayTopics(data.topics || []);
      } else {
        setTodayTopics((prev) => prev.filter((t) => t.id !== topicId));
      }
    } catch (err) {
      setTodayTopics((prev) => prev.filter((t) => t.id !== topicId));
    }
  };


  // Load meeting dossier
  useEffect(() => {
    let isMounted = true;
    async function loadDossier() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/meetings/${meetingId}/dossier`);
        if (!res.ok) throw new Error('Failed to load meeting dossier');
        const data = await res.json();
        if (isMounted) {
          setDossier(data);
          const curr = data.meeting || {};
          setTodayTopics(curr.topics || []);
          setMdDirectives(curr.md_feedback || curr.notes || '');
          setNextWeekPriority(curr.md_priority || 'NORMAL');
          setPriorityNotes(curr.md_priority_notes || '');
          setNextMeetingQueries(curr.next_meeting_queries || []);
          setMeetingStatus(curr.status || 'SCHEDULED');

          // Initialize first to ask queries
          const fta = data.first_to_ask || [];
          setOpeningQueries(fta);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadDossier();
    return () => { isMounted = false; };
  }, [meetingId]);

  // Toggle today's agenda topic
  const handleToggleTopic = async (topicId) => {
    playMechanicalClick();
    const target = todayTopics.find((t) => t.id === topicId);
    if (!target) return;
    const nextCompleted = !target.completed;

    // Optimistic UI update
    setTodayTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, completed: nextCompleted } : t))
    );

    // Persist immediately to backend
    try {
      const res = await fetch(`/api/meetings/${meetingId}/topics/${topicId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: nextCompleted,
          updated_by: currentUser?.name || 'Managing Director'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.topics) {
          setTodayTopics(data.topics);
        }
      }
    } catch (err) {
      console.error('Failed to sync topic completion to backend:', err);
    }
  };

  // Toggle opening follow-up query
  const handleToggleOpeningQuery = (queryId) => {
    playMechanicalClick();
    setOpeningQueries((prev) =>
      prev.map((q) => (q.id === queryId ? { ...q, resolved: !q.resolved } : q))
    );
  };

  // Update resolution feedback note for opening follow-up query
  const handleUpdateOpeningQueryNote = (queryId, note) => {
    setOpeningQueries((prev) =>
      prev.map((q) => (q.id === queryId ? { ...q, resolution_note: note } : q))
    );
  };

  // Add next meeting query
  const handleAddNextQuery = (e) => {
    e.preventDefault();
    if (!newNextQuery.trim()) return;
    playMechanicalClick();
    setNextMeetingQueries((prev) => [
      ...prev,
      { id: `nq_${Date.now()}`, question: newNextQuery.trim(), resolved: false }
    ]);
    setNewNextQuery('');
  };

  // Remove next meeting query
  const handleRemoveNextQuery = (queryId) => {
    playMechanicalClick();
    setNextMeetingQueries((prev) => prev.filter((q) => q.id !== queryId));
  };

  // Save all directives, follow-ups, and mark as completed in one unified action
  const handleSaveAll = async (newStatus = 'COMPLETED') => {
    try {
      setIsSaving(true);
      playMechanicalClick();
      const targetStatus = newStatus || 'COMPLETED';
      const payload = {
        md_feedback: mdDirectives,
        topics_progress: todayTopics,
        status: targetStatus,
        md_priority: nextWeekPriority,
        md_priority_notes: priorityNotes,
        next_meeting_queries: nextMeetingQueries,
        first_to_ask: openingQueries,
        updated_by: currentUser?.name || 'Managing Director'
      };

      // Instant local optimistic update
      setMeetingStatus(targetStatus);
      if (dossier && dossier.meeting) {
        dossier.meeting.status = targetStatus;
        dossier.meeting.md_priority = nextWeekPriority;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Instant parent schedule update
      if (onMeetingUpdated) {
        onMeetingUpdated({
          id: meetingId,
          status: targetStatus,
          md_priority: nextWeekPriority,
          md_priority_notes: priorityNotes,
          md_feedback: mdDirectives,
        });
      }

      const res = await fetch(`/api/meetings/${meetingId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save meeting directives');
      playSuccessChime();
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="desk-loading-screen">
        <div className="desk-loading-spinner" />
        <p className="desk-loading-text">Loading Executive Meeting Dossier...</p>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="desk-error-screen">
        <AlertCircle size={32} color="#EF4444" />
        <h3>Unable to load meeting dossier</h3>
        <p>{error || 'Meeting not found'}</p>
        <button onClick={onBack} className="desk-back-btn">
          <ArrowLeft size={16} />
          <span>Return to Meetings Calendar</span>
        </button>
      </div>
    );
  }

  const { meeting, previous_meeting } = dossier;
  const isHighPriority = (meeting.md_priority || '').toUpperCase() === 'HIGH';
  const totalTopics = todayTopics.length;
  const completedTopics = todayTopics.filter((t) => t.completed).length;
  const topicPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const resolvedQueriesCount = openingQueries.filter((q) => q.resolved).length;

  return (
    <div className="meeting-desk-page-wrapper">
      {/* 1. TOP HEADER & NAVIGATION */}
      <header className="desk-header-bar">
        <div className="desk-header-left">
          <button onClick={onBack} className="desk-back-nav-btn" title="Back to Schedule Table">
            <ArrowLeft size={16} />
            <span>Back to Meetings Schedule</span>
          </button>
          <div className="desk-breadcrumbs">
            <span>Executive Desk</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-active">{meeting.company}</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-title">{meeting.title}</span>
          </div>
        </div>

        <div className="desk-header-actions">
          {currentUser && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#334155'
              }}
              title={`Logged in as ${currentUser.name}`}
            >
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: currentUser.badgeColor || '#ff914d',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 800
                }}
              >
                {currentUser.initials || 'MD'}
              </span>
              <span>{currentUser.name}</span>
            </div>
          )}

          {meetingStatus !== 'COMPLETED' ? (
            <>
              <button
                onClick={() => onOpenReschedule(meeting)}
                className="desk-action-btn reschedule"
                title="Reschedule Date/Time Slot"
              >
                <CalendarDays size={14} />
                <span>Reschedule Slot</span>
              </button>
              <button
                onClick={() => onOpenSwap(meeting)}
                className="desk-action-btn swap"
                title="Swap Schedule with another meeting"
              >
                <ArrowRightLeft size={14} />
                <span>Swap Slot</span>
              </button>
            </>
          ) : (
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', background: '#ECFDF5', padding: '6px 12px', borderRadius: '6px', border: '1px solid #A7F3D0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              🔒 Completed & Locked
            </span>
          )}
          <button
            onClick={() => handleSaveAll('COMPLETED')}
            disabled={isSaving}
            className={`desk-action-btn primary ${saveSuccess ? 'success' : ''}`}
          >
            {saveSuccess ? (
              <>
                <Check size={15} />
                <span>Saved & Synchronized!</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                <span>{isSaving ? 'Saving...' : (meetingStatus === 'COMPLETED' ? 'Update Directives' : 'Save & Complete Review')}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. MEETING TITLE BANNER */}
      <section className="desk-banner-card">
        <div className="desk-banner-top-row">
          <div className="desk-banner-tags">
            {renderCompanyBadge(meeting.company)}
            {meeting.is_half_day && (
              <span className="desk-halfday-badge">HALF DAY ASSEMBLY</span>
            )}
            <span className={`status-badge-chip ${meeting.status === 'COMPLETED' ? 'chip-success' : 'chip-info'}`}>
              {meeting.status || 'Scheduled'}
            </span>
            {isHighPriority ? (
              <span className="status-badge-chip chip-danger" title="Active review priority (inherited from previous review cycle)">
                ⚡ ACTIVE: HIGH PRIORITY
              </span>
            ) : (
              <span className="status-badge-chip chip-normal" title="Active review priority (standard review cycle)">
                ACTIVE: NORMAL
              </span>
            )}
          </div>
          <div className="desk-date-slot-pill">
            <Calendar size={14} color="#ff914d" />
            <span>{meeting.date}</span>
            <span className="pill-dot">•</span>
            <Clock size={14} color="#ff914d" />
            <span>{meeting.time}</span>
          </div>
        </div>

        <h1 className="desk-main-title">{meeting.title}</h1>
        <p className="desk-subtitle">
          {meeting.department ? `${meeting.department} Department • ` : ''}
          Executive Performance Review with the Managing Director
        </p>

        {/* 4-Stat Overview Bar */}
        <div className="desk-overview-metrics">
          <div className="desk-metric-card">
            <span className="metric-label">ORGANIZATION</span>
            <span className="metric-val">{meeting.company} — {meeting.department || 'Executive'}</span>
          </div>
          <div className="desk-metric-card">
            <span className="metric-label">TIME WINDOW</span>
            <span className="metric-val">{meeting.time}</span>
          </div>
          <div className="desk-metric-card">
            <span className="metric-label">SCHEDULE TYPE</span>
            <span className="metric-val">{meeting.is_half_day ? 'Monthly Assembly (Half Day)' : 'Standard Weekly Review'}</span>
          </div>
          <div className="desk-metric-card">
            <span className="metric-label">AGENDA SCOPE</span>
            <span className="metric-val">
              {totalTopics > 0 ? `${totalTopics} Operational Topics` : 'Strategic Performance Review'}
            </span>
          </div>
        </div>
      </section>

      {/* 3. MAIN WORKSPACE GRID */}
      <div className="desk-workspace-grid">
        {/* LEFT COLUMN: HISTORY & FIRST-TO-ASK FOLLOW-UPS */}
        <div className="desk-col-left">
          {/* SECTION A: FIRST TO ASK QUESTIONS (HIGH PRIORITY OPENING ITEMS) */}
          <section className="desk-panel-card priority-focus">
            <div className="panel-header-row">
              <div className="panel-title-with-icon">
                <div className="panel-icon-bubble danger">
                  <Target size={18} />
                </div>
                <div>
                  <h3 className="panel-heading">1. Opening Questions to Ask First</h3>
                  <p className="panel-desc">
                    Mandatory follow-up items ordered in previous review. Must be clarified first before proceeding!
                  </p>
                </div>
              </div>
              <span className="panel-status-pill">
                {resolvedQueriesCount}/{openingQueries.length} Cleared
              </span>
            </div>

            {openingQueries.length > 0 ? (
              <div className="opening-queries-list">
                {openingQueries.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className={`opening-query-item ${q.resolved ? 'resolved' : 'pending'}`}
                    onClick={() => handleToggleOpeningQuery(q.id)}
                  >
                    <div className="query-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={!!q.resolved}
                        onChange={() => {}}
                        className="query-checkbox"
                      />
                    </div>
                    <div className="query-content-wrap">
                      <div className="query-source-tag">{q.source || 'Previous Meeting Action Item'}</div>
                      <div className="query-question-text">{q.question}</div>
                      <div className="query-status-indicator">
                        {q.resolved ? '✓ Clarified & Answered by Manager' : 'Pending Resolution — Ask First!'}
                      </div>
                      <div className="query-resolution-row" style={{ marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          placeholder="Record manager's response or clarification note..."
                          value={q.resolution_note || ''}
                          onChange={(e) => handleUpdateOpeningQueryNote(q.id, e.target.value)}
                          className="opening-query-note-input"
                          style={{ width: '100%', fontSize: '12px', padding: '5px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#1E293B' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-empty-placeholder">
                <CheckCircle2 size={24} color="#10B981" />
                <p>No critical carry-forward inquiries pending. All previous directives were cleared!</p>
              </div>
            )}
          </section>

          {/* SECTION B: LAST MEETING AUDIT & FEEDBACK */}
          <section className="desk-panel-card">
            <div className="panel-header-row">
              <div className="panel-title-with-icon">
                <div className="panel-icon-bubble info">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="panel-heading">Last Meeting Directives & Review History</h3>
                  <p className="panel-desc">
                    {previous_meeting
                      ? `Conducted on ${previous_meeting.date} (${previous_meeting.time})`
                      : 'First inaugural review recorded for this cycle'}
                  </p>
                </div>
              </div>
            </div>

            {previous_meeting ? (
              <div className="prev-meeting-details-box">
                <div className="prev-meeting-field">
                  <span className="field-label">Managing Director Directives from Last Review:</span>
                  <div className="field-quote-box">
                    "{previous_meeting.md_feedback || previous_meeting.notes || 'No written directives recorded.'}"
                  </div>
                </div>

                {previous_meeting.md_priority_notes && (
                  <div className="prev-meeting-field">
                    <span className="field-label">Priority Focus Ordered:</span>
                    <div className="field-val-text font-bold text-amber">
                      {previous_meeting.md_priority_notes}
                    </div>
                  </div>
                )}

                {previous_meeting.topics && previous_meeting.topics.length > 0 && (
                  <div className="prev-meeting-field">
                    <span className="field-label">
                      Last Meeting Topics Completion:
                      {' '}{previous_meeting.topics.filter((t) => t.completed).length} of {previous_meeting.topics.length} Covered
                    </span>
                    <div className="prev-topics-mini-chips">
                      {previous_meeting.topics.map((t) => (
                        <span
                          key={t.id}
                          className={`mini-topic-chip ${t.completed ? 'done' : 'pending'}`}
                          title={t.title}
                        >
                          {t.completed ? '[Done] ' : '[Pending] '}
                          {t.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="panel-empty-placeholder">
                <Sparkles size={24} color="#ff914d" />
                <p>This is the first scheduled session for this department in October 2026.</p>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: TODAY'S AGENDA & NEXT MEETING DIRECTIVES */}
        <div className="desk-col-right">
          {/* SECTION C: TODAY'S OPERATIONAL AGENDA CHECKLIST (DYNAMIC AGENDA) */}
          <section className="desk-panel-card">
            <div className="panel-header-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
              <div className="panel-title-with-icon">
                <div className="panel-icon-bubble primary">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 className="panel-heading">2. Today's Agenda & Department Discussion</h3>
                  <p className="panel-desc">Check off operational topics as they are reviewed in this session.</p>
                </div>
              </div>
              {totalTopics > 0 && (
                <span className="panel-status-pill primary">
                  {completedTopics}/{totalTopics} ({topicPct}%)
                </span>
              )}
            </div>

            {/* Quick Add Agenda Topic Form */}
            <form onSubmit={handleAddTopic} className="quick-add-topic-bar">
              <input
                type="text"
                placeholder="Type dynamic agenda topic for this meeting..."
                value={newTopicTitle}
                onChange={(e) => setNewTopicTitle(e.target.value)}
                className="quick-add-topic-input"
              />
              <button type="submit" className="quick-add-topic-submit-btn">
                <Plus size={15} />
                <span>Add Topic</span>
              </button>
            </form>

            {totalTopics > 0 ? (
              <>
                <div className="desk-prog-track" style={{ marginTop: '12px' }}>
                  <div className="desk-prog-fill" style={{ width: `${topicPct}%` }} />
                </div>
                <div className="topics-checklist-grid">
                  {todayTopics.map((topic, idx) => {
                    const isEditing = editingTopicId === topic.id;
                    return (
                      <div
                        key={topic.id || idx}
                        className={`topic-check-item ${topic.completed ? 'checked' : ''}`}
                      >
                        {isEditing ? (
                          <div className="topic-edit-row">
                            <input
                              type="text"
                              value={editTopicTitle}
                              onChange={(e) => setEditTopicTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEditTopic(topic.id);
                                if (e.key === 'Escape') handleCancelEditTopic();
                              }}
                              className="topic-edit-input"
                              autoFocus
                            />
                            <button
                              type="button"
                              className="topic-edit-save-btn"
                              onClick={() => handleSaveEditTopic(topic.id)}
                              title="Save Changes"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              className="topic-edit-cancel-btn"
                              onClick={handleCancelEditTopic}
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              className="topic-item-left"
                              onClick={() => handleToggleTopic(topic.id)}
                            >
                              <input
                                type="checkbox"
                                checked={!!topic.completed}
                                onChange={() => handleToggleTopic(topic.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="topic-checkbox"
                              />
                              <span className="topic-num">{idx + 1}.</span>
                              <span className="topic-title">{topic.title}</span>
                            </div>
                            <div className="topic-actions-wrap">
                              <button
                                type="button"
                                className="topic-action-icon-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditTopic(topic);
                                }}
                                title="Edit Topic"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                className="topic-action-icon-btn delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTopic(topic.id);
                                }}
                                title="Delete Topic"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="empty-agenda-prompt-card">
                <div className="empty-agenda-icon-wrap">
                  <Briefcase size={22} />
                </div>
                <div className="empty-agenda-title">Zero Agendas Configured</div>
                <div className="empty-agenda-desc">
                  This meeting currently has zero configured agendas. Type your custom topics above to create an agenda specifically for this meeting.
                </div>
              </div>
            )}
          </section>

          {/* SECTION D: NEXT MEETING MANDATES & "FIRST TO ASK" BUILDER */}
          <section className="desk-panel-card highlight-bottom">
            <div className="panel-header-row">
              <div className="panel-title-with-icon">
                <div className="panel-icon-bubble success">
                  <Save size={18} />
                </div>
                <div>
                  <h3 className="panel-heading">3. Orders for Next Meeting ("Next Meeting la Idhai Kekkanum")</h3>
                  <p className="panel-desc">Record executive directives and specify items to question first next week.</p>
                </div>
              </div>
            </div>

            {/* Directives Textarea */}
            <div className="desk-form-group">
              <label className="desk-form-label">Managing Director Directives & Instructions for this Session:</label>
              <textarea
                value={mdDirectives}
                onChange={(e) => setMdDirectives(e.target.value)}
                placeholder="Enter executive decisions, operational orders, and action mandates..."
                rows={4}
                className="audit-directive-textarea"
                style={{ width: '100%', marginBottom: '14px' }}
              />
            </div>

            {/* Next Meeting "First to Ask" Questions Builder */}
            <div className="desk-form-group">
              <label className="desk-form-label">
                Items to Ask First in Next Meeting:
              </label>
              <form onSubmit={handleAddNextQuery} className="next-query-input-bar">
                <input
                  type="text"
                  value={newNextQuery}
                  onChange={(e) => setNewNextQuery(e.target.value)}
                  placeholder="e.g. Verify whether 5 admin vacancies were filled at Site A..."
                  className="next-query-input"
                />
                <button type="submit" className="next-query-add-btn">
                  <Plus size={15} />
                  <span>Add Query</span>
                </button>
              </form>

              {nextMeetingQueries.length > 0 && (
                <div className="next-queries-pill-list">
                  {nextMeetingQueries.map((nq, idx) => (
                    <div key={nq.id || idx} className="next-query-item-pill">
                      <span className="nq-num">{idx + 1}.</span>
                      <span className="nq-text">{nq.question}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNextQuery(nq.id)}
                        className="nq-remove-btn"
                        title="Remove question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority for Next Review Cycle */}
            <div className="priority-directive-box" style={{ marginTop: '20px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <label className="desk-form-label" style={{ fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Sparkles size={14} color="#ff914d" />
                  <span>Set Priority for Next Review Cycle (Next Week Schedule Order)</span>
                </label>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  Next Week Schedule will automatically adapt to this selection
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Selecting <strong>High Priority</strong> will automatically move this company to prime slots next week. Selecting <strong>Postpone</strong> shifts the review to Monday morning.
              </p>

              <div className="priority-control-row">
                <div className="priority-input-group" style={{ minWidth: '220px' }}>
                  <CustomSelect
                    label="Next Review Priority Directive:"
                    value={nextWeekPriority}
                    onChange={setNextWeekPriority}
                    options={[
                      { value: 'NORMAL', label: 'Normal Priority' },
                      { value: 'HIGH', label: 'High Priority (Mandatory Focus)' },
                      { value: 'POSTPONE', label: 'Postpone Review (Deferred to Next Mon)' },
                      { value: 'SKIP', label: 'Skip Next Week' }
                    ]}
                  />
                </div>

                <div className="priority-input-group" style={{ flex: 1 }}>
                  <label className="desk-form-label">Next Review Directive Focus / Target:</label>
                  <input
                    type="text"
                    value={priorityNotes}
                    onChange={(e) => setPriorityNotes(e.target.value)}
                    placeholder="e.g. Must review cash balance & resolve snag list before session..."
                    className="imprest-search-input"
                    style={{ width: '100%', height: '38px' }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action - Single Unified Action Button */}
            <div className="desk-footer-save-row">
              <button
                type="button"
                onClick={() => handleSaveAll('COMPLETED')}
                disabled={isSaving}
                className={`desk-main-save-btn ${saveSuccess ? 'success' : ''}`}
                style={{ width: '100%' }}
              >
                {saveSuccess ? (
                  <>
                    <Check size={16} />
                    <span>Directives Committed & Synchronized!</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>{isSaving ? 'Saving...' : (meetingStatus === 'COMPLETED' ? 'Update & Synchronize Directives' : 'Save & Complete Review')}</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
