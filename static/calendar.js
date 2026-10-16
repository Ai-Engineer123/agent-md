/**
 * ============================================================================
 * OPERATIONS & EXECUTIVE MEETING CALENDAR CONTROLLER
 * ============================================================================
 * Provides rich interactive month-view tracking of:
 * - Daily 10:30 AM Routine Checklist completions (0-8 tasks, percentage, ticks)
 * - Scheduled Executive Meetings & Appointments
 * - Quick Day-Inspector drilldown & navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  const calMonthLabel = document.getElementById('cal-month-label');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const btnToday = document.getElementById('btn-today');
  const calDaysGrid = document.getElementById('cal-days-grid');

  const statRecordedDays = document.getElementById('stat-recorded-days');
  const statCompletedDays = document.getElementById('stat-completed-days');
  const statMeetingsCount = document.getElementById('stat-meetings-count');

  // Inspector Elements
  const insDateTitle = document.getElementById('ins-date-title');
  const insProgressBarWrap = document.getElementById('ins-progress-bar-wrap');
  const insProgressText = document.getElementById('ins-progress-text');
  const insProgressFill = document.getElementById('ins-progress-fill');
  const countInsTasks = document.getElementById('count-ins-tasks');
  const countInsMeetings = document.getElementById('count-ins-meetings');
  const insItemsList = document.getElementById('ins-items-list');
  const insMeetingsList = document.getElementById('ins-meetings-list');
  const tabBtnTasks = document.getElementById('tab-btn-tasks');
  const tabBtnMeetings = document.getElementById('tab-btn-meetings');
  const tabPaneTasks = document.getElementById('tab-pane-tasks');
  const tabPaneMeetings = document.getElementById('tab-pane-meetings');
  const btnOpenChecklist = document.getElementById('btn-open-checklist-page');
  const btnOpenAudit = document.getElementById('btn-open-audit-page');
  const btnOpenMeetingsPortal = document.getElementById('btn-open-meetings-portal');

  // State
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth() + 1; // 1-12
  let selectedDateStr = getLocalDateString(now);
  let monthDataCache = null;

  // 1. Theme Setup (Light Theme Default)
  function initTheme() {
    const saved = localStorage.getItem('agent_theme_pref') || 'light';
    applyTheme(saved);
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'Dark Mode';
    } else {
      document.body.classList.remove('light-theme');
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'Light Mode';
    }
    localStorage.setItem('agent_theme_pref', theme);
    localStorage.setItem('agent_theme', theme);
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.contains('light-theme');
      applyTheme(isLight ? 'dark' : 'light');
    });
  }
  initTheme();

  // Helper: Format Date
  function getLocalDateString(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Load Calendar Month Data
  async function loadMonth(year, month) {
    calDaysGrid.innerHTML = `
      <div style="grid-column: span 7; text-align: center; padding: 40px; color: var(--text-muted);">
        Loading ${year}-${month} operations schedule...
      </div>
    `;

    try {
      const resp = await fetch(`/api/calendar/month-summary?year=${year}&month=${month}`);
      const data = await resp.json();
      monthDataCache = data;

      // Update Labels
      calMonthLabel.textContent = `${data.month_name} ${data.year}`;
      if (statRecordedDays) statRecordedDays.textContent = `📋 ${data.stats.checklists_recorded} Recorded Days`;
      if (statCompletedDays) statCompletedDays.textContent = `✅ ${data.stats.checklists_completed} 100% Done`;
      if (statMeetingsCount) statMeetingsCount.textContent = `🤝 ${data.stats.scheduled_meetings} Meetings`;

      renderDaysGrid(data);

      // Automatically inspect selected date or today
      if (data.days[selectedDateStr]) {
        inspectDate(selectedDateStr);
      } else {
        const firstDayKey = Object.keys(data.days)[0];
        if (firstDayKey) inspectDate(firstDayKey);
      }
    } catch (err) {
      console.error('Failed to load month calendar:', err);
      calDaysGrid.innerHTML = `
        <div style="grid-column: span 7; text-align: center; padding: 40px; color: #dc2626;">
          Error loading calendar: ${err.message}
        </div>
      `;
    }
  }

  // 3. Render Calendar Grid Cells
  function renderDaysGrid(data) {
    calDaysGrid.innerHTML = '';

    // Calculate leading blanks (0=Sunday to 6=Saturday)
    // data.first_weekday is Python's calendar where 0=Monday, 6=Sunday
    // For Sunday start: Sunday=0, Monday=1, ..., Saturday=6
    const pyWeekday = data.first_weekday; // 0=Mon, 6=Sun
    const sunStartWeekday = (pyWeekday + 1) % 7;

    for (let i = 0; i < sunStartWeekday; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-day-cell empty';
      calDaysGrid.appendChild(blank);
    }

    // Render Days of Month
    for (let day = 1; day <= data.days_in_month; day++) {
      const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayInfo = data.days[dateStr] || {};

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      cell.setAttribute('data-date', dateStr);
      if (dayInfo.is_today) cell.classList.add('is-today');
      if (dateStr === selectedDateStr) cell.classList.add('selected');

      // Top Row (Day Number)
      const topRow = document.createElement('div');
      topRow.className = 'cal-day-top';

      const numSpan = document.createElement('span');
      numSpan.className = 'cal-day-num';
      numSpan.textContent = day;
      topRow.appendChild(numSpan);

      if (dayInfo.has_ai_report) {
        const aiChip = document.createElement('span');
        aiChip.className = 'chip-ai';
        aiChip.title = 'AI Executive Briefing Available';
        aiChip.textContent = '🧠 AI';
        topRow.appendChild(aiChip);
      }
      cell.appendChild(topRow);

      // Badges Container
      const badgesContainer = document.createElement('div');
      badgesContainer.className = 'cal-day-badges';

      // 1. Checklist Badges (Manual & AI - Short & Sweet)
      if (dayInfo.checklist && dayInfo.checklist.has_record) {
        const cl = dayInfo.checklist;
        const total = cl.total_items || 8;
        const manDone = cl.manual_verified_count !== undefined ? cl.manual_verified_count : (cl.completed_items || 0);
        const aiDone = cl.ai_verified_count !== undefined ? cl.ai_verified_count : 0;

        const miniRow = document.createElement('div');
        miniRow.className = 'cal-mini-row';

        // Manual Pill (e.g. 👤 6/8)
        const manChip = document.createElement('span');
        const manClass = (manDone === total && total > 0) ? 'done' : (manDone > 0 ? 'in-progress' : 'pending');
        manChip.className = `mini-chip ${manClass}`;
        manChip.title = `Manual Verified: ${manDone}/${total}`;
        manChip.innerHTML = `<span>👤</span><span>${manDone}/${total}</span>`;
        miniRow.appendChild(manChip);

        // AI Pill (e.g. 🤖 0/8)
        const aiChip = document.createElement('span');
        const aiClass = (aiDone === total && total > 0) ? 'done' : (aiDone > 0 ? 'in-progress' : 'pending');
        aiChip.className = `mini-chip ${aiClass}`;
        aiChip.title = `AI Verified: ${aiDone}/${total}`;
        aiChip.innerHTML = `<span>🤖</span><span>${aiDone}/${total}</span>`;
        miniRow.appendChild(aiChip);

        badgesContainer.appendChild(miniRow);
      }

      // 2. Meetings Badge (e.g. 🤝 1)
      if (dayInfo.meetings && dayInfo.meetings.length > 0) {
        const mtgChip = document.createElement('div');
        mtgChip.className = 'chip-meeting';
        mtgChip.title = `${dayInfo.meetings.length} Scheduled Meeting(s)`;
        mtgChip.innerHTML = `<span>🤝</span><span>${dayInfo.meetings.length}</span>`;
        badgesContainer.appendChild(mtgChip);
      }

      cell.appendChild(badgesContainer);

      // Click Event
      cell.addEventListener('click', () => {
        document.querySelectorAll('.cal-day-cell.selected').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        selectedDateStr = dateStr;
        inspectDate(dateStr);
      });

      calDaysGrid.appendChild(cell);
    }
  }

  // 4. Day Inspector Drilldown Details
  async function inspectDate(dateStr) {
    selectedDateStr = dateStr;
    insDateTitle.textContent = 'Loading records...';

    try {
      const resp = await fetch(`/api/calendar/day-detail?date=${dateStr}`);
      const data = await resp.json();

      insDateTitle.textContent = data.formatted_date;
      if (btnOpenChecklist) btnOpenChecklist.href = `/checklist`;
      if (btnOpenAudit) btnOpenAudit.href = `/audit?date=${dateStr}`;

      // Update Checklist Progress Bar & Tasks
      if (data.has_routine && data.routine) {
        insProgressBarWrap.style.display = 'block';
        const items = data.routine.items || [];
        const total = items.length || 8;
        const manDone = data.routine.manual_verified_count !== undefined
          ? data.routine.manual_verified_count
          : items.filter(it => it.completed || it.manual_verified).length;
        const aiDone = data.routine.ai_verified_count !== undefined
          ? data.routine.ai_verified_count
          : items.filter(it => it.ai_verified || it.ai_status === 'VERIFIED').length;
        const manPct = Math.round((manDone / total) * 100);

        insProgressText.textContent = `👤 ${manDone}/${total} • 🤖 ${aiDone}/${total}`;
        insProgressFill.style.width = `${manPct}%`;

        countInsTasks.textContent = items.length;

        if (items.length === 0) {
          insItemsList.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted);">No checklist tasks registered for this date.</div>`;
        } else {
          insItemsList.innerHTML = items.map(it => {
            const isManualDone = Boolean(it.completed || it.manual_verified);
            const userNote = it.user_feedback || it.feedback || '';

            // Short & sweet pills
            const manPill = isManualDone
              ? `<span class="badge-pill done" title="Manual Verified">👤 Done</span>`
              : `<span class="badge-pill pending" title="Pending Manual Check">👤 Pending</span>`;

            let aiPill = '';
            if (it.ai_status === 'VERIFIED') {
              aiPill = `<span class="badge-pill done" title="AI Verification Passed">🤖 Passed</span>`;
            } else if (it.ai_status === 'ATTENTION_REQUIRED') {
              aiPill = `<span class="badge-pill alert" title="AI Alert">🤖 Alert</span>`;
            } else if (it.ai_status === 'MANUAL_CHECK_REQUIRED') {
              aiPill = `<span class="badge-pill muted" title="Manual Check Required">📋 Manual</span>`;
            } else {
              aiPill = `<span class="badge-pill muted" title="Audit Pending">⏳ Pending</span>`;
            }

            // Directives: only show box if MD entered remarks
            let userNoteHtml = '';
            if (userNote) {
              userNoteHtml = `
                <div class="note-box manual">
                  <span class="note-tag">📝 MD:</span>
                  <span class="note-text">${userNote}</span>
                </div>
              `;
            }

            // AI Observation: clean and concise
            let aiText = it.ai_feedback || '';
            if (!aiText || it.ai_status === 'AWAITING_SYNC' || it.ai_status === 'PENDING_AUDIT') {
              aiText = '⏳ Today\'s audit has not run yet.';
            }

            const aiBoxHtml = `
              <div class="note-box ai">
                <span class="note-tag">🤖 AI:</span>
                <span class="note-text">${aiText}</span>
              </div>
            `;

            return `
              <div class="ins-item-card ${isManualDone ? 'is-done' : ''}">
                <div class="ins-item-top">
                  <span class="ins-item-num">#${String(it.number || 0).padStart(2, '0')}</span>
                  <div class="ins-item-pills">
                    ${manPill}
                    ${aiPill}
                  </div>
                </div>
                <div class="ins-item-title">${it.title}</div>
                ${userNoteHtml}
                ${aiBoxHtml}
              </div>
            `;
          }).join('');
        }
      } else {
        insProgressBarWrap.style.display = 'none';
        countInsTasks.textContent = '0';
        insItemsList.innerHTML = `
          <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.88rem;">
            <p style="font-size: 1.8rem; margin-bottom: 8px;">⏳</p>
            <strong>No Routine Recorded</strong>
            <p style="margin-top: 4px; font-size: 0.8rem;">Daily routine checklist has not been completed yet for this date.</p>
          </div>
        `;
      }

      // Update Meetings List
      const mtgs = data.meetings || [];
      countInsMeetings.textContent = mtgs.length;

      if (mtgs.length === 0) {
        insMeetingsList.innerHTML = `
          <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.88rem;">
            <p style="font-size: 1.8rem; margin-bottom: 8px;">📅</p>
            <strong>No Meetings Scheduled</strong>
            <p style="margin-top: 4px; font-size: 0.8rem;">No executive meetings scheduled for this date.</p>
          </div>
        `;
      } else {
        insMeetingsList.innerHTML = mtgs.map(m => {
          const compClass = m.company || 'VFM';
          const topics = m.topics || [];
          const completedTopicsCount = topics.filter(t => t.completed).length;

          let topicsBadge = '';
          if (m.has_topics && topics.length > 0) {
            topicsBadge = `
              <div style="margin-top: 6px; font-size: 0.72rem; color: #0284c7; font-weight: 700;">
                📌 ${completedTopicsCount}/${topics.length} Agenda Topics Covered
              </div>
            `;
          }

          let directivesBadge = '';
          if (m.md_feedback && m.md_feedback.trim()) {
            directivesBadge = `
              <div style="margin-top: 6px; font-size: 0.74rem; background: #eff6ff; color: #1e40af; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #3b82f6;">
                <strong>📝 MD Directive:</strong> ${m.md_feedback.length > 90 ? m.md_feedback.slice(0, 90) + '...' : m.md_feedback}
              </div>
            `;
          }

          return `
            <div class="meeting-card" id="card-${m.id}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 6px; align-items: center;">
                  <span class="mtg-company-chip ${compClass}">${m.company || 'VFM'}</span>
                  <span class="meeting-time">⏰ ${m.time || '11:00 AM'}</span>
                </div>
                <span style="font-size: 0.7rem; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 10px;">
                  ${m.type || 'Review'}
                </span>
              </div>
              <div class="meeting-title" style="margin-top: 4px;">${m.title}</div>
              <div class="meeting-meta">
                <span>📍 ${m.location || 'Head Office Boardroom'}</span>
                ${m.department ? `<span>🏢 ${m.department}</span>` : ''}
                ${m.sub_teams && m.sub_teams.length ? `<span>👥 Teams: ${m.sub_teams.join(', ')}</span>` : ''}
              </div>
              ${topicsBadge}
              ${directivesBadge}
            </div>
          `;
        }).join('');
      }

      if (btnOpenMeetingsPortal) {
        btnOpenMeetingsPortal.href = `/meetings?date=${dateStr}`;
      }

    } catch (err) {
      console.error('Failed to load day detail:', err);
      insDateTitle.textContent = 'Error Loading Date';
    }
  }

  // 5. Month Navigation Handlers
  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      loadMonth(currentYear, currentMonth);
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      loadMonth(currentYear, currentMonth);
    });
  }

  if (btnToday) {
    btnToday.addEventListener('click', () => {
      const today = new Date();
      currentYear = today.getFullYear();
      currentMonth = today.getMonth() + 1;
      selectedDateStr = getLocalDateString(today);
      loadMonth(currentYear, currentMonth);
    });
  }

  // 6. Inspector Tab Switching
  if (tabBtnTasks && tabBtnMeetings) {
    tabBtnTasks.addEventListener('click', () => {
      tabBtnTasks.classList.add('active');
      tabBtnMeetings.classList.remove('active');
      if (tabPaneTasks) tabPaneTasks.style.display = 'block';
      if (tabPaneMeetings) tabPaneMeetings.style.display = 'none';
    });

    tabBtnMeetings.addEventListener('click', () => {
      tabBtnMeetings.classList.add('active');
      tabBtnTasks.classList.remove('active');
      if (tabPaneMeetings) tabPaneMeetings.style.display = 'block';
      if (tabPaneTasks) tabPaneTasks.style.display = 'none';
    });
  }

  // Initial Load
  loadMonth(currentYear, currentMonth);
});
