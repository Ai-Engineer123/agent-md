/**
 * ============================================================================
 * EXECUTIVE OPERATIONS AI AGENT — CLIENT CONTROLLER
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const liveClockEl = document.getElementById('live-clock');
  const liveDateEl = document.getElementById('live-date');
  const checklistContainer = document.getElementById('checklist-container');
  const progressText = document.getElementById('progress-text');
  const progressFill = document.getElementById('progress-fill');
  const percentageBadge = document.getElementById('percentage-badge');
  const btnTrigger = document.getElementById('btn-trigger-routine');
  const btnToggleLogs = document.getElementById('btn-toggle-logs');
  const btnCloseLogs = document.getElementById('btn-close-logs');
  const btnRefreshLogs = document.getElementById('btn-refresh-logs');
  const logsDrawer = document.getElementById('logs-drawer');
  const logsStream = document.getElementById('logs-stream');
  const logFilenameBadge = document.getElementById('log-filename-badge');
  const logEntryCount = document.getElementById('log-entry-count');
  const toast = document.getElementById('toast');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  let activeChecklist = null;

  // 0. Theme Manager (Light Theme Default)
  function initTheme() {
    const savedTheme = localStorage.getItem('agent_theme_pref') || 'light';
    applyTheme(savedTheme);
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

  // 1. Live Clock & Date in IST
  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    if (liveClockEl) liveClockEl.textContent = timeStr;
    if (liveDateEl) liveDateEl.textContent = dateStr;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // 2. Toast Notification
  function showToast(message, isSuccess = true) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isSuccess ? '#10b981' : '#ef4444';
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // 3. Fetch & Render Checklist
  async function loadChecklist() {
    try {
      const res = await fetch('/api/checklist');
      if (!res.ok) throw new Error('Failed to load checklist');
      const data = await res.json();
      activeChecklist = data;
      renderChecklist(data);
    } catch (err) {
      console.error(err);
      checklistContainer.innerHTML = `
        <div class="empty-state">
          <p style="color: #ef4444;">Error connecting to Agent API. Please make sure server is running.</p>
        </div>`;
    }
  }

  function renderChecklist(data) {
    // Update progress bar
    const total = data.total_items || 0;
    const completed = data.completed_items || 0;
    const aiVerified = data.ai_verified_count || 0;
    const pct = data.percentage || 0;

    progressText.textContent = `Manual: ${completed}/${total} Acknowledged • AI Verified: ${aiVerified}/${total} Tasks`;
    progressFill.style.width = `${pct}%`;
    percentageBadge.textContent = `${pct}%`;

    // Render cards
    checklistContainer.innerHTML = '';
    data.items.forEach(item => {
      const isManualDone = Boolean(item.completed || item.manual_verified);
      const card = document.createElement('article');
      card.className = `checklist-card ${isManualDone ? 'is-completed' : ''}`;
      card.id = `card-${item.id}`;

      let aiPillHtml = '';
      let tagClass = 'tag-manual';
      let tagLabel = '📋 MANUAL';

      if (item.ai_status === 'VERIFIED') {
        aiPillHtml = `<span class="ai-verified-pill pill-success" title="AI Verification: Passed">🤖 AI Verified ✓</span>`;
        tagClass = 'tag-verified';
        tagLabel = '✓ PASSED';
      } else if (item.ai_status === 'ATTENTION_REQUIRED') {
        aiPillHtml = `<span class="ai-verified-pill pill-warning" title="AI Alert: Attention Required">🤖 AI Alert ⚠️</span>`;
        tagClass = 'tag-attention';
        tagLabel = '⚠️ ATTENTION';
      } else if (item.ai_status === 'MANUAL_CHECK_REQUIRED') {
        aiPillHtml = `<span class="ai-verified-pill pill-manual" title="Manual Inspection Required">👤 Manual Check</span>`;
        tagClass = 'tag-manual';
        tagLabel = '📋 MANUAL';
      } else if (item.ai_status === 'AWAITING_SYNC' || item.ai_status === 'NOT_CHECKED_IN' || item.ai_status === 'PENDING_AUDIT') {
        aiPillHtml = `<span class="ai-verified-pill pill-pending" style="background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1;" title="Audit Not Run Yet">⏳ Not Run Yet</span>`;
        tagClass = 'tag-manual';
        tagLabel = '⏳ NOT RUN YET';
      } else {
        aiPillHtml = `<span class="ai-verified-pill pill-pending" title="AI Audit Pending">🤖 AI Reviewing...</span>`;
        tagClass = 'tag-manual';
        tagLabel = '⏳ PENDING';
      }

      card.innerHTML = `
        <div class="card-top">
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="item-index-badge">TASK #${String(item.number).padStart(2, '0')}</span>
            <span class="card-category-badge">${item.category}</span>
          </div>
          ${aiPillHtml}
        </div>

        <div class="item-header-row">
          <label class="custom-checkbox-container" title="Click to manually verify / acknowledge task">
            <input type="checkbox" id="check-${item.id}" ${isManualDone ? 'checked' : ''} data-id="${item.id}">
            <span class="checkmark"></span>
          </label>
          <div class="item-titles">
            <h2 class="item-main-title">${item.title}</h2>
            <div class="executive-callout">🎯 "${item.english_summary || item.tanglish_summary}"</div>
            <p class="item-description">${item.description}</p>
          </div>
        </div>

        <div class="ai-feedback-section">
          <div class="ai-feedback-header">
            <span class="ai-feedback-label">🤖 AI Verification Observation</span>
            <span class="ai-eval-tag ${tagClass}">${tagLabel}</span>
          </div>
          <div class="ai-feedback-content">
            ${item.ai_feedback || 'AI analysis running in background...'}
          </div>
        </div>

        <div class="feedback-section">
          <label class="feedback-label" for="feedback-${item.id}">User Feedback / Directives & Remarks</label>
          <textarea 
            class="feedback-textarea" 
            id="feedback-${item.id}" 
            placeholder="Enter your custom feedback, action taken, or notes here..."
          >${item.user_feedback || item.feedback || ''}</textarea>
        </div>

        <div class="card-footer">
          <span class="status-indicator ${isManualDone ? 'status-done' : 'status-pending'}" id="status-${item.id}">
            ${isManualDone ? '✓ Manual Verified' : '⏳ Pending Manual Check'}
          </span>
          <button class="btn-save-item" data-id="${item.id}">Save Notes & Status</button>
        </div>
      `;

      checklistContainer.appendChild(card);
    });

    attachItemListeners();
  }

  // 4. Attach Event Listeners to Checklist Items
  function attachItemListeners() {
    // Checkbox toggles
    document.querySelectorAll('.custom-checkbox-container input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', async (e) => {
        const itemId = e.target.getAttribute('data-id');
        const isChecked = e.target.checked;
        const feedbackInput = document.getElementById(`feedback-${itemId}`);
        const feedback = feedbackInput ? feedbackInput.value : '';

        await submitItemUpdate(itemId, isChecked, feedback);
      });
    });

    // Save buttons
    document.querySelectorAll('.btn-save-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const itemId = e.target.getAttribute('data-id');
        const checkbox = document.getElementById(`check-${itemId}`);
        const feedbackInput = document.getElementById(`feedback-${itemId}`);
        const isChecked = checkbox ? checkbox.checked : false;
        const feedback = feedbackInput ? feedbackInput.value : '';

        await submitItemUpdate(itemId, isChecked, feedback, true);
      });
    });
  }

  // 5. Submit Update to Backend and log to JSONL
  async function submitItemUpdate(itemId, isChecked, feedback, isManualSave = false) {
    try {
      const res = await fetch('/api/checklist/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          completed: isChecked,
          feedback: feedback
        })
      });

      if (!res.ok) throw new Error('Save failed');

      const data = await res.json();
      const card = document.getElementById(`card-${itemId}`);
      const statusEl = document.getElementById(`status-${itemId}`);

      if (isChecked) {
        if (card) card.classList.add('is-completed');
        if (statusEl) {
          statusEl.textContent = '✓ Manual Verified';
          statusEl.className = 'status-indicator status-done';
        }
      } else {
        if (card) card.classList.remove('is-completed');
        if (statusEl) {
          statusEl.textContent = '⏳ Pending Manual Check';
          statusEl.className = 'status-indicator status-pending';
        }
      }

      showToast(isManualSave ? 'Feedback & Task status saved to JSONL!' : (isChecked ? 'Task marked complete & logged!' : 'Task unmarked & logged!'));

      // Refresh overall progress & live logs
      refreshProgress();
      if (logsDrawer.classList.contains('open')) {
        loadLogs();
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving update to server', false);
    }
  }

  // Helper to re-calc progress bar
  async function refreshProgress() {
    try {
      const res = await fetch('/api/checklist');
      if (res.ok) {
        const data = await res.json();
        progressText.textContent = `${data.completed_items} / ${data.total_items} Tasks Acknowledged`;
        progressFill.style.width = `${data.percentage}%`;
        percentageBadge.textContent = `${data.percentage}%`;
      }
    } catch (e) {
      // ignore
    }
  }

  // 6. Manual Trigger 10:30 AM Routine
  if (btnTrigger) {
    btnTrigger.addEventListener('click', async () => {
      try {
        btnTrigger.disabled = true;
        btnTrigger.innerHTML = '<span class="btn-icon">⏳</span><span>Triggering Routine...</span>';
        const res = await fetch('/api/checklist/trigger', { method: 'POST' });
        if (!res.ok) throw new Error('Trigger failed');
        const data = await res.json();
        renderChecklist(data);
        showToast('⏰ 10:30 AM Routine triggered! Checklist refreshed & logged.');
        if (logsDrawer.classList.contains('open')) loadLogs();
      } catch (err) {
        console.error(err);
        showToast('Failed to trigger routine', false);
      } finally {
        btnTrigger.disabled = false;
        btnTrigger.innerHTML = '<span class="btn-icon">⚡</span><span>Trigger 10:30 AM Routine Now</span>';
      }
    });
  }

  // 7. JSONL Logs Drawer Controls
  if (btnToggleLogs) {
    btnToggleLogs.addEventListener('click', () => {
      logsDrawer.classList.add('open');
      loadLogs();
    });
  }

  if (btnCloseLogs) {
    btnCloseLogs.addEventListener('click', () => {
      logsDrawer.classList.remove('open');
    });
  }

  if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', loadLogs);
  }

  async function loadLogs() {
    try {
      const res = await fetch('/api/logs/today');
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      logFilenameBadge.textContent = data.log_file || 'today.jsonl';
      logEntryCount.textContent = `${data.entries.length} entries recorded`;

      if (data.entries.length === 0) {
        logsStream.innerHTML = '<p class="empty-hint">No logs recorded for today yet.</p>';
        return;
      }

      logsStream.innerHTML = '';
      // Show newest first
      const reversed = [...data.entries].reverse();
      reversed.forEach(entry => {
        const rec = document.createElement('div');
        rec.className = 'log-record';
        const timeOnly = new Date(entry.timestamp).toLocaleTimeString();
        rec.innerHTML = `
          <div class="log-record-header">
            <span class="log-event-type">[${entry.event_type}]</span>
            <span class="log-time">${timeOnly}</span>
          </div>
          <pre class="log-json">${JSON.stringify(entry.payload, null, 2)}</pre>
        `;
        logsStream.appendChild(rec);
      });
    } catch (err) {
      console.error(err);
      logsStream.innerHTML = '<p style="color:#ef4444;">Error loading today\'s JSONL file.</p>';
    }
  }

  // Initial Load
  loadChecklist();
});
