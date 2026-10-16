import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Lock,
  RotateCcw,
  FileText,
  Send,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize2,
  X,
  RefreshCw,
  Check,
  Loader2,
  Bot,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Target,
  Info,
  ExternalLink
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

export const ChecklistPage = ({ currentUser, onLogout, onBack, onOpenAuditModal, voiceEnabled, onToggleVoice, currentTime }) => {
  const [checklistData, setChecklistData] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('spotlight'); // 'spotlight' | 'grid'
  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [toastMessage, setToastMessage] = useState('');
  const [isLogsDrawerOpen, setIsLogsDrawerOpen] = useState(false);
  const [logsList, setLogsList] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingItemId, setSavingItemId] = useState(null);

  // 1. Fetch live saved checklist dynamically from MongoDB backend
  const loadChecklist = async (showToastMsg = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/checklist');
      if (res.ok) {
        const data = await res.json();
        setChecklistData(data);
        if (data && data.items && Array.isArray(data.items)) {
          setItems(data.items);

          const initialFeedbacks = {};
          data.items.forEach((item) => {
            initialFeedbacks[item.id] = item.user_feedback || item.feedback || '';
          });
          setFeedbackInputs(initialFeedbacks);
        } else {
          setItems([]);
        }
      } else {
        setError('Operations server returned status: ' + res.status);
      }
      if (showToastMsg) {
        showToast('Checklist updated from database.');
      }
    } catch (err) {
      console.warn('Backend server offline:', err);
      setError('Operations server unreachable. Ensure backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const currentItem = items[currentIndex] || items[0] || null;

  // Audit modal mapping for tasks that have live inspection drilldowns in Audit page
  const getAuditModalConfig = (item) => {
    if (!item) return null;
    const num = Number(item.number);
    const id = String(item.id || '');
    const title = (item.title || '').toLowerCase();

    // Task 1: User Check-in
    if (num === 1 || id === 'item_1') {
      return {
        modal: 'workforce',
        tab: 'checked',
        label: 'Workforce Attendance Audit',
        btnText: 'View Check-in Audit',
        tagText: 'Workforce'
      };
    }
    // Task 2: Morning Attendance
    if (num === 2 || id === 'item_2' || title.includes('morning attendance') || title.includes('roll-call')) {
      return {
        modal: 'workforce',
        tab: 'checked',
        label: 'Enterprise Attendance Audit',
        btnText: 'View Attendance Audit',
        tagText: 'Attendance'
      };
    }
    // Task 5: DMR Reports
    if (num === 5 || id === 'item_5' || title.includes('dmr')) {
      return {
        modal: 'dmr',
        tab: 'submitted',
        label: 'FMS DMR Compliance Audit',
        btnText: 'View DMR Audit',
        tagText: 'DMR'
      };
    }
    // Task 7: Support Tickets
    if (num === 7 || id === 'item_7' || title.includes('ticket')) {
      return {
        modal: 'tickets',
        tab: 'danger',
        label: 'Operational Tickets & Danger SLA',
        btnText: 'View Tickets Audit',
        tagText: 'Tickets'
      };
    }
    // Task 8: Accounts & Imprest / VFM
    if (num === 8 || id === 'item_8' || title.includes('account') || title.includes('imprest')) {
      return {
        modal: 'vfm',
        tab: 'submitted',
        label: 'VFM Work Updates Audit',
        btnText: 'View VFM Updates Audit',
        tagText: 'VFM'
      };
    }
    return null;
  };

  // Live dynamic counts
  const totalCount = items.length || 8;
  const mdVerifiedCount = items.filter((i) => i.completed || i.manual_verified).length;
  // AI checks only 6 automated tasks (Tasks 1, 2, 5, 6, 7, 8). Tasks 3 & 4 are manual-only!
  const totalAiTasks = 6;
  const aiVerifiedCount = items.filter(
    (i) => (i.ai_status === 'VERIFIED' || i.ai_verified) && i.ai_status !== 'MANUAL_CHECK_REQUIRED'
  ).length;
  const mdPercent = totalCount > 0 ? Math.round((mdVerifiedCount / totalCount) * 100) : 0;

  // 2. MD Checkbox Toggle Handler
  const handleToggleCheckbox = async (item) => {
    playMechanicalClick();
    const currentStatus = Boolean(item.completed || item.manual_verified);
    const nextStatus = !currentStatus;
    const currentFeedback = feedbackInputs[item.id] ?? item.user_feedback ?? item.feedback ?? '';

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, completed: nextStatus, manual_verified: nextStatus }
          : i
      )
    );

    try {
      const res = await fetch('/api/checklist/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: String(item.id),
          completed: nextStatus,
          feedback: currentFeedback,
          updated_by: currentUser?.name || 'Managing Director'
        }),
      });

      if (res.ok) {
        const updateResult = await res.json();
        if (updateResult && updateResult.checklist) {
          setChecklistData(updateResult.checklist);
        }
      }
    } catch (err) {
      console.warn('Backend update failed:', err);
    }

    if (nextStatus) {
      playSuccessChime();
      showToast(`Task ${item.number} Signed Off by ${currentUser?.name || 'MD'}`);
    } else {
      showToast(`Task ${item.number} reset to Pending Sign-off`);
    }
  };

  // 3. Save Directive Notes Handler
  const handleSaveNotes = async (itemId) => {
    playMechanicalClick();
    setSavingItemId(itemId);
    const targetItem = items.find((i) => i.id === itemId);
    const isCompleted = targetItem ? Boolean(targetItem.completed || targetItem.manual_verified) : false;
    const textToSave = feedbackInputs[itemId] || '';

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, user_feedback: textToSave, feedback: textToSave } : i))
    );

    try {
      const res = await fetch('/api/checklist/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: String(itemId),
          completed: isCompleted,
          feedback: textToSave,
          updated_by: currentUser?.name || 'Managing Director'
        }),
      });

      if (res.ok) {
        playSuccessChime();
        showToast('Directive saved to today’s audit log.');
      }
    } catch (err) {
      console.warn('Failed to save directive:', err);
      showToast('Note saved in browser session.');
    } finally {
      setSavingItemId(null);
    }
  };

  // 4. Resync Routine from MongoDB (Agent Execution)
  const handleTriggerRoutine = async () => {
    playMechanicalClick();
    setIsSyncing(true);
    showToast('Starting MD Agent... Pulling live data from MongoDB');

    try {
      const res = await fetch('/api/checklist/trigger', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const freshItems = data?.checklist?.items || data?.items || [];
        if (freshItems.length > 0) {
          setItems(freshItems);
          setChecklistData(data.checklist || data);

          const initialFeedbacks = {};
          freshItems.forEach((item) => {
            initialFeedbacks[item.id] = item.user_feedback || item.feedback || '';
          });
          setFeedbackInputs(initialFeedbacks);
        }
        playSuccessChime();
        showToast('MD Agent Sync Complete! Checklist updated from live DB.');
      } else {
        await loadChecklist(true);
      }
    } catch (err) {
      console.warn('Routine trigger error:', err);
      await loadChecklist(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // 5. Open JSONL Logs
  const handleOpenLogs = async () => {
    playMechanicalClick();
    setIsLogsDrawerOpen(true);
    try {
      const res = await fetch('/api/logs/today');
      if (res.ok) {
        const data = await res.json();
        setLogsList(data.entries || []);
      }
    } catch {
      setLogsList([
        {
          timestamp: new Date().toLocaleTimeString(),
          event_type: 'CHECKLIST_VIEW',
          status: 'SUCCESS',
          details: 'MD inspected Daily Checklist',
        },
      ]);
    }
  };

  // Helper: Short, clean Table of Contents titles
  const getTocShortTitle = (item) => {
    switch (item.number) {
      case 1:
        return 'User Check-in';
      case 2:
        return 'Morning Attendance';
      case 3:
        return 'Daily Emails';
      case 4:
        return 'Executive Reports';
      case 5:
        return 'DMR Reports';
      case 6:
        return 'Weekly Plan';
      case 7:
        return 'Support Tickets';
      case 8:
        return 'Accounts & Imprest';
      default:
        return item.title;
    }
  };

  // Helper: Format AI status badges
  const getAiStatusDetails = (aiStatus) => {
    switch (aiStatus) {
      case 'VERIFIED':
        return {
          pillClass: 'ai-badge-passed',
          title: 'AI Verification: PASSED',
          shortTag: 'Passed',
        };
      case 'ATTENTION_REQUIRED':
        return {
          pillClass: 'ai-badge-attention',
          title: 'AI Alert: ATTENTION REQUIRED',
          shortTag: 'Attention Needed',
        };
      case 'MANUAL_CHECK_REQUIRED':
        return {
          pillClass: 'ai-badge-manual',
          title: 'AI Status: MANUAL AUDIT ONLY',
          shortTag: 'Manual Audit Only',
        };
      default:
        return {
          pillClass: 'ai-badge-pending',
          title: 'AI Status: PENDING SYNC',
          shortTag: 'Pending Sync',
        };
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

  // Indian Rupee & 12-Hour AM/PM Text Normalizer
  const formatIndianText = (str) => {
    if (!str || typeof str !== 'string') return str || '';
    // 1. Convert Rs / Rs. to ₹ with Indian comma formatting (Lakhs & Crores)
    let formatted = str.replace(/Rs\.?\s*([\d,]+(?:\.\d+)?)/gi, (match, numStr) => {
      const rawNum = parseFloat(numStr.replace(/,/g, ''));
      if (isNaN(rawNum)) return match;
      return '₹ ' + rawNum.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    });
    // 2. Convert unadorned 24-hr time e.g. "at 07:23" -> "at 07:23 AM"
    formatted = formatted.replace(/\bat\s+(\d{1,2}):(\d{2})(?!\s*(?:AM|PM|am|pm))\b/gi, (match, h, m) => {
      const hr = parseInt(h, 10);
      const ampm = hr >= 12 ? 'PM' : 'AM';
      const hr12 = hr % 12 || 12;
      return `at ${String(hr12).padStart(2, '0')}:${m} ${ampm}`;
    });
    return formatted;
  };

  const formattedTime = format12HourTime(currentTime);

  const formattedDate = (currentTime || new Date()).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Loading Screen
  if (loading) {
    return (
      <div className="checklist-loading-viewport">
        <div className="loading-card">
          <Loader2 size={32} color="#ff914d" className="animate-spin" />
          <h2 className="loading-title">Connecting to Operations Agent</h2>
          <p className="loading-sub">Loading live checklist from MongoDB...</p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (error && items.length === 0) {
    return (
      <div className="checklist-loading-viewport">
        <div className="loading-card error-card">
          <h2 className="loading-title">Connection Alert</h2>
          <p className="loading-sub">{error}</p>
          <button onClick={() => loadChecklist(true)} className="btn-retry">
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  // Empty State Screen (Strictly dynamic: no fallback data injected)
  if (!loading && items.length === 0) {
    return (
      <div className="checklist-loading-viewport">
        <div className="loading-card">
          <h2 className="loading-title">No Checklist Records Found</h2>
          <p className="loading-sub">Click Resync to pull live operations data from MongoDB.</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
            <button onClick={() => onBack()} className="btn-retry" style={{ background: '#F1F5F9', color: '#334155' }}>
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button onClick={handleTriggerRoutine} disabled={isSyncing} className="btn-retry">
              <RotateCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Pulling Data...' : 'Resync Data'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checklist-experience-viewport">
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
            <h2 className="checklist-main-title">Executive Checklist</h2>
            <div className="checklist-date-sub">{formattedDate} • 10:30 AM Routine</div>
          </div>
        </div>

        <div className="checklist-bar-right">
          {/* Status Counters */}
          <div className="dual-status-strip">
            <div className="status-counter-capsule capsule-ai" title="AI automatically audits 6 tasks from database">
              <Bot size={14} color="#ff914d" />
              <span className="counter-label">AI Checked:</span>
              <span className="counter-val">{aiVerifiedCount} / {totalAiTasks}</span>
            </div>

            <div className="status-counter-capsule capsule-md" title="Signed off by Managing Director">
              <UserCheck size={14} color="#059669" />
              <span className="counter-label">MD Signed:</span>
              <span className="counter-val">{mdVerifiedCount} / {totalCount}</span>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              onClick={() => {
                playMechanicalClick();
                setViewMode('spotlight');
              }}
              className={`mode-btn ${viewMode === 'spotlight' ? 'mode-btn-active' : ''}`}
              title="Focus View"
            >
              <Maximize2 size={13} />
              <span>Focus</span>
            </button>

            <button
              onClick={() => {
                playMechanicalClick();
                setViewMode('grid');
              }}
              className={`mode-btn ${viewMode === 'grid' ? 'mode-btn-active' : ''}`}
              title="Full Board View"
            >
              <LayoutGrid size={13} />
              <span>Full Board</span>
            </button>
          </div>

          {/* Resync Button (Manually executed by user to start Agent) */}
          <button
            onClick={handleTriggerRoutine}
            disabled={isSyncing}
            className="action-pill-btn btn-sync"
            title="Click to start MD Agent and sync live routine from database"
          >
            <RotateCcw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Agent Syncing...' : 'Resync'}</span>
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
      {/* 2. TABLE OF CONTENTS — 8 EXECUTIVE ROUTINE SECTIONS           */}
      {/* ============================================================== */}
      <section className="toc-navigator-section">
        <div className="toc-header-row">
          <div className="toc-title-group">
            <span className="toc-pre-title">CHECKLIST INDEX</span>
            <h3 className="toc-main-heading">Table of Contents</h3>
          </div>

          <div className="toc-progress-indicator">
            <span className="toc-progress-percent">{mdPercent}% Signed Off</span>
            <span className="toc-progress-count">({mdVerifiedCount} of {totalCount} Completed)</span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="toc-bar-track">
          <div className="toc-bar-fill" style={{ width: `${mdPercent}%` }} />
        </div>

        {/* 8 Structured Table of Contents Cards in Clean 4x2 Grid */}
        <div className="toc-grid-container">
          {items.map((item, idx) => {
            const isMdDone = Boolean(item.completed || item.manual_verified);
            const isAiAttention = item.ai_status === 'ATTENTION_REQUIRED';
            const isActive = currentIndex === idx;
            const shortTitle = getTocShortTitle(item);

            return (
              <button
                key={item.id}
                onMouseEnter={playHoverServo}
                onClick={() => {
                  playMechanicalClick();
                  setCurrentIndex(idx);
                  if (viewMode !== 'spotlight') setViewMode('spotlight');
                }}
                className={`toc-card-item ${isActive ? 'toc-active' : ''} ${
                  isMdDone ? 'toc-md-signed' : isAiAttention ? 'toc-ai-alert' : ''
                }`}
              >
                {/* Step Number in Sleek Badge — STRICTLY NO # CHARACTER */}
                <div className="toc-step-badge">
                  {String(item.number).padStart(2, '0')}
                </div>

                {/* Title & Category */}
                <div className="toc-card-center">
                  <span className="toc-item-title">{shortTitle}</span>
                  <span className="toc-item-cat">{item.category}</span>
                </div>

                {/* Status Badges: Distinct AI & MD Status */}
                <div className="toc-status-badges">
                  <span
                    className={`toc-ai-chip ${
                      item.ai_status === 'VERIFIED'
                        ? 'toc-chip-pass'
                        : isAiAttention
                        ? 'toc-chip-alert'
                        : 'toc-chip-pending'
                    }`}
                  >
                    {item.ai_status === 'VERIFIED' ? 'AI: Pass' : isAiAttention ? 'AI: Alert' : 'AI: Check'}
                  </span>

                  <span className={`toc-md-chip ${isMdDone ? 'toc-chip-signed' : 'toc-chip-idle'}`}>
                    {isMdDone ? 'Signed Off' : 'Pending'}
                  </span>

                  {(() => {
                    const cfg = getAuditModalConfig(item);
                    if (!cfg) return null;
                    return (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          playMechanicalClick();
                          if (onOpenAuditModal) {
                            onOpenAuditModal(cfg.modal, cfg.tab);
                          }
                        }}
                        className="toc-audit-btn-badge"
                        title={`Directly open ${cfg.label} modal in Executive Audit`}
                      >
                        <span>Audit</span>
                        <ExternalLink size={9} />
                      </span>
                    );
                  })()}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3A. FOCUS MODE: CLEAN 2-COLUMN SPLIT (AI VS MD SEPARATE)       */}
      {/* ============================================================== */}
      {viewMode === 'spotlight' && currentItem && (
        <main className="spotlight-chamber">
          <div className="spotlight-split-deck">
            {/* Task Banner Header — NO # CHARACTER */}
            <div className="task-banner-header">
              <div className="task-banner-left">
                <span className="task-num-badge">TASK {String(currentItem.number).padStart(2, '0')} OF {String(items.length).padStart(2, '0')}</span>
                <span className="task-cat-badge">{currentItem.category}</span>
                <h2 className="task-primary-title">{currentItem.title}</h2>
              </div>

              {/* MD Sign-Off Status Badge & Audit Inspection Button */}
              <div className="task-banner-right" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(() => {
                  const cfg = getAuditModalConfig(currentItem);
                  if (!cfg) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        playMechanicalClick();
                        if (onOpenAuditModal) {
                          onOpenAuditModal(cfg.modal, cfg.tab);
                        }
                      }}
                      className="task-banner-audit-btn"
                      title={`Open live ${cfg.label} modal in Executive Audit`}
                    >
                      <ExternalLink size={13} />
                      <span>{cfg.btnText}</span>
                    </button>
                  );
                })()}
                <span
                  className={`md-status-pill ${
                    Boolean(currentItem.completed || currentItem.manual_verified)
                      ? 'md-status-signed'
                      : 'md-status-pending'
                  }`}
                >
                  {Boolean(currentItem.completed || currentItem.manual_verified)
                    ? 'Signed Off by MD'
                    : 'Pending MD Sign-off'}
                </span>
              </div>
            </div>

            {/* Short Objective Quote */}
            <div className="task-short-objective">
              "{currentItem.english_summary || currentItem.tanglish_summary}"
            </div>

            {/* ============================================================ */}
            {/* TWO CLEAN SEPARATE CARDS: AI AUDIT (LEFT) vs MD ACTION (RIGHT) */}
            {/* ============================================================ */}
            <div className="split-columns-container">
              {/* ---------------------------------------------------------- */}
              {/* PANEL 1 (LEFT): AI SYSTEM AUDIT                          */}
              {/* ---------------------------------------------------------- */}
              <div className="audit-card ai-audit-card">
                <div className="card-badge-header">
                  <div className="card-badge-title">
                    <Bot size={16} color="#ff914d" />
                    <span>AI System Audit</span>
                  </div>
                  {(() => {
                    const aiInfo = getAiStatusDetails(currentItem.ai_status);
                    return (
                      <span className={`ai-result-tag ${aiInfo.pillClass}`}>
                        {aiInfo.shortTag}
                      </span>
                    );
                  })()}
                </div>

                <div className="ai-observation-box">
                  <span className="observation-label">AI Finding from MongoDB:</span>
                  <p className="observation-text">
                    {formatIndianText(currentItem.ai_feedback) || 'AI analysis running in background...'}
                  </p>
                </div>

                <div className="ai-card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="meta-hint">
                    {currentItem.ai_status === 'VERIFIED'
                      ? 'Automated check verified against database'
                      : currentItem.ai_status === 'ATTENTION_REQUIRED'
                      ? 'Attention flagged by autonomous agent'
                      : 'Manual verification recommended'}
                  </span>
                  {(() => {
                    const cfg = getAuditModalConfig(currentItem);
                    if (!cfg) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          playMechanicalClick();
                          if (onOpenAuditModal) {
                            onOpenAuditModal(cfg.modal, cfg.tab);
                          }
                        }}
                        className="ai-card-inspect-btn"
                        title={`Inspect ${cfg.label} in Executive Audit`}
                      >
                        <Bot size={13} />
                        <span>Inspect in Audit</span>
                        <ExternalLink size={12} />
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* PANEL 2 (RIGHT): MD MANUAL SIGN-OFF & DIRECTIVES         */}
              {/* ---------------------------------------------------------- */}
              <div className="audit-card md-action-card">
                <div className="card-badge-header">
                  <div className="card-badge-title">
                    <UserCheck size={16} color="#059669" />
                    <span>MD Manual Sign-Off</span>
                  </div>
                  <span
                    className={`md-result-tag ${
                      Boolean(currentItem.completed || currentItem.manual_verified)
                        ? 'tag-md-done'
                        : 'tag-md-pending'
                    }`}
                  >
                    {Boolean(currentItem.completed || currentItem.manual_verified)
                      ? 'Signed Off'
                      : 'Action Needed'}
                  </span>
                </div>

                {/* BIG DIRECT INTERACTIVE TICK CHECKBOX */}
                <div className={`md-interactive-tick-row ${
                  Boolean(currentItem.completed || currentItem.manual_verified) ? 'is-signed' : ''
                }`}>
                  <label
                    className="md-checkbox-label"
                    title="Click to sign off this task"
                  >
                    <input
                      type="checkbox"
                      id={`check-md-${currentItem.id}`}
                      checked={Boolean(currentItem.completed || currentItem.manual_verified)}
                      onChange={() => handleToggleCheckbox(currentItem)}
                      className="native-checkbox-hidden"
                    />
                    <span
                      className={`md-tick-box ${
                        Boolean(currentItem.completed || currentItem.manual_verified)
                          ? 'tick-box-checked'
                          : ''
                      }`}
                    >
                      {Boolean(currentItem.completed || currentItem.manual_verified) && (
                        <Check size={18} strokeWidth={3.5} color="#FFFFFF" />
                      )}
                    </span>
                    <div className="tick-label-texts">
                      <span className="tick-heading">
                        {Boolean(currentItem.completed || currentItem.manual_verified)
                          ? 'I have verified and signed off this item'
                          : 'Click here to sign off this item'}
                      </span>
                      <span className="tick-sub">
                        {Boolean(currentItem.completed || currentItem.manual_verified)
                          ? 'Saved in daily operations log'
                          : 'Pending your review'}
                      </span>
                    </div>
                  </label>
                </div>

                {/* MD DIRECTIVES TEXTAREA (CLEAN, SHORT & SWEET) */}
                <div className="md-directive-input-group">
                  <label className="directive-label" htmlFor={`directive-${currentItem.id}`}>
                    Executive Directive / Instructions:
                  </label>
                  <textarea
                    id={`directive-${currentItem.id}`}
                    value={feedbackInputs[currentItem.id] ?? currentItem.user_feedback ?? currentItem.feedback ?? ''}
                    onChange={(e) =>
                      setFeedbackInputs((prev) => ({ ...prev, [currentItem.id]: e.target.value }))
                    }
                    placeholder="Type instructions or remarks for management..."
                    className="directive-textarea-clean"
                    rows={2}
                  />

                  <div className="directive-submit-row">
                    <button
                      onMouseEnter={playHoverServo}
                      onClick={() => handleSaveNotes(currentItem.id)}
                      disabled={savingItemId === currentItem.id}
                      className="btn-save-directive-clean"
                    >
                      <Send size={13} />
                      <span>{savingItemId === currentItem.id ? 'Saving...' : 'Save Directive'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Footer */}
            <div className="stepper-footer-row">
              <button
                disabled={currentIndex === 0}
                onClick={() => {
                  playMechanicalClick();
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                className="stepper-btn-clean"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              <span className="stepper-counter-text">
                Task {currentIndex + 1} of {items.length}
              </span>

              <button
                disabled={currentIndex === items.length - 1}
                onClick={() => {
                  playMechanicalClick();
                  setCurrentIndex((prev) => Math.min(items.length - 1, prev + 1));
                }}
                className="stepper-btn-clean stepper-btn-primary"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* 3B. FULL BOARD MODE: ALL 8 CARDS (AI VS MD SEPARATE ROWS)      */}
      {/* ============================================================== */}
      {viewMode === 'grid' && (
        <main className="grid-chamber">
          <div className="checklist-cards-grid">
            {items.map((item, idx) => {
              const isMdDone = Boolean(item.completed || item.manual_verified);
              const aiInfo = getAiStatusDetails(item.ai_status);

              return (
                <div
                  key={item.id}
                  className={`structured-board-card ${isMdDone ? 'card-signed' : ''}`}
                >
                  {/* Card Header: Task # and Title */}
                  <div className="board-card-header">
                    <div>
                      <span className="board-task-no">TASK {String(item.number).padStart(2, '0')} • {item.category}</span>
                      <h3 className="board-task-title">{item.title}</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {(() => {
                        const cfg = getAuditModalConfig(item);
                        if (!cfg) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              playMechanicalClick();
                              if (onOpenAuditModal) {
                                onOpenAuditModal(cfg.modal, cfg.tab);
                              }
                            }}
                            className="board-audit-modal-btn"
                            title={`Open ${cfg.label} modal in Executive Audit`}
                          >
                            <ExternalLink size={11} />
                            <span>Audit Modal</span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => {
                          playMechanicalClick();
                          setCurrentIndex(idx);
                          setViewMode('spotlight');
                        }}
                        className="board-focus-btn"
                        title="Open Focus View"
                      >
                        Focus
                      </button>
                    </div>
                  </div>

                  {/* Objective Summary */}
                  <div className="board-summary-text">
                    "{item.english_summary || item.tanglish_summary}"
                  </div>

                  {/* SECTION 1: AI AUDIT ROW */}
                  <div className="board-ai-section">
                    <div className="board-ai-header">
                      <div className="ai-label-group">
                        <Bot size={13} color="#ff914d" />
                        <span>AI System Audit</span>
                      </div>
                      <span className={`ai-result-tag ${aiInfo.pillClass}`}>
                        {aiInfo.shortTag}
                      </span>
                    </div>
                    <p className="board-ai-text">{formatIndianText(item.ai_feedback) || 'Pending audit...'}</p>
                  </div>

                  {/* SECTION 2: MD SIGN-OFF ROW */}
                  <div className="board-md-section">
                    <div className="board-md-header">
                      <div className="md-label-group">
                        <UserCheck size={13} color="#059669" />
                        <span>MD Sign-Off</span>
                      </div>
                      <span className={`md-result-tag ${isMdDone ? 'tag-md-done' : 'tag-md-pending'}`}>
                        {isMdDone ? 'Signed Off' : '⏳ Pending'}
                      </span>
                    </div>

                    {/* Interactive Checkbox */}
                    <label className="board-checkbox-row">
                      <input
                        type="checkbox"
                        checked={isMdDone}
                        onChange={() => handleToggleCheckbox(item)}
                        className="native-checkbox-hidden"
                      />
                      <span className={`board-tick-box ${isMdDone ? 'is-checked' : ''}`}>
                        {isMdDone && <Check size={15} strokeWidth={3.5} color="#FFFFFF" />}
                      </span>
                      <span className="board-tick-text">
                        {isMdDone ? 'Signed off by MD' : 'Click to sign off'}
                      </span>
                    </label>

                    {/* Directive input */}
                    <div className="board-input-row">
                      <input
                        type="text"
                        value={feedbackInputs[item.id] ?? item.user_feedback ?? item.feedback ?? ''}
                        onChange={(e) =>
                          setFeedbackInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Type instruction..."
                        className="board-directive-input"
                      />
                      <button
                        onClick={() => handleSaveNotes(item.id)}
                        disabled={savingItemId === item.id}
                        className="board-save-btn"
                      >
                        {savingItemId === item.id ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* ============================================================== */}
      {/* 4. SLIDE-OUT JSONL AUDIT DRAWER                                */}
      {/* ============================================================== */}
      {isLogsDrawerOpen && (
        <div className="drawer-overlay" onClick={() => setIsLogsDrawerOpen(false)}>
          <aside className="audit-slide-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-top-row">
              <div>
                <span className="drawer-chip">AUDIT LOG PERSISTENCE</span>
                <h3 className="drawer-title">Daily JSONL Audit Log</h3>
                <span className="drawer-file-path">
                  logs/{checklistData?.date || currentTime.toISOString().split('T')[0]}.jsonl
                </span>
              </div>
              <button
                onClick={() => setIsLogsDrawerOpen(false)}
                className="drawer-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-logs-body">
              <div className="logs-counter-strip">
                <span>Total Events: {logsList.length}</span>
                <button onClick={handleOpenLogs} className="btn-refresh-stream">
                  <RefreshCw size={12} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="logs-stream-container">
                {logsList.length === 0 ? (
                  <div className="logs-empty">
                    <p>No new events recorded today.</p>
                  </div>
                ) : (
                  logsList.map((log, lIdx) => (
                    <div key={lIdx} className="log-record-tile">
                      <div className="log-record-meta">
                        <span className="log-type">{log.event_type || 'EVENT'}</span>
                        <span className="log-time">{log.timestamp || '--:--'}</span>
                      </div>
                      <p className="log-record-detail">
                        {log.details || log.user_feedback || JSON.stringify(log.payload || log)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
