import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  CalendarOff,
  Clock,
  Calendar,
  Building2,
  DollarSign,
  FileText,
  ExternalLink,
  Users
} from 'lucide-react';
import { playMechanicalClick } from '../audio/soundEffects';

export const AuditDrilldownModals = ({
  activeModal,
  onClose,
  drilldownData,
  accountsData,
  ticketsData,
  dmrData,
  planData,
  initialTab = null,
  selectedDate = null
}) => {
  const displayDate = selectedDate || drilldownData?.effective_date || 'Selected Date';
  const [workforceModalTab, setWorkforceModalTab] = useState('checked'); // 'checked' | 'unchecked' | 'leave'
  const [vfmModalTab, setVfmModalTab] = useState('submitted'); // 'submitted' | 'not_submitted'
  const [dmrModalTab, setDmrModalTab] = useState('submitted'); // 'submitted' | 'pending'
  const [ticketsModalTab, setTicketsModalTab] = useState('danger'); // 'danger' | 'internal' | 'external' | 'all'
  const [planModalTab, setPlanModalTab] = useState('yesterday'); // 'yesterday' | 'today' | 'week' | 'assets'
  const [imprestModalTab, setImprestModalTab] = useState('active'); // 'active' | 'all_unsettled' | 'overdue'

  useEffect(() => {
    if (initialTab) {
      if (activeModal === 'workforce') setWorkforceModalTab(initialTab);
      if (activeModal === 'vfm') setVfmModalTab(initialTab);
      if (activeModal === 'dmr') setDmrModalTab(initialTab);
      if (activeModal === 'tickets') setTicketsModalTab(initialTab);
      if (activeModal === 'plan') setPlanModalTab(initialTab);
      if (activeModal === 'imprest') setImprestModalTab(initialTab);
    }
  }, [activeModal, initialTab]);

  if (!activeModal) return null;

  // 12-hour AM/PM Formatter
  // 12-hour AM/PM Formatter (with UTC -> Local IST awareness)
  const format12HourTime = (date) => {
    if (!date) return '';
    let val = String(date).trim();
    if (/\b(AM|PM)\b/i.test(val)) return val;
    if (val.includes('T') && !val.endsWith('Z') && !/\+\d{2}:\d{2}$/.test(val) && !/-\d{2}:\d{2}$/.test(val)) {
      val = val + 'Z';
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(date);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m}:${s} ${ampm}`;
  };

  // Full Date & Time Formatter
  const formatDateTimeDisplay = (isoStr) => {
    if (!isoStr) return null;
    try {
      let val = String(isoStr).trim();
      if (val.includes('T') && !val.endsWith('Z') && !/\+\d{2}:\d{2}$/.test(val) && !/-\d{2}:\d{2}$/.test(val)) {
        val = val + 'Z';
      }
      const d = new Date(val);
      let dateFormatted = String(isoStr).split('T')[0];
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

  const handleClose = () => {
    playMechanicalClick();
    if (onClose) onClose();
  };

  return (
    <div className="audit-modal-backdrop" onClick={handleClose}>
      <div className="audit-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL 1: WORKFORCE ATTENDANCE AUDIT */}
        {activeModal === 'workforce' && (
          <>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge-tag red">ROLL-CALL AUDIT</span>
                <h3 className="modal-title">Enterprise Workforce Attendance Audit</h3>
                <p className="modal-subtitle">
                  Itemized roll-call of personnel present, absent, or on approved leave • Date: {displayDate}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleClose} title="Close Modal">
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
                <span>Checked-In ({drilldownData?.workforce?.checked_in?.length || 0})</span>
              </button>
              <button
                onClick={() => setWorkforceModalTab('unchecked')}
                className={`modal-subnav-tab ${workforceModalTab === 'unchecked' ? 'active danger' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <AlertTriangle size={13} color={workforceModalTab === 'unchecked' ? '#FFFFFF' : '#DC2626'} />
                <span>Not Checked-In ({drilldownData?.workforce?.not_checked_in?.length || 0})</span>
              </button>
              <button
                onClick={() => setWorkforceModalTab('leave')}
                className={`modal-subnav-tab ${workforceModalTab === 'leave' ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <CalendarOff size={13} color={workforceModalTab === 'leave' ? '#FFFFFF' : '#D97706'} />
                <span>On Approved Leave ({drilldownData?.workforce?.on_leave?.length || 0})</span>
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
                  Tracking daily work update submissions across {drilldownData?.vfm_portal?.metrics?.total_users || (drilldownData?.vfm_portal?.submitted_users?.length || 0) + (drilldownData?.vfm_portal?.not_submitted_users?.length || 0)} registered portal staff • Date: {displayDate}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleClose} title="Close Modal">
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
                <span>Submitted Updates ({drilldownData?.vfm_portal?.submitted_users?.length || 0})</span>
              </button>
              <button
                onClick={() => setVfmModalTab('not_submitted')}
                className={`modal-subnav-tab ${vfmModalTab === 'not_submitted' ? 'active danger' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <AlertTriangle size={13} color={vfmModalTab === 'not_submitted' ? '#FFFFFF' : '#DC2626'} />
                <span>Not Submitted / Pending ({drilldownData?.vfm_portal?.not_submitted_users?.length || 0})</span>
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
                      <th>Work Description</th>
                      <th>Submission Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drilldownData?.vfm_portal?.submitted_users || []).map((user, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-cyan">#{user.user_id}</td>
                        <td className="font-bold text-dark">{user.user_name}</td>
                        <td className="text-secondary">{user.designation}</td>
                        <td>
                          <span className="unit-pill">{user.site_name}</span>
                        </td>
                        <td style={{ maxWidth: '300px' }}>
                          <div className="text-dark font-medium" style={{ fontSize: '12.5px', lineHeight: 1.4 }}>
                            {user.work_description}
                          </div>
                        </td>
                        <td className="font-semibold text-dark font-mono" style={{ fontSize: '11.5px' }}>
                          {user.submitted_at ? format12HourTime(user.submitted_at) : '—'}
                        </td>
                        <td>
                          <span className="status-badge-chip chip-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Submitted
                          </span>
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
                      <th>Designation / Role</th>
                      <th>Assigned Unit / Site</th>
                      <th>Status</th>
                      <th>Action Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(drilldownData?.vfm_portal?.not_submitted_users || []).map((user, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-cyan">#{user.user_id}</td>
                        <td className="font-bold text-dark">{user.user_name}</td>
                        <td className="text-secondary">{user.designation || 'Staff'}</td>
                        <td>
                          <span className="unit-pill">{user.site_name || 'Field Unit'}</span>
                        </td>
                        <td>
                          <span className="status-badge-chip chip-danger">Pending Update</span>
                        </td>
                        <td>
                          <span className="status-badge-chip chip-warning">Escalate to Supervisor</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* MODAL 3: DMR SITE OPERATIONS AUDIT */}
        {activeModal === 'dmr' && (
          <>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge-tag green">DMR AUDIT</span>
                <h3 className="modal-title">FMS Sites DMR Compliance Audit</h3>
                <p className="modal-subtitle">
                  Site operations report status across {drilldownData?.dmr_compliance?.metrics?.total_fms_sites || (drilldownData?.dmr_compliance?.submitted_sites?.length || 0) + (drilldownData?.dmr_compliance?.pending_sites?.length || 0)} active FMS customer sites • Date: {displayDate}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleClose} title="Close Modal">
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
                <span>Submitted DMRs ({drilldownData?.dmr_compliance?.submitted_sites?.length || 0})</span>
              </button>
              <button
                onClick={() => setDmrModalTab('pending')}
                className={`modal-subnav-tab ${dmrModalTab === 'pending' ? 'active warning' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <AlertTriangle size={13} color={dmrModalTab === 'pending' ? '#FFFFFF' : '#D97706'} />
                <span>Pending DMR Sites ({drilldownData?.dmr_compliance?.pending_sites?.length || 0})</span>
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
                        <td className="text-secondary">{site.location || 'Active FMS Contract'}</td>
                        <td>
                          <span className="status-badge-chip chip-danger">Pending DMR</span>
                        </td>
                        <td>
                          <span className="status-badge-chip chip-warning">Notify Site Manager</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* MODAL 4: OPERATIONAL & CUSTOMER TICKETS AUDIT */}
        {activeModal === 'tickets' && (
          <>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge-tag red">SLA DANGER</span>
                <h3 className="modal-title">Operational Tickets SLA Danger Audit</h3>
                <p className="modal-subtitle">
                  Immediate review of {drilldownData?.tickets?.danger_tickets?.length || 0} tickets overdue &gt; 3 days • Date: {displayDate}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleClose} title="Close Modal">
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
                <span>Danger Overdue ({drilldownData?.tickets?.danger_tickets?.length || 0})</span>
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
                <span>Internal Tickets ({drilldownData?.tickets?.internal_tickets?.length || 0})</span>
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
                <span>External Client ({drilldownData?.tickets?.external_tickets?.length || 0})</span>
              </button>
              <button
                onClick={() => {
                  playMechanicalClick();
                  setTicketsModalTab('all');
                }}
                className={`modal-subnav-tab ${ticketsModalTab === 'all' ? 'active neutral' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <FileText size={13} color={ticketsModalTab === 'all' ? '#FFFFFF' : '#475569'} />
                <span>All System Tickets ({drilldownData?.tickets?.all_tickets?.length || 0})</span>
              </button>
            </div>

            <div className="audit-modal-body">
              <table className="audit-modern-table modal-table">
                <thead>
                  <tr>
                    <th>Ticket Code</th>
                    <th>Type</th>
                    <th>Customer / Location</th>
                    <th>Subject & Scope</th>
                    <th>Days Overdue</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const ticketList =
                      ticketsModalTab === 'danger'
                        ? drilldownData?.tickets?.danger_tickets || []
                        : ticketsModalTab === 'internal'
                        ? drilldownData?.tickets?.internal_tickets || []
                        : ticketsModalTab === 'external'
                        ? drilldownData?.tickets?.external_tickets || []
                        : drilldownData?.tickets?.all_tickets || [];

                    if (ticketList.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="text-center text-secondary py-6">
                            No tickets matching current filter.
                          </td>
                        </tr>
                      );
                    }

                    return ticketList.map((t, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-cyan font-mono" style={{ fontSize: '11.5px' }}>
                          {t.ticket_code}
                        </td>
                        <td>
                          <span className={`unit-pill ${t.ticket_type === 'INTERNAL' ? 'type-internal' : 'type-external'}`}>
                            {t.ticket_type}
                          </span>
                        </td>
                        <td>
                          <div className="font-bold text-dark">{t.customer_name}</div>
                          {t.location && <div className="dmr-site-meta">{t.location}</div>}
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <div className="font-semibold text-dark" style={{ fontSize: '12.5px' }}>{t.subject}</div>
                          <div className="dmr-site-meta">{t.priority} Priority • {t.assigned_to}</div>
                        </td>
                        <td>
                          <span
                            className="status-badge-chip chip-danger"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <AlertTriangle size={12} /> {t.overdue_days} Days
                          </span>
                        </td>
                        <td className="text-secondary font-mono" style={{ fontSize: '11px' }}>
                          {t.created_at ? t.created_at.split('T')[0] : '—'}
                        </td>
                        <td>
                          <span className={`status-badge-chip ${t.status === 'CLOSED' ? 'chip-success' : 'chip-danger'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MODAL 5: 52 WEEKS OPERATIONAL MAINTENANCE AUDIT */}
        {activeModal === 'plan' && (
          <>
            <div className="audit-modal-header">
              <div className="modal-title-group">
                <span className="modal-badge-tag blue">52 WEEKS PPM</span>
                <h3 className="modal-title">Planned Operational Maintenance Audit</h3>
                <p className="modal-subtitle">
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    Week {planData?.metrics?.current_week_number || '--'} ({planData?.metrics?.total_tasks_this_week || 0} tasks)
                  </span>
                  {' — '}
                  Yesterday: {planData?.metrics?.yesterday_completed_tasks || 0} completed tasks • Today: {planData?.metrics?.today_total_tasks || 0} planned tasks across {planData?.metrics?.total_critical_assets_tracked || 0} tracked facility assets • Date: {displayDate}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleClose} title="Close Modal">
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
                <span>Yesterday Completed ({planData?.yesterday_completed_plan?.tasks?.length || planData?.metrics?.yesterday_completed_tasks || 0})</span>
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
                <span>Today Planned ({planData?.current_day_plan?.tasks?.length || planData?.metrics?.today_total_tasks || 0})</span>
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
                <span>Week {planData?.metrics?.current_week_number || '--'} Breakdown ({planData?.metrics?.total_tasks_this_week || 0})</span>
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
                <span>Assets Tracked ({planData?.metrics?.total_critical_assets_tracked || 0})</span>
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
                          {t.frequency && (
                            <span className="text-secondary" style={{ fontSize: '11px' }}>
                              Frequency: {t.frequency}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="status-badge-chip chip-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Completed
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
                      <th>Title & Scope</th>
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
                          <span className="unit-pill">{t.category || t.work_type || 'Maintenance'}</span>
                        </td>
                        <td>
                          <div className="font-bold text-dark">{t.assignee || 'Field Team'}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{t.work_type}</div>
                        </td>
                        <td>
                          <div className="font-semibold text-dark" style={{ maxWidth: '200px' }}>{t.site_name || 'Site Unit'}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{t.unit_code}</div>
                        </td>
                        <td style={{ maxWidth: '320px' }}>
                          <div className="font-bold text-dark" style={{ fontSize: '13px' }}>{t.title}</div>
                        </td>
                        <td>
                          <span className="status-badge-chip chip-warning">Planned Today</span>
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
                      <th>Total Tasks</th>
                      <th>Completed</th>
                      <th>Pending</th>
                      <th>Status Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(planData?.current_week_plan?.days || []).map((d, idx) => (
                      <tr key={idx}>
                        <td className="font-bold text-dark">{d.weekday || d.day_name}</td>
                        <td className="font-semibold">{d.total_tasks}</td>
                        <td className="text-secondary">{d.completed_tasks || 0}</td>
                        <td className="font-bold text-dark" style={{ color: d.pending_tasks > 0 ? '#D97706' : '#059669' }}>
                          {d.pending_tasks || 0}
                        </td>
                        <td>
                          <span className={`status-badge-chip ${d.pending_tasks === 0 ? 'chip-success' : 'chip-warning'}`}>
                            {d.pending_tasks === 0 ? 'All Completed' : `${d.pending_tasks} In Progress`}
                          </span>
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
                      <th>Asset Code</th>
                      <th>Asset Description</th>
                      <th>Category</th>
                      <th>Site Name</th>
                      <th>Tracked Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(planData?.critical_assets || []).map((a, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-cyan">{a.asset_code || `AST-${idx + 1}`}</td>
                        <td className="font-bold text-dark">{a.asset_name || a.description}</td>
                        <td>
                          <span className="unit-pill">{a.category || 'Mechanical'}</span>
                        </td>
                        <td className="text-secondary">{a.site_name || 'Field Unit'}</td>
                        <td>
                          <span className="status-badge-chip chip-success">Operational</span>
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
                  Tracking {accountsData?.imprest_audit?.current_month_activity?.month || 'Current Month'} active advances and aging cash held across operational in-charges • Date: {displayDate}
                </p>
              </div>
              <button className="modal-close-btn" onClick={handleClose} title="Close Modal">
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
                <span>Current Month Active ({accountsData?.imprest_audit?.current_month_activity?.active_holders_count ?? accountsData?.imprest_audit?.current_month_activity?.top_active_holders?.length ?? 0})</span>
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
                <span>All Unsettled Cash ({accountsData?.imprest_audit?.holders_with_unsettled_balance?.length || 0})</span>
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
                <span>Critical Overdue &gt;180d ({accountsData?.imprest_audit?.summary?.critical_overdue_holders || 0})</span>
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
  );
};
