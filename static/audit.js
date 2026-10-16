/**
 * ============================================================================
 * AGENT EXECUTIVE BRIEFING CONTROLLER (Dedicated for /audit)
 * ============================================================================
 * Exclusively displays the AI Agent's Executive Summary and operational
 * intelligence generated via Ollama Cloud (gpt-oss:120b).
 */

document.addEventListener('DOMContentLoaded', () => {
  const filterDateInput = document.getElementById('filter-date');
  const dateBadge = document.getElementById('date-badge');
  const briefingContainer = document.getElementById('briefing-container');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  // 1. Local Date Helper (Avoids UTC offset issues)
  function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Theme Management (Light Theme Default)
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

  // 3. Default Date
  const localToday = getLocalDateString();
  if (filterDateInput) {
    filterDateInput.value = localToday;
    filterDateInput.addEventListener('change', () => {
      loadAgentSummary(filterDateInput.value);
    });
  }

  // 4. Fetch Agent Summary
  async function loadAgentSummary(dateStr) {
    const target = dateStr || localToday;
    try {
      if (dateBadge) dateBadge.textContent = `DATE: ${target}`;
      briefingContainer.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; color: var(--text-dim);">
          <div class="loading-spinner" style="width: 32px; height: 32px; border-width: 3px; border-top-color: var(--accent-cyan); margin-bottom: 16px;"></div>
          <p>Fetching Agent Executive Briefing for ${target}...</p>
        </div>
      `;

      // Fetch from API (reads directly from data/ai_reports/<date>.json)
      const res = await fetch(`/api/audit/data?date=${target}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load AI summary`);
      const data = await res.json();

      renderSummary(data);
    } catch (err) {
      console.error(err);
      briefingContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #ef4444;">
          <p style="font-weight: 700; margin-bottom: 8px;">Failed to load AI briefing.</p>
          <p style="font-size: 0.88rem; color: var(--text-dim);">${err.message}</p>
        </div>
      `;
    }
  }

  // 5. Clean / Strip Desk Checklist Section
  function removeDeskChecklist(md) {
    if (!md) return '';
    return md
      .replace(/(?:---|---)?\s*###?\s*.*(?:Checklist|Recap|Tick as you go|Walk‑through|Walk-through)[\s\S]*$/i, '')
      .replace(/(?:\n\s*[-*]\s*\[[ xX]\].*)+$/gi, '')
      .trim();
  }

  // 6. Render Briefing Body
  function renderSummary(data) {
    // Handle completely missing report
    if (data.status === 'NO_REPORTS_FOUND' || !data.ai_response_raw) {
      briefingContainer.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
          <div style="font-size: 2.8rem; margin-bottom: 14px;">📄</div>
          <h3 style="color: var(--text-heading); margin-bottom: 8px;">No Briefing Generated Yet for This Date</h3>
          <p style="font-size: 0.92rem; color: var(--text-dim); margin-bottom: 12px;">
            The agent has not generated an executive briefing for <strong>${data.date || filterDateInput.value}</strong>.
          </p>
        </div>
      `;
      return;
    }

    // Strip desk checklist section before rendering
    const cleanContent = removeDeskChecklist(data.ai_response_raw);

    // Render Clean Markdown to HTML via marked or fallback
    let renderedHtml = '';
    if (window.marked && typeof window.marked.parse === 'function') {
      renderedHtml = window.marked.parse(cleanContent);
    } else {
      renderedHtml = formatMarkdownFallback(cleanContent);
    }

    // Inject Fallback notice if displaying alternative date
    if (data.is_fallback) {
      renderedHtml = `
        <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 8px; padding: 12px 18px; margin-bottom: 20px; font-size: 0.88rem; color: var(--text-main);">
          ⚠️ <strong>Notice:</strong> No briefing exists specifically for ${data.requested_date}. Displaying latest archived report from <strong>${data.date}</strong>.
        </div>
      ` + renderedHtml;
    }

    briefingContainer.innerHTML = renderedHtml;

    // Post-process table styling
    briefingContainer.querySelectorAll('table').forEach(tbl => {
      tbl.style.width = '100%';
    });

    // Inject interactive drill-down popup buttons next to task headings
    injectDrilldownButtons();
  }

  // 7. Fallback Markdown Formatter
  function formatMarkdownFallback(md) {
    if (!md) return '';
    return md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="font-family:var(--font-mono);">$1</code>')
      .replace(/\n$/gim, '<br>');
  }

  // 8. Email Integration Handlers
  const btnPreviewEmail = document.getElementById('btn-preview-email');
  const btnOpenEmailModal = document.getElementById('btn-open-email-modal');
  const emailModal = document.getElementById('email-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnConfirmSend = document.getElementById('btn-confirm-send');
  const btnSendText = document.getElementById('btn-send-text');
  const btnSendSpinner = document.getElementById('btn-send-spinner');
  const inputRecipientEmail = document.getElementById('input-recipient-email');
  const modalDateDisplay = document.getElementById('modal-date-display');
  const emailStatusBox = document.getElementById('email-status-box');

  function updatePreviewUrl(dateVal) {
    if (btnPreviewEmail) {
      btnPreviewEmail.href = `/api/email/preview-html?date=${encodeURIComponent(dateVal || localToday)}`;
    }
  }

  if (filterDateInput) {
    filterDateInput.addEventListener('change', () => {
      updatePreviewUrl(filterDateInput.value);
    });
  }
  updatePreviewUrl(localToday);

  // Modal interactions
  function openEmailModal() {
    if (!emailModal) return;
    const curDate = filterDateInput ? filterDateInput.value : localToday;
    if (modalDateDisplay) modalDateDisplay.textContent = curDate;
    if (inputRecipientEmail) {
      const savedEmail = localStorage.getItem('agent_recipient_email') || '';
      inputRecipientEmail.value = savedEmail;
    }
    if (emailStatusBox) {
      emailStatusBox.style.display = 'none';
      emailStatusBox.innerHTML = '';
    }
    emailModal.classList.add('active');
    if (inputRecipientEmail) inputRecipientEmail.focus();
  }

  function closeEmailModal() {
    if (emailModal) emailModal.classList.remove('active');
  }

  if (btnOpenEmailModal) btnOpenEmailModal.addEventListener('click', openEmailModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeEmailModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeEmailModal);

  if (emailModal) {
    emailModal.addEventListener('click', (e) => {
      if (e.target === emailModal) closeEmailModal();
    });
  }

  // Dispatch Email
  if (btnConfirmSend) {
    btnConfirmSend.addEventListener('click', async () => {
      const email = inputRecipientEmail ? inputRecipientEmail.value.trim() : '';
      if (!email || !email.includes('@')) {
        showEmailStatus('Please enter a valid email address.', 'error');
        return;
      }

      const curDate = filterDateInput ? filterDateInput.value : localToday;

      // Start sending UI state
      btnConfirmSend.disabled = true;
      if (btnSendSpinner) btnSendSpinner.style.display = 'inline-block';
      if (btnSendText) btnSendText.textContent = 'Sending...';
      if (emailStatusBox) emailStatusBox.style.display = 'none';

      try {
        const res = await fetch('/api/email/send-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: email,
            date: curDate
          })
        });

        const result = await res.json();

        if (result.success) {
          localStorage.setItem('agent_recipient_email', email);
          showEmailStatus(`✅ Briefing email dispatched successfully to <strong>${result.recipient}</strong>!`, 'success');
          setTimeout(() => {
            closeEmailModal();
          }, 2400);
        } else if (result.status === 'SMTP_NOT_CONFIGURED') {
          showEmailStatus(`ℹ️ <strong>SMTP Not Configured:</strong> SMTP credentials need to be set in <code>.env</code>.<br><br>HTML briefing preview generated at:<br><code>${result.preview_saved_to}</code>`, 'warning');
        } else {
          showEmailStatus(`❌ <strong>Failed:</strong> ${result.error || result.message || 'Unknown error occurred.'}`, 'error');
        }
      } catch (err) {
        showEmailStatus(`❌ <strong>Connection Error:</strong> ${err.message}`, 'error');
      } finally {
        btnConfirmSend.disabled = false;
        if (btnSendSpinner) btnSendSpinner.style.display = 'none';
        if (btnSendText) btnSendText.textContent = 'Send Briefing';
      }
    });
  }

  function showEmailStatus(html, type) {
    if (!emailStatusBox) return;
    emailStatusBox.style.display = 'block';
    if (type === 'success') {
      emailStatusBox.style.background = 'rgba(16, 185, 129, 0.15)';
      emailStatusBox.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      emailStatusBox.style.color = '#34d399';
    } else if (type === 'warning') {
      emailStatusBox.style.background = 'rgba(245, 158, 11, 0.15)';
      emailStatusBox.style.border = '1px solid rgba(245, 158, 11, 0.4)';
      emailStatusBox.style.color = '#fbbf24';
    } else {
      emailStatusBox.style.background = 'rgba(239, 68, 68, 0.15)';
      emailStatusBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      emailStatusBox.style.color = '#f87171';
    }
    emailStatusBox.innerHTML = html;
  }

  // 9. Twilio Voice Call Integration Handlers
  const btnOpenCallModal = document.getElementById('btn-open-call-modal');
  const callModal = document.getElementById('call-modal');
  const btnCloseCallModal = document.getElementById('btn-close-call-modal');
  const btnCancelCallModal = document.getElementById('btn-cancel-call-modal');
  const btnConfirmCall = document.getElementById('btn-confirm-call');
  const btnCallText = document.getElementById('btn-call-text');
  const btnCallSpinner = document.getElementById('btn-call-spinner');
  const inputRecipientPhone = document.getElementById('input-recipient-phone');
  const callSpeechPreview = document.getElementById('call-speech-preview');
  const callStatusBox = document.getElementById('call-status-box');

  async function openCallModal() {
    if (!callModal) return;
    const curDate = filterDateInput ? filterDateInput.value : localToday;

    if (callStatusBox) {
      callStatusBox.style.display = 'none';
      callStatusBox.innerHTML = '';
    }

    // Pre-fill phone number from storage if available
    const savedPhone = localStorage.getItem('agent_recipient_phone') || '';
    if (inputRecipientPhone && savedPhone) {
      inputRecipientPhone.value = savedPhone;
    }

    callModal.classList.add('active');

    // Fetch live speech preview
    if (callSpeechPreview) {
      callSpeechPreview.innerHTML = '<span style="color: var(--text-dim);">Synthesizing speech script for phone call...</span>';
      try {
        const res = await fetch(`/api/twilio/preview-speech?date=${encodeURIComponent(curDate)}`);
        if (res.ok) {
          const data = await res.json();
          callSpeechPreview.textContent = data.speech_text || 'No speech available';
          if (data.configured_recipient && inputRecipientPhone && !inputRecipientPhone.value) {
            inputRecipientPhone.value = data.configured_recipient;
          }
        } else {
          callSpeechPreview.textContent = 'Could not load speech preview.';
        }
      } catch (e) {
        callSpeechPreview.textContent = `Error loading speech preview: ${e.message}`;
      }
    }

    if (inputRecipientPhone) inputRecipientPhone.focus();
  }

  function closeCallModal() {
    if (callModal) callModal.classList.remove('active');
  }

  if (btnOpenCallModal) btnOpenCallModal.addEventListener('click', openCallModal);
  if (btnCloseCallModal) btnCloseCallModal.addEventListener('click', closeCallModal);
  if (btnCancelCallModal) btnCancelCallModal.addEventListener('click', closeCallModal);

  if (callModal) {
    callModal.addEventListener('click', (e) => {
      if (e.target === callModal) closeCallModal();
    });
  }

  // Trigger outbound call
  if (btnConfirmCall) {
    btnConfirmCall.addEventListener('click', async () => {
      const phone = inputRecipientPhone ? inputRecipientPhone.value.trim() : '';
      if (!phone || phone.length < 8) {
        showCallStatus('Please enter a valid phone number (e.g. +919876543210).', 'error');
        return;
      }

      const curDate = filterDateInput ? filterDateInput.value : localToday;

      btnConfirmCall.disabled = true;
      if (btnCallSpinner) btnCallSpinner.style.display = 'inline-block';
      if (btnCallText) btnCallText.textContent = 'Dialing...';
      if (callStatusBox) callStatusBox.style.display = 'none';

      try {
        const res = await fetch('/api/twilio/trigger-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_phone: phone,
            date: curDate
          })
        });

        const result = await res.json();

        if (result.success) {
          localStorage.setItem('agent_recipient_phone', phone);
          showCallStatus(`✅ <strong>Call Initiated!</strong> Twilio is dialing <strong>${result.recipient}</strong>.<br><small style="color:var(--text-dim);">Call SID: ${result.call_sid}</small>`, 'success');
          setTimeout(() => {
            closeCallModal();
          }, 3500);
        } else if (result.status === 'TWILIO_NOT_CONFIGURED') {
          showCallStatus(`ℹ️ <strong>Twilio Not Configured:</strong> Set <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code>, and <code>TWILIO_PHONE_NUMBER</code> in <code>.env</code>.`, 'warning');
        } else {
          showCallStatus(`❌ <strong>Call Failed:</strong> ${result.error || result.message || 'Unknown error'}`, 'error');
        }
      } catch (err) {
        showCallStatus(`❌ <strong>Connection Error:</strong> ${err.message}`, 'error');
      } finally {
        btnConfirmCall.disabled = false;
        if (btnCallSpinner) btnCallSpinner.style.display = 'none';
        if (btnCallText) btnCallText.textContent = 'Dial Phone Call';
      }
    });
  }

  function showCallStatus(html, type) {
    if (!callStatusBox) return;
    callStatusBox.style.display = 'block';
    if (type === 'success') {
      callStatusBox.style.background = 'rgba(16, 185, 129, 0.15)';
      callStatusBox.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      callStatusBox.style.color = '#34d399';
    } else if (type === 'warning') {
      callStatusBox.style.background = 'rgba(245, 158, 11, 0.15)';
      callStatusBox.style.border = '1px solid rgba(245, 158, 11, 0.4)';
      callStatusBox.style.color = '#fbbf24';
    } else {
      callStatusBox.style.background = 'rgba(239, 68, 68, 0.15)';
      callStatusBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      callStatusBox.style.color = '#f87171';
    }
    callStatusBox.innerHTML = html;
  }

  // 10. Audit Drill-Down Modal & Task Buttons
  const drilldownModal = document.getElementById('drilldown-modal');
  const btnCloseDrilldownModal = document.getElementById('btn-close-drilldown-modal');
  const drilldownModalTitle = document.getElementById('drilldown-modal-title');
  const drilldownModalSubtitle = document.getElementById('drilldown-modal-subtitle');
  const drilldownModalBody = document.getElementById('drilldown-modal-body');

  function injectDrilldownButtons() {
    if (!briefingContainer) return;

    // Helper to normalize dashes, unicode hyphens, and whitespace
    function normText(str) {
      return (str || '')
        .toLowerCase()
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015-]/g, ' ')
        .replace(/[&]/g, 'and')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Scan headings and strong title elements
    const elements = briefingContainer.querySelectorAll('h2, h3, h4, strong');
    elements.forEach(el => {
      const targetEl = (el.tagName === 'STRONG' && el.parentElement) ? el.parentElement : el;
      const text = normText(el.textContent);

      // 1. Workforce & Roll-Call Audit (Tasks 1 & 3)
      if ((text.includes('workforce') || text.includes('roll call') || (text.includes('tasks 1') && text.includes('3'))) && !briefingContainer.querySelector('[data-drilldown-type="workforce"]')) {
        const btn = document.createElement('button');
        btn.className = 'btn-drilldown-action amber';
        btn.setAttribute('data-drilldown-type', 'workforce');
        btn.innerHTML = '<span>👥 View Leave & Absent Staff</span>';
        btn.title = 'View Employees on Leave and Staff Missing Check-in';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDrilldownModal('workforce');
        });
        targetEl.appendChild(btn);
      }

      // 2. VFM Portal & Work-Update Snapshot (Task 5)
      else if ((text.includes('vfm portal') || text.includes('work update snapshot') || text.includes('vfm employee work updates') || (text.includes('vfm') && text.includes('work update'))) && !briefingContainer.querySelector('[data-drilldown-type="vfm"]')) {
        const btn = document.createElement('button');
        btn.className = 'btn-drilldown-action emerald';
        btn.setAttribute('data-drilldown-type', 'vfm');
        btn.innerHTML = '<span>📋 View Submitted Updates (3)</span>';
        btn.title = 'View Staff who Submitted Yesterday Work Updates';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDrilldownModal('vfm');
        });
        targetEl.appendChild(btn);
      }

      // 3. Site Operations & DMR Compliance (Task 7)
      else if ((text.includes('dmr compliance') || text.includes('site operations') || (text.includes('dmr') && text.includes('task 7'))) && !briefingContainer.querySelector('[data-drilldown-type="dmr"]')) {
        const btn = document.createElement('button');
        btn.className = 'btn-drilldown-action';
        btn.setAttribute('data-drilldown-type', 'dmr');
        btn.innerHTML = '<span>🏗️ View Submitted Sites</span>';
        btn.title = 'View Submitted FMS Site Codes, Names, and Submitters';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openDrilldownModal('dmr');
        });
        targetEl.appendChild(btn);
      }
    });
  }

  async function openDrilldownModal(type) {
    if (!drilldownModal) return;
    const curDate = filterDateInput ? filterDateInput.value : localToday;

    drilldownModal.classList.add('active');
    drilldownModalBody.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--text-dim);">
        <div class="loading-spinner" style="width: 32px; height: 32px; border-width: 3px; border-top-color: var(--accent-cyan); margin-bottom: 14px;"></div>
        <p style="font-size: 0.95rem;">Retrieving verified local database records for ${curDate}...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/audit/drilldown?date=${encodeURIComponent(curDate)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch drilldown data`);
      const ddData = await res.json();

      if (type === 'workforce') {
        renderWorkforceDrilldown(ddData);
      } else if (type === 'vfm') {
        renderVfmDrilldown(ddData);
      } else if (type === 'dmr') {
        renderDmrDrilldown(ddData);
      }
    } catch (err) {
      drilldownModalBody.innerHTML = `
        <div style="text-align: center; padding: 36px 20px; color: #ef4444;">
          <p style="font-weight: 700; margin-bottom: 6px;">Failed to load drill-down records.</p>
          <p style="font-size: 0.88rem; color: var(--text-dim);">${err.message}</p>
        </div>
      `;
    }
  }

  function closeDrilldownModal() {
    if (drilldownModal) drilldownModal.classList.remove('active');
  }

  if (btnCloseDrilldownModal) btnCloseDrilldownModal.addEventListener('click', closeDrilldownModal);
  if (drilldownModal) {
    drilldownModal.addEventListener('click', (e) => {
      if (e.target === drilldownModal) closeDrilldownModal();
    });
  }

  // Render Section 1: Workforce Drilldown
  function renderWorkforceDrilldown(ddData) {
    const wf = ddData.workforce || {};
    const onLeave = wf.on_leave || [];
    const unchecked = wf.not_checked_in || [];

    if (drilldownModalTitle) {
      drilldownModalTitle.innerHTML = '👥 Workforce Exceptions: Leave & Unchecked Staff';
      drilldownModalTitle.style.color = '#fbbf24';
    }
    if (drilldownModalSubtitle) {
      drilldownModalSubtitle.textContent = `Date: ${ddData.effective_date} • Head Office Staff & Company In-charges Exceptions`;
    }

    let leaveTableHtml = '';
    if (onLeave.length === 0) {
      leaveTableHtml = '<p style="color: var(--text-muted); padding: 14px 0;">No employees marked on leave for this date.</p>';
    } else {
      leaveTableHtml = `
        <table class="dd-table">
          <thead>
            <tr>
              <th>Emp No</th>
              <th>Staff Name</th>
              <th>Role / Designation</th>
              <th>Unit / Site</th>
              <th>Leave Type</th>
              <th>Reason</th>
              <th>Approval</th>
            </tr>
          </thead>
          <tbody>
            ${onLeave.map(s => `
              <tr>
                <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">${s.employee_id || '--'}</td>
                <td style="font-weight: 700; color: var(--text-heading);">${s.employee_name}</td>
                <td style="color: var(--text-muted); font-size: 0.82rem;">${s.role}</td>
                <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--accent-cyan);">${s.unit}</span></td>
                <td><span class="badge-pill leave">${s.leave_type}</span></td>
                <td style="font-size: 0.84rem; color: var(--text-main);">${s.reason}</td>
                <td><span style="font-size: 0.78rem; font-weight: 700; color: var(--accent-green);">${s.approval_status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    let uncheckedTableHtml = '';
    if (unchecked.length === 0) {
      uncheckedTableHtml = '<p style="color: var(--text-muted); padding: 14px 0;">All scheduled employees have checked in successfully!</p>';
    } else {
      uncheckedTableHtml = `
        <table class="dd-table">
          <thead>
            <tr>
              <th>Emp No</th>
              <th>Staff Name</th>
              <th>Role / Designation</th>
              <th>Unit / Company</th>
              <th>Attendance Status</th>
              <th>Last Known Check-In</th>
            </tr>
          </thead>
          <tbody>
            ${unchecked.map(s => `
              <tr>
                <td style="font-family: var(--font-mono); font-weight: 700; color: #dc2626;">${s.employee_id || '--'}</td>
                <td style="font-weight: 700; color: var(--text-heading);">${s.employee_name}</td>
                <td style="color: var(--text-muted); font-size: 0.82rem;">${s.role}</td>
                <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--accent-cyan);">${s.unit}</span></td>
                <td><span class="badge-pill unchecked">NOT CHECKED IN</span></td>
                <td style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                  ${s.last_known_checkin ? s.last_known_checkin.replace('T', ' ').slice(0, 16) : 'Never Checked In'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    drilldownModalBody.innerHTML = `
      <div class="drilldown-tabs">
        <button id="tab-btn-leave" class="drilldown-tab-btn active">🏖️ On Leave (${onLeave.length})</button>
        <button id="tab-btn-unchecked" class="drilldown-tab-btn">⚠️ Not Checked-In (${unchecked.length})</button>
      </div>

      <div id="tab-pane-leave" style="display: block;">
        <div style="margin-bottom: 12px; font-size: 0.84rem; color: var(--text-muted); font-weight: 500;">
          Staff approved on casual leave or scheduled leave for today:
        </div>
        ${leaveTableHtml}
      </div>

      <div id="tab-pane-unchecked" style="display: none;">
        <div style="margin-bottom: 12px; font-size: 0.84rem; color: var(--text-muted); font-weight: 500;">
          Employees who have not checked in today across Head Office & Company In-charges:
        </div>
        ${uncheckedTableHtml}
      </div>
    `;

    // Tab switching handlers
    const tabBtnLeave = document.getElementById('tab-btn-leave');
    const tabBtnUnchecked = document.getElementById('tab-btn-unchecked');
    const tabPaneLeave = document.getElementById('tab-pane-leave');
    const tabPaneUnchecked = document.getElementById('tab-pane-unchecked');

    if (tabBtnLeave && tabBtnUnchecked) {
      tabBtnLeave.addEventListener('click', () => {
        tabBtnLeave.classList.add('active');
        tabBtnUnchecked.classList.remove('active');
        if (tabPaneLeave) tabPaneLeave.style.display = 'block';
        if (tabPaneUnchecked) tabPaneUnchecked.style.display = 'none';
      });

      tabBtnUnchecked.addEventListener('click', () => {
        tabBtnUnchecked.classList.add('active');
        tabBtnLeave.classList.remove('active');
        if (tabPaneUnchecked) tabPaneUnchecked.style.display = 'block';
        if (tabPaneLeave) tabPaneLeave.style.display = 'none';
      });
    }
  }

  // Render Section 2: VFM Portal Activity Drilldown
  function renderVfmDrilldown(ddData) {
    const vfm = ddData.vfm_portal || {};
    const submittedUsers = vfm.submitted_users || [];
    const metrics = vfm.metrics || {};

    if (drilldownModalTitle) {
      drilldownModalTitle.innerHTML = '📋 VFM Portal Work Updates Activity';
      drilldownModalTitle.style.color = 'var(--accent-green)';
    }
    if (drilldownModalSubtitle) {
      drilldownModalSubtitle.textContent = `Date: ${ddData.effective_date} • Submitted Yesterday: ${metrics.submitted_count} of ${metrics.total_users} Users (${metrics.compliance_percent}%)`;
    }

    let contentHtml = '';
    if (submittedUsers.length === 0) {
      contentHtml = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <p>No work updates were submitted on the VFM portal yesterday.</p>
        </div>
      `;
    } else {
      contentHtml = `
        <div style="display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap;">
          <div style="background: var(--bg-core); padding: 12px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); flex: 1; min-width: 140px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Users</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-heading); margin-top: 2px;">${metrics.total_users}</div>
          </div>
          <div style="background: #ecfdf5; padding: 12px 18px; border-radius: 10px; border: 1px solid #a7f3d0; flex: 1; min-width: 140px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #059669; text-transform: uppercase;">Submitted Updates</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #059669; margin-top: 2px;">${metrics.submitted_count}</div>
          </div>
          <div style="background: #fef2f2; padding: 12px 18px; border-radius: 10px; border: 1px solid #fecaca; flex: 1; min-width: 140px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #dc2626; text-transform: uppercase;">Pending / Defaulting</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #dc2626; margin-top: 2px;">${metrics.pending_count}</div>
          </div>
        </div>

        <table class="dd-table">
          <thead>
            <tr>
              <th>Emp ID</th>
              <th>Employee Name</th>
              <th>Designation</th>
              <th>Site</th>
              <th>Work Type</th>
              <th>Update Title & Notes</th>
              <th>Submitted Time</th>
            </tr>
          </thead>
          <tbody>
            ${submittedUsers.map(u => `
              <tr>
                <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">${u.employee_id || '--'}</td>
                <td style="font-weight: 700; color: var(--text-heading); white-space: nowrap;">${u.name}</td>
                <td style="color: var(--text-muted); font-size: 0.82rem;">${u.designation}</td>
                <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--accent-cyan);">${u.site_name || u.site_code}</span></td>
                <td><span style="font-size: 0.78rem; font-weight: 600; color: #0284c7; background: #e0f2fe; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 4px;">${u.work_type}</span></td>
                <td style="font-size: 0.84rem; max-width: 280px;">
                  <strong style="color: var(--text-heading); display: block; margin-bottom: 3px;">${u.title}</strong>
                  <span style="color: var(--text-muted); font-size: 0.78rem; line-height: 1.4;">${u.summary_snippet || ''}</span>
                </td>
                <td style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap;">
                  ${u.submitted_at ? u.submitted_at.replace('T', ' ').slice(0, 16) : '--'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    drilldownModalBody.innerHTML = contentHtml;
  }

  // Render Section 3: DMR Compliance Drilldown
  function renderDmrDrilldown(ddData) {
    const dmr = ddData.dmr_compliance || {};
    const submittedSites = dmr.submitted_sites || [];
    const metrics = dmr.metrics || {};

    if (drilldownModalTitle) {
      drilldownModalTitle.innerHTML = '🏗️ Site Operations & DMR Compliance (Task 7)';
      drilldownModalTitle.style.color = 'var(--accent-cyan)';
    }
    if (drilldownModalSubtitle) {
      drilldownModalSubtitle.textContent = `Date: ${ddData.effective_date} • FMS DMR Submitted: ${metrics.submitted_count} of ${metrics.total_fms_sites} Sites (${metrics.compliance_percent}%)`;
    }

    let contentHtml = '';
    if (submittedSites.length === 0) {
      contentHtml = `
        <div style="text-align: center; padding: 30px; color: var(--text-muted);">
          <p>No DMR reports submitted for this date.</p>
        </div>
      `;
    } else {
      contentHtml = `
        <div style="display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap;">
          <div style="background: var(--bg-core); padding: 12px 18px; border-radius: 10px; border: 1px solid var(--border-subtle); flex: 1; min-width: 130px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total FMS Sites</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-heading); margin-top: 2px;">${metrics.total_fms_sites}</div>
          </div>
          <div style="background: #e0f2fe; padding: 12px 18px; border-radius: 10px; border: 1px solid #7dd3fc; flex: 1; min-width: 130px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #0284c7; text-transform: uppercase;">Submitted Sites</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #0284c7; margin-top: 2px;">${metrics.submitted_count}</div>
          </div>
          <div style="background: #fef3c7; padding: 12px 18px; border-radius: 10px; border: 1px solid #fde68a; flex: 1; min-width: 130px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #b45309; text-transform: uppercase;">Pending Sites</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #b45309; margin-top: 2px;">${metrics.pending_count}</div>
          </div>
          <div style="background: #ecfdf5; padding: 12px 18px; border-radius: 10px; border: 1px solid #a7f3d0; flex: 1; min-width: 130px;">
            <div style="font-size: 0.74rem; font-weight: 700; color: #059669; text-transform: uppercase;">Compliance Rate</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: #059669; margin-top: 2px;">${metrics.compliance_percent}%</div>
          </div>
        </div>

        <table class="dd-table">
          <thead>
            <tr>
              <th>Site Code</th>
              <th>Site Name</th>
              <th>Submitted By</th>
              <th>Designation</th>
              <th>Report Title</th>
              <th>Submitted Time</th>
              <th>Attachment</th>
            </tr>
          </thead>
          <tbody>
            ${submittedSites.map(s => `
              <tr>
                <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-cyan);">${s.unit_code}</td>
                <td style="font-weight: 700; color: var(--text-heading); max-width: 200px;">${s.site_name}</td>
                <td style="font-weight: 700; color: #2563eb;">${s.submitted_by}</td>
                <td style="color: var(--text-muted); font-size: 0.82rem;">${s.designation}</td>
                <td style="font-size: 0.84rem; color: var(--text-main);">${s.report_title}</td>
                <td style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap;">
                  ${s.submitted_at ? s.submitted_at.replace('T', ' ').slice(0, 16) : '--'}
                </td>
                <td>
                  ${s.attachment_url ? `
                    <a href="${s.attachment_url}" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #059669; text-decoration: none; font-size: 0.78rem; font-weight: 700;">
                      📊 Excel
                    </a>
                  ` : '<span style="color: var(--text-muted); font-size: 0.78rem;">No file</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    drilldownModalBody.innerHTML = contentHtml;
  }

  // Initial Load with Local Date
  loadAgentSummary(localToday);
});
