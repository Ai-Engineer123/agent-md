/**
 * ============================================================================
 * EXECUTIVE MEETINGS FLIGHT DECK CONTROLLER (TABLE VIEW & DROPDOWNS)
 * ============================================================================
 * Provides:
 * - Clean Data Table View for executive meetings
 * - Sleek styled dropdown filters (Company, Day, Priority, Status)
 * - Inspect Modal with interactive topic checklists & MD Directives
 * - Dynamic week-by-week schedule preparation with inherited priorities
 * - Rescheduling (Postpone, Prepone) & Slot Swapping
 * - Flexible 8:00 AM Monthly OM & FM Assembly
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  const statTotalMeetings = document.getElementById('stat-total-meetings');
  const statTopicsProgress = document.getElementById('stat-topics-progress');
  const statDirectivesLogged = document.getElementById('stat-directives-logged');

  const weekDateRangeLabel = document.getElementById('week-date-range');
  const btnPrevWeek = document.getElementById('btn-prev-week');
  const btnNextWeek = document.getElementById('btn-next-week');
  const btnPrepareUpcomingWeek = document.getElementById('btn-prepare-upcoming-week');

  const meetingsTableBody = document.getElementById('meetings-table-body');
  const filterCompanySelect = document.getElementById('filter-company-select');
  const filterDaySelect = document.getElementById('filter-day-select');
  const filterPrioritySelect = document.getElementById('filter-priority-select');
  const filterStatusSelect = document.getElementById('filter-status-select');
  const btnResetFilters = document.getElementById('btn-reset-filters');

  // Inspect Modal Elements
  const inspectModal = document.getElementById('inspect-modal');
  const btnCloseInspectModal = document.getElementById('btn-close-inspect-modal');
  const btnCancelInspect = document.getElementById('btn-cancel-inspect');
  const inspectMeetingId = document.getElementById('inspect-meeting-id');
  const inspectCompanyTag = document.getElementById('inspect-company-tag');
  const inspectTimePill = document.getElementById('inspect-time-pill');
  const inspectStatusPill = document.getElementById('inspect-status-pill');
  const inspectTitle = document.getElementById('inspect-title');
  const inspectMeta = document.getElementById('inspect-meta');
  const inspectTopicsSection = document.getElementById('inspect-topics-section');
  const inspectTopicsCount = document.getElementById('inspect-topics-count');
  const inspectProgressFill = document.getElementById('inspect-progress-fill');
  const inspectChecklistGrid = document.getElementById('inspect-checklist-grid');
  const inspectFeedbackText = document.getElementById('inspect-feedback-text');
  const inspectPrioritySelect = document.getElementById('inspect-priority-select');
  const inspectPriorityNotes = document.getElementById('inspect-priority-notes');
  const btnSaveInspectDirectives = document.getElementById('btn-save-inspect-directives');

  // Reschedule Modal Elements
  const rescheduleModal = document.getElementById('reschedule-modal');
  const btnCloseRescheduleModal = document.getElementById('btn-close-reschedule-modal');
  const btnCancelReschedule = document.getElementById('btn-cancel-reschedule');
  const rescheduleForm = document.getElementById('reschedule-form');
  const rescheduleMeetingId = document.getElementById('reschedule-meeting-id');
  const rescheduleMeetingTitle = document.getElementById('reschedule-meeting-title');
  const rescheduleNewDate = document.getElementById('reschedule-new-date');
  const rescheduleNewTime = document.getElementById('reschedule-new-time');
  const rescheduleReason = document.getElementById('reschedule-reason');

  // Swap Modal Elements
  const swapModal = document.getElementById('swap-modal');
  const btnCloseSwapModal = document.getElementById('btn-close-swap-modal');
  const btnCancelSwap = document.getElementById('btn-cancel-swap');
  const swapForm = document.getElementById('swap-form');
  const swapMeetingIdA = document.getElementById('swap-meeting-id-a');
  const swapMeetingTitleA = document.getElementById('swap-meeting-title-a');
  const swapTargetSelect = document.getElementById('swap-target-select');
  const swapReason = document.getElementById('swap-reason');

  // Monthly Assembly Modal Elements
  const btnOpenMonthlyModal = document.getElementById('btn-open-monthly-assembly-modal');
  const monthlyModal = document.getElementById('monthly-assembly-modal');
  const btnCloseAssemblyModal = document.getElementById('btn-close-assembly-modal');
  const btnCancelAssembly = document.getElementById('btn-cancel-assembly');
  const assemblyForm = document.getElementById('assembly-form');
  const assemblyDate = document.getElementById('assembly-date');
  const assemblyLocation = document.getElementById('assembly-location');

  // Ad-hoc Meeting Modal Elements
  const btnOpenScheduleModal = document.getElementById('btn-open-schedule-modal');
  const meetingModal = document.getElementById('meeting-modal');
  const btnCloseMeetingModal = document.getElementById('btn-close-meeting-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const meetingForm = document.getElementById('meeting-form');
  const inputMtgDate = document.getElementById('input-mtg-date');
  const inputMtgTitle = document.getElementById('input-mtg-title');
  const inputMtgCompany = document.getElementById('input-mtg-company');
  const inputMtgTime = document.getElementById('input-mtg-time');

  // State
  let allMeetings = [];
  let filterCompany = 'ALL';
  let filterDay = 'ALL';
  let filterPriority = 'ALL';
  let filterStatus = 'ALL';
  let rescheduleFp = null;
  let assemblyFp = null;
  let meetingFp = null;

  // Active Week State (Default Monday of Current Week)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
  const distanceToMonday = (dayOfWeek + 6) % 7;
  let activeMonday = new Date(today);
  activeMonday.setDate(today.getDate() - distanceToMonday);

  // 1. Theme Setup
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
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.contains('light-theme');
      applyTheme(isLight ? 'dark' : 'light');
    });
  }
  initTheme();

  // Helper: Format Date String YYYY-MM-DD
  function toYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function updateWeekLabel() {
    const sat = new Date(activeMonday);
    sat.setDate(activeMonday.getDate() + 5);

    const monFmt = activeMonday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const satFmt = sat.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (weekDateRangeLabel) {
      weekDateRangeLabel.textContent = `Active Week: ${monFmt} – ${satFmt}`;
    }
  }

  // 2. Fetch All Meetings
  async function loadMeetings() {
    meetingsTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 50px; color: var(--text-muted);">
          Loading executive meetings table...
        </td>
      </tr>
    `;

    try {
      const resp = await fetch('/api/meetings');
      if (!resp.ok) throw new Error('Failed to load meetings');
      allMeetings = await resp.json();

      updateGlobalStats();
      renderFilteredTable();
    } catch (err) {
      console.error(err);
      meetingsTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: #dc2626;">
            Failed to load meetings: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  // 3. Stats Calculation
  function updateGlobalStats() {
    let totalTopics = 0;
    let coveredTopics = 0;
    let directivesCount = 0;

    allMeetings.forEach(m => {
      if (m.topics && Array.isArray(m.topics)) {
        totalTopics += m.topics.length;
        coveredTopics += m.topics.filter(t => t.completed).length;
      }
      if (m.md_feedback && m.md_feedback.trim()) {
        directivesCount++;
      }
    });

    if (statTotalMeetings) statTotalMeetings.textContent = `🤝 ${allMeetings.length} Meetings`;
    if (statTopicsProgress) {
      const pct = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;
      statTopicsProgress.textContent = `📌 ${coveredTopics}/${totalTopics} Topics (${pct}%)`;
    }
    if (statDirectivesLogged) statDirectivesLogged.textContent = `📝 ${directivesCount} Directives Logged`;
  }

  // 4. Render Table Rows
  function renderFilteredTable() {
    let filtered = [...allMeetings];

    // Filter Company
    if (filterCompany !== 'ALL') {
      filtered = filtered.filter(m => (m.company || '').toUpperCase() === filterCompany);
    }

    // Filter Schedule Day
    if (filterDay !== 'ALL') {
      const targetDay = parseInt(filterDay, 10);
      filtered = filtered.filter(m => {
        if (!m.date) return false;
        const [y, mm, dd] = m.date.split('-').map(Number);
        const dt = new Date(y, mm - 1, dd);
        const pyWeekday = (dt.getDay() + 6) % 7;
        return pyWeekday === targetDay;
      });
    }

    // Filter Priority
    if (filterPriority !== 'ALL') {
      filtered = filtered.filter(m => (m.md_priority || 'NORMAL').toUpperCase() === filterPriority);
    }

    // Filter Status
    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(m => (m.status || 'SCHEDULED').toUpperCase() === filterStatus);
    }

    if (filtered.length === 0) {
      meetingsTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 6px;">📅</div>
            <strong>No meetings match current filters</strong>
            <p style="font-size: 0.82rem; margin-top: 4px;">Try changing or resetting your dropdown filters.</p>
          </td>
        </tr>
      `;
      return;
    }

    // Sort by Date ascending, then time
    filtered.sort((a, b) => {
      const cmpDate = (a.date || '').localeCompare(b.date || '');
      if (cmpDate !== 0) return cmpDate;
      return (a.time || '').localeCompare(b.time || '');
    });

    const rowsHtml = filtered.map(m => {
      // Date formatting
      let dayName = '---';
      let dateShort = m.date || '---';
      if (m.date) {
        const [y, mm, dd] = m.date.split('-').map(Number);
        const dt = new Date(y, mm - 1, dd);
        dayName = dt.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
        dateShort = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      const compClass = m.company || 'VFM';

      // Priority cell
      const prio = (m.md_priority || 'NORMAL').toUpperCase();
      let prioEmoji = '⚡';
      if (prio === 'HIGH') prioEmoji = '🔥';
      if (prio === 'POSTPONE') prioEmoji = '⏸️';
      if (prio === 'SKIP') prioEmoji = '❌';

      const prioHtml = `
        <span class="prio-pill ${prio}" title="${m.md_priority_notes || 'Standard'}">
          <span>${prioEmoji}</span>
          <span>${prio}</span>
        </span>
      `;

      return `
        <tr id="row-${m.id}" data-mtg-id="${m.id}">
          <!-- Col 1: Schedule (Date, Day & Time in ONE horizontal inline row) -->
          <td style="white-space: nowrap;">
            <div class="cell-schedule-inline">
              <span class="cell-day-pill">${dayName}</span>
              <span class="cell-date-str">${dateShort}</span>
              <span class="cell-time-inline">⏰ ${m.time || '11:00 AM – 06:00 PM'}</span>
            </div>
          </td>

          <!-- Col 2: Department & Title -->
          <td>
            <div class="cell-title-box">
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <span class="company-tag ${compClass}">${m.company || 'VFM'}</span>
                <span class="cell-title-text">${m.title}</span>
                ${m.is_monthly ? '<span style="font-size: 0.68rem; font-weight: 800; background: #fae8ff; color: #a21caf; padding: 2px 6px; border-radius: 8px;">MONTHLY 8 AM</span>' : ''}
              </div>
              <span class="cell-sub-text">
                ${m.department ? `<span>🏢 Department: <strong>${m.department}</strong></span>` : ''}
                ${m.sub_teams && m.sub_teams.length ? `<span>👥 Teams: <strong>${m.sub_teams.join(', ')}</strong></span>` : ''}
                <span>📍 ${m.location || 'Head Office Boardroom'}</span>
              </span>
            </div>
          </td>

          <!-- Col 3: Next Week Priority (Centered) -->
          <td style="text-align: center;">${prioHtml}</td>

          <!-- Col 4: Actions (View Only, Centered) -->
          <td style="text-align: center;">
            <button type="button" class="btn-table-action primary btn-inspect-row" data-mtg-id="${m.id}" title="View Details, Checklist & MD Directives">
              <span>👁️ View</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    meetingsTableBody.innerHTML = rowsHtml;
    attachTableInteractions();
  }

  // 5. Wire Table Row Actions (View Only)
  function attachTableInteractions() {
    // Open Inspect Modal on View button click
    document.querySelectorAll('.btn-inspect-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const mtgId = btn.getAttribute('data-mtg-id');
        openInspectModal(mtgId);
      });
    });
  }

  // In-Modal Actions Elements
  const inspectHistoryStrip = document.getElementById('inspect-history-strip');
  const btnInspectReschedule = document.getElementById('btn-inspect-reschedule');
  const btnInspectSwap = document.getElementById('btn-inspect-swap');

  if (btnInspectReschedule) {
    btnInspectReschedule.addEventListener('click', () => {
      const mtgId = inspectMeetingId.value;
      const mtg = allMeetings.find(m => m.id === mtgId);
      if (!mtg) return;

      if (rescheduleMeetingId) rescheduleMeetingId.value = mtg.id;
      if (rescheduleMeetingTitle) rescheduleMeetingTitle.textContent = `${mtg.company} — ${mtg.title} (Current: ${mtg.date} ${mtg.time || ''})`;
      if (rescheduleNewDate) rescheduleNewDate.value = mtg.date;
      if (rescheduleFp) rescheduleFp.setDate(mtg.date || 'today');
      if (rescheduleNewTime) rescheduleNewTime.value = mtg.time || '';
      if (rescheduleReason) rescheduleReason.value = '';

      if (rescheduleModal) rescheduleModal.classList.add('active');
    });
  }

  if (btnInspectSwap) {
    btnInspectSwap.addEventListener('click', () => {
      const mtgId = inspectMeetingId.value;
      const mtg = allMeetings.find(m => m.id === mtgId);
      if (!mtg) return;

      if (swapMeetingIdA) swapMeetingIdA.value = mtg.id;
      if (swapMeetingTitleA) swapMeetingTitleA.textContent = `${mtg.company} — ${mtg.title} (${mtg.date} ${mtg.time || ''})`;

      if (swapTargetSelect) {
        const otherMeetings = allMeetings.filter(m => m.id !== mtg.id);
        swapTargetSelect.innerHTML = otherMeetings.map(m => `
          <option value="${m.id}">[${m.date}] ${m.company} — ${m.title} (${m.time || ''})</option>
        `).join('');
        if (swapTargetSelect._rebuildCustomDropdown) {
          swapTargetSelect._rebuildCustomDropdown();
        }
      }

      if (swapModal) swapModal.classList.add('active');
    });
  }

  // 6. Inspect Modal Logic
  function openInspectModal(mtgId) {
    const mtg = allMeetings.find(m => m.id === mtgId);
    if (!mtg) return;

    inspectMeetingId.value = mtg.id;
    inspectCompanyTag.textContent = mtg.company || 'VFM';
    inspectCompanyTag.className = `company-tag ${mtg.company || 'VFM'}`;
    inspectTimePill.textContent = `⏰ ${mtg.time || '11:00 AM – 06:00 PM'}`;

    const stClass = (mtg.status || 'SCHEDULED').toUpperCase();
    inspectStatusPill.textContent = stClass;
    inspectStatusPill.className = `status-pill ${stClass}`;

    inspectTitle.textContent = mtg.title;

    let formattedDate = mtg.date;
    if (mtg.date) {
      const [y, mm, dd] = mtg.date.split('-').map(Number);
      const dt = new Date(y, mm - 1, dd);
      formattedDate = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    inspectMeta.textContent = `📍 ${mtg.location || 'Head Office Boardroom'} • 📅 ${formattedDate}`;

    // History log inside modal
    if (inspectHistoryStrip) {
      if (mtg.reschedule_history && mtg.reschedule_history.length > 0) {
        const latest = mtg.reschedule_history[mtg.reschedule_history.length - 1];
        inspectHistoryStrip.innerHTML = `<span>ℹ️</span> <span><strong>${latest.action}:</strong> ${latest.from_date} ➔ ${latest.to_date}</span>`;
      } else {
        inspectHistoryStrip.innerHTML = `<span style="color: var(--text-muted);">Standard schedule slot</span>`;
      }
    }

    // Agenda Topics Checklist
    const topics = mtg.topics || [];
    if (mtg.has_topics && topics.length > 0) {
      inspectTopicsSection.style.display = 'block';
      renderInspectChecklist(mtg);
    } else {
      inspectTopicsSection.style.display = 'none';
    }

    // MD Directives Textarea
    inspectFeedbackText.value = mtg.md_feedback || mtg.notes || '';

    // MD Next Week Priority
    inspectPrioritySelect.value = (mtg.md_priority || 'NORMAL').toUpperCase();
    if (inspectPrioritySelect._syncCustomDropdown) inspectPrioritySelect._syncCustomDropdown();
    inspectPriorityNotes.value = mtg.md_priority_notes || '';

    if (inspectModal) inspectModal.classList.add('active');
  }

  function renderInspectChecklist(mtg) {
    const topics = mtg.topics || [];
    const completedCount = topics.filter(t => t.completed).length;
    const totalCount = topics.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    inspectTopicsCount.textContent = `${completedCount}/${totalCount} Covered (${pct}%)`;
    inspectProgressFill.style.width = `${pct}%`;

    inspectChecklistGrid.innerHTML = topics.map(t => `
      <label class="checklist-row">
        <input type="checkbox" class="inspect-chk-item" data-topic-id="${t.id}" ${t.completed ? 'checked' : ''}>
        <div style="flex: 1;">
          ${t.scope ? `<span class="scope-tag">${t.scope}</span> ` : ''}
          <span>${t.title}</span>
        </div>
      </label>
    `).join('');

    // Wire live tick updates
    inspectChecklistGrid.querySelectorAll('.inspect-chk-item').forEach(chk => {
      chk.addEventListener('change', async () => {
        const topicId = chk.getAttribute('data-topic-id');
        const targetTopic = topics.find(t => t.id === topicId);
        if (targetTopic) targetTopic.completed = chk.checked;

        // Update progress UI
        const newCompleted = topics.filter(t => t.completed).length;
        const newPct = Math.round((newCompleted / totalCount) * 100);
        inspectTopicsCount.textContent = `${newCompleted}/${totalCount} Covered (${newPct}%)`;
        inspectProgressFill.style.width = `${newPct}%`;

        // Update global state and save
        updateGlobalStats();
        renderFilteredTable();

        try {
          await fetch(`/api/meetings/${mtg.id}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topics_progress: topics.map(t => ({ id: t.id, completed: t.completed }))
            })
          });
        } catch (err) {
          console.error('Failed to update topic:', err);
        }
      });
    });
  }

  function closeInspectModal() {
    if (inspectModal) inspectModal.classList.remove('active');
  }
  if (btnCloseInspectModal) btnCloseInspectModal.addEventListener('click', closeInspectModal);
  if (btnCancelInspect) btnCancelInspect.addEventListener('click', closeInspectModal);

  // Save Directives & Next Week Priority button inside Inspect Modal
  if (btnSaveInspectDirectives) {
    btnSaveInspectDirectives.addEventListener('click', async () => {
      const mtgId = inspectMeetingId.value;
      const mtg = allMeetings.find(m => m.id === mtgId);
      if (!mtg) return;

      const feedbackVal = inspectFeedbackText.value.trim();
      const priorityVal = inspectPrioritySelect.value;
      const priorityNotesVal = inspectPriorityNotes.value.trim();

      btnSaveInspectDirectives.disabled = true;
      btnSaveInspectDirectives.textContent = 'Saving...';

      try {
        const topicsProgress = (mtg.topics || []).map(t => ({ id: t.id, completed: t.completed }));
        const resp = await fetch(`/api/meetings/${mtgId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            md_feedback: feedbackVal,
            md_priority: priorityVal,
            md_priority_notes: priorityNotesVal,
            topics_progress: topicsProgress
          })
        });

        if (resp.ok) {
          mtg.md_feedback = feedbackVal;
          mtg.notes = feedbackVal;
          mtg.md_priority = priorityVal;
          mtg.md_priority_notes = priorityNotesVal;

          updateGlobalStats();
          renderFilteredTable();

          btnSaveInspectDirectives.textContent = '✓ Saved Directives & Priority!';
          setTimeout(() => {
            btnSaveInspectDirectives.disabled = false;
            btnSaveInspectDirectives.textContent = '💾 Save Directives & Priority';
            closeInspectModal();
          }, 1200);
        } else {
          btnSaveInspectDirectives.disabled = false;
          btnSaveInspectDirectives.textContent = 'Error Saving';
        }
      } catch (err) {
        console.error('Error:', err);
        btnSaveInspectDirectives.disabled = false;
        btnSaveInspectDirectives.textContent = 'Error Saving';
      }
    });
  }

  // 7. Week Navigation & Preparation Handlers
  if (btnPrevWeek) {
    btnPrevWeek.addEventListener('click', () => {
      activeMonday.setDate(activeMonday.getDate() - 7);
      updateWeekLabel();
    });
  }

  if (btnNextWeek) {
    btnNextWeek.addEventListener('click', () => {
      activeMonday.setDate(activeMonday.getDate() + 7);
      updateWeekLabel();
    });
  }

  if (btnPrepareUpcomingWeek) {
    btnPrepareUpcomingWeek.addEventListener('click', async () => {
      const nextMon = new Date(activeMonday);
      nextMon.setDate(activeMonday.getDate() + 7);
      const nextMonStr = toYMD(nextMon);

      if (!confirm(`Prepare next week schedule starting ${nextMonStr} using current MD priorities?`)) {
        return;
      }

      btnPrepareUpcomingWeek.disabled = true;
      btnPrepareUpcomingWeek.textContent = 'Generating...';

      try {
        const resp = await fetch('/api/meetings/generate-week', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ week_start_date: nextMonStr, force: true })
        });
        if (resp.ok) {
          activeMonday = nextMon;
          updateWeekLabel();
          await loadMeetings();
          alert(`Next week schedule prepared successfully for week of ${nextMonStr}!`);
        } else {
          alert('Failed to generate next week schedule.');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btnPrepareUpcomingWeek.disabled = false;
        btnPrepareUpcomingWeek.textContent = '⚡ Prepare Upcoming Week';
      }
    });
  }

  // 8. Reschedule Form Submission
  if (rescheduleForm) {
    rescheduleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mtgId = rescheduleMeetingId.value;
      const payload = {
        new_date: rescheduleNewDate.value,
        new_time: rescheduleNewTime.value.trim() || undefined,
        reason: rescheduleReason.value.trim() || undefined
      };

      try {
        const resp = await fetch(`/api/meetings/${mtgId}/reschedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resp.ok) {
          closeRescheduleModal();
          await loadMeetings();
        } else {
          alert('Reschedule failed');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  function closeRescheduleModal() {
    if (rescheduleModal) rescheduleModal.classList.remove('active');
  }
  if (btnCloseRescheduleModal) btnCloseRescheduleModal.addEventListener('click', closeRescheduleModal);
  if (btnCancelReschedule) btnCancelReschedule.addEventListener('click', closeRescheduleModal);

  // 9. Swap Form Submission
  if (swapForm) {
    swapForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const idA = swapMeetingIdA.value;
      const idB = swapTargetSelect.value;
      const reasonVal = swapReason.value.trim();

      try {
        const resp = await fetch('/api/meetings/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meeting_id_a: idA,
            meeting_id_b: idB,
            reason: reasonVal || undefined
          })
        });
        if (resp.ok) {
          closeSwapModal();
          await loadMeetings();
        } else {
          alert('Swap failed');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  function closeSwapModal() {
    if (swapModal) swapModal.classList.remove('active');
  }
  if (btnCloseSwapModal) btnCloseSwapModal.addEventListener('click', closeSwapModal);
  if (btnCancelSwap) btnCancelSwap.addEventListener('click', closeSwapModal);

  // 10. Monthly Assembly Modal (8:00 AM)
  function openAssemblyModal() {
    if (assemblyDate) {
      const sat = new Date(activeMonday);
      sat.setDate(activeMonday.getDate() + 5);
      const satStr = toYMD(sat);
      assemblyDate.value = satStr;
      if (assemblyFp) assemblyFp.setDate(satStr);
    }
    if (monthlyModal) monthlyModal.classList.add('active');
  }
  function closeAssemblyModal() {
    if (monthlyModal) monthlyModal.classList.remove('active');
  }
  if (btnOpenMonthlyModal) btnOpenMonthlyModal.addEventListener('click', openAssemblyModal);
  if (btnCloseAssemblyModal) btnCloseAssemblyModal.addEventListener('click', closeAssemblyModal);
  if (btnCancelAssembly) btnCancelAssembly.addEventListener('click', closeAssemblyModal);

  if (assemblyForm) {
    assemblyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        date: assemblyDate.value,
        location: assemblyLocation.value.trim()
      };

      try {
        const resp = await fetch('/api/meetings/schedule-monthly-assembly', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resp.ok) {
          closeAssemblyModal();
          await loadMeetings();
        } else {
          alert('Failed to schedule assembly');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // 11. Ad-hoc Meeting Modal
  function openAdhocModal() {
    const todayStr = toYMD(new Date());
    if (inputMtgDate) inputMtgDate.value = todayStr;
    if (meetingFp) meetingFp.setDate(todayStr);
    if (meetingModal) meetingModal.classList.add('active');
  }
  function closeAdhocModal() {
    if (meetingModal) meetingModal.classList.remove('active');
  }
  if (btnOpenScheduleModal) btnOpenScheduleModal.addEventListener('click', openAdhocModal);
  if (btnCloseMeetingModal) btnCloseMeetingModal.addEventListener('click', closeAdhocModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeAdhocModal);

  if (meetingForm) {
    meetingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: inputMtgTitle.value.trim(),
        date: inputMtgDate.value,
        company: inputMtgCompany.value,
        time: inputMtgTime.value.trim() || '11:00 AM – 06:00 PM',
        location: 'Head Office Boardroom',
        type: 'Executive Review'
      };

      try {
        const resp = await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (resp.ok) {
          closeAdhocModal();
          meetingForm.reset();
          await loadMeetings();
        } else {
          alert('Save failed');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  }

  // 12. Dropdown Filter Listeners
  if (filterCompanySelect) {
    filterCompanySelect.addEventListener('change', () => {
      filterCompany = filterCompanySelect.value;
      renderFilteredTable();
    });
  }

  if (filterDaySelect) {
    filterDaySelect.addEventListener('change', () => {
      filterDay = filterDaySelect.value;
      renderFilteredTable();
    });
  }

  if (filterPrioritySelect) {
    filterPrioritySelect.addEventListener('change', () => {
      filterPriority = filterPrioritySelect.value;
      renderFilteredTable();
    });
  }

  if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', () => {
      filterStatus = filterStatusSelect.value;
      renderFilteredTable();
    });
  }

  // 13. Executive Flatpickr Calendar Initialization
  function initFlatpickrDatepickers() {
    if (typeof flatpickr === 'undefined') return;

    rescheduleFp = flatpickr('#reschedule-new-date', {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'D, d M Y',
      altInputClass: 'form-input-text date-picker-input',
      disableMobile: true,
      defaultDate: 'today'
    });

    assemblyFp = flatpickr('#assembly-date', {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'D, d M Y',
      altInputClass: 'form-input-text date-picker-input',
      disableMobile: true,
      enable: [
        function(date) {
          // Allow Saturdays only for monthly OM & FM assembly
          return date.getDay() === 6;
        }
      ]
    });

    meetingFp = flatpickr('#input-mtg-date', {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'D, d M Y',
      altInputClass: 'form-input-text date-picker-input',
      disableMobile: true,
      defaultDate: 'today'
    });
  }

  // 14. Executive Custom Dropdown List Enhancer
  function enhanceCustomDropdown(selectEl) {
    if (!selectEl || selectEl.dataset.enhanced) return;
    selectEl.dataset.enhanced = 'true';
    selectEl.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = 'custom-dropdown-wrap';
    if (selectEl.id) wrap.id = 'wrap-' + selectEl.id;
    if (selectEl.style.width) wrap.style.width = selectEl.style.width;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-dropdown-trigger';
    if (selectEl.style.width) trigger.style.width = '100%';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'dropdown-label';

    const caretSpan = document.createElement('span');
    caretSpan.className = 'dropdown-caret';
    caretSpan.textContent = '▼';

    trigger.appendChild(labelSpan);
    trigger.appendChild(caretSpan);

    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';

    function buildMenuItems() {
      menu.innerHTML = '';
      const currentVal = selectEl.value;
      let selectedText = '';

      Array.from(selectEl.options).forEach(opt => {
        const item = document.createElement('div');
        item.className = 'custom-dropdown-item';
        item.dataset.value = opt.value;

        const isSelected = opt.value === currentVal || (!currentVal && opt.selected);
        if (isSelected) {
          item.classList.add('selected');
          selectedText = opt.text;
        }

        item.innerHTML = `
          <span>${opt.text}</span>
          <span class="check-icon">✓</span>
        `;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          syncFromSelect();
          closeAllDropdowns();
        });

        menu.appendChild(item);
      });

      labelSpan.textContent = selectedText || (selectEl.options[0] ? selectEl.options[0].text : '');
    }

    function syncFromSelect() {
      const currentVal = selectEl.value;
      let selectedText = '';
      menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
        if (item.dataset.value === currentVal) {
          item.classList.add('selected');
          selectedText = item.querySelector('span').textContent;
        } else {
          item.classList.remove('selected');
        }
      });
      if (selectedText) {
        labelSpan.textContent = selectedText;
      }
    }

    buildMenuItems();

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = wrap.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) {
        wrap.classList.add('open');
      }
    });

    selectEl.addEventListener('change', syncFromSelect);

    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    selectEl.parentNode.insertBefore(wrap, selectEl.nextSibling);

    selectEl._rebuildCustomDropdown = buildMenuItems;
    selectEl._syncCustomDropdown = syncFromSelect;
  }

  function closeAllDropdowns() {
    document.querySelectorAll('.custom-dropdown-wrap.open').forEach(w => w.classList.remove('open'));
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown-wrap')) {
      closeAllDropdowns();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllDropdowns();
    }
  });

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      filterCompany = 'ALL';
      filterDay = 'ALL';
      filterPriority = 'ALL';
      filterStatus = 'ALL';

      if (filterCompanySelect) {
        filterCompanySelect.value = 'ALL';
        if (filterCompanySelect._syncCustomDropdown) filterCompanySelect._syncCustomDropdown();
      }
      if (filterDaySelect) {
        filterDaySelect.value = 'ALL';
        if (filterDaySelect._syncCustomDropdown) filterDaySelect._syncCustomDropdown();
      }
      if (filterPrioritySelect) {
        filterPrioritySelect.value = 'ALL';
        if (filterPrioritySelect._syncCustomDropdown) filterPrioritySelect._syncCustomDropdown();
      }
      if (filterStatusSelect) {
        filterStatusSelect.value = 'ALL';
        if (filterStatusSelect._syncCustomDropdown) filterStatusSelect._syncCustomDropdown();
      }

      renderFilteredTable();
    });
  }

  // Initial Execution
  initFlatpickrDatepickers();
  document.querySelectorAll('.custom-select').forEach(enhanceCustomDropdown);
  updateWeekLabel();
  loadMeetings();
});
