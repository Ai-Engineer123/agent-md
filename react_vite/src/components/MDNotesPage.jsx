import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Send,
  Bot,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  User,
  Sparkles,
  Edit2,
  Check,
  BrainCircuit,
  LogOut,
  MessageSquare,
  Folder,
  ChevronRight,
  FileText,
  Copy,
  Database,
  Zap,
  Layers
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';

export const MDNotesPage = ({ onBack, currentTime, currentUser, onLogout, onOpenCompanyDataAI }) => {
  // Notes / Projects list
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [activeNote, setActiveNote] = useState(null);

  // Active chat thread inside current note
  const [activeChatId, setActiveChatId] = useState(null);

  // View Mode: 'chats' (inside a note looking at its chat history pages) or 'notes' (all notes list)
  const [viewMode, setViewMode] = useState('chats');

  // Copy state
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  // Search & Status state
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Floating Toast Notification: { message: string, type: 'success' | 'warning' | 'error' | 'info' }
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    if (type === 'success') {
      playSuccessChime();
    } else {
      playMechanicalClick();
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Modal Dialog Configuration for Edit & Delete Popups with Okay & Cancel
  const [modalConfig, setModalConfig] = useState(null);

  // Chat input & Streaming state
  const [chatInput, setChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const chatMessagesEndRef = useRef(null);

  // Formatted Current Time
  const formattedCurrentTime =
    currentTime instanceof Date
      ? currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : (typeof currentTime === 'string' ? currentTime : '');

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyMessage = (text, id) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      showToast('AI response copied to clipboard!', 'info');
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      showToast('Unable to copy text', 'warning');
    }
  };

  // Determine active chat object and its messages
  const activeChat =
    activeNote?.chats?.find((c) => c.id === activeChatId) ||
    activeNote?.chats?.[0] ||
    null;

  const currentMessages = activeChat?.messages || [];

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, isAiResponding]);

  // 1. Initial Load: Fetch all Notes / Projects
  const loadNotes = async (selectNoteId = null, selectChatId = null) => {
    try {
      setLoading(true);
      const res = await fetch('/api/md-notes/sessions');
      if (res.ok) {
        const data = await res.json();
        const list = data.sessions || [];
        setNotes(list);

        if (list.length > 0) {
          const targetNoteId =
            selectNoteId ||
            (activeNoteId && list.some((n) => n.id === activeNoteId) ? activeNoteId : list[0].id);

          setActiveNoteId(targetNoteId);
          loadNoteDetail(targetNoteId, selectChatId);
        } else {
          setActiveNote(null);
          setActiveChatId(null);
        }
      }
    } catch (err) {
      console.error('Failed to load notes & chat history:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load detailed note record with all its chats
  const loadNoteDetail = async (noteId, preferredChatId = null) => {
    try {
      const res = await fetch(`/api/md-notes/sessions/${noteId}`);
      if (res.ok) {
        const data = await res.json();
        const note = data.session;
        setActiveNote(note);
        setEditNoteTitleValue(note?.title || '');

        const chats = note?.chats || [];
        if (chats.length > 0) {
          const targetChat =
            preferredChatId && chats.some((c) => c.id === preferredChatId)
              ? preferredChatId
              : chats[0].id;

          setActiveChatId(targetChat);
          const activeC = chats.find((c) => c.id === targetChat);
          setEditChatTitleValue(activeC?.title || '');
        } else {
          setActiveChatId(null);
        }
      }
    } catch (err) {
      console.error('Failed to load note detail:', err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  // When clicking a Note in "All Notes" view
  const handleSelectNote = (noteId) => {
    playMechanicalClick();
    setActiveNoteId(noteId);
    setViewMode('chats');
    setIsEditingChatTitle(false);
    setIsEditingNoteTitle(false);
    loadNoteDetail(noteId);
  };

  // When switching between chat history pages inside the active Note
  const handleSelectChat = (chatId) => {
    if (chatId === activeChatId) return;
    playMechanicalClick();
    setActiveChatId(chatId);
    setIsEditingChatTitle(false);
    const chat = activeNote?.chats?.find((c) => c.id === chatId);
    setEditChatTitleValue(chat?.title || '');
  };

  // 3. Create a fresh Note / Project
  const handleCreateNewNote = async () => {
    playSuccessChime();
    try {
      const res = await fetch('/api/md-notes/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Note',
          category: 'General'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setNotes(data.sessions || []);
          setActiveNoteId(data.session.id);
          setActiveNote(data.session);
          const firstChat = data.session.chats?.[0];
          setActiveChatId(firstChat?.id || null);
          setEditNoteTitleValue(data.session.title);
          setViewMode('chats');
          showToast('New note created');
        }
      }
    } catch (err) {
      showToast('Error creating new note');
    }
  };

  // 4. Create a fresh Chat History Page inside the active Note (ChatGPT Project concept)
  const handleCreateNewChat = async () => {
    if (!activeNoteId) return;
    playSuccessChime();
    try {
      const res = await fetch(`/api/md-notes/sessions/${activeNoteId}/chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Discussion Page ${(activeNote?.chats?.length || 0) + 1}`
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chat && data.session) {
          setActiveNote(data.session);
          setActiveChatId(data.chat.id);
          setEditChatTitleValue(data.chat.title);
          setNotes(data.sessions || []);
          showToast('Started new chat page in this note');
        }
      }
    } catch (err) {
      showToast('Error creating chat page');
    }
  };

  // Trigger Delete Confirmation Modal for Chat Page
  const promptDeleteChat = (chat, e) => {
    if (e) e.stopPropagation();
    playMechanicalClick();
    setModalConfig({
      type: 'delete_chat',
      title: 'Delete Chat Page?',
      message: `Are you sure you want to delete "${chat?.title || 'Untitled Chat'}"? All conversation messages in this chat will be removed.`,
      targetId: chat.id,
      confirmText: 'Okay, Delete',
      cancelText: 'Cancel',
      isDestructive: true
    });
  };

  // Trigger Delete Confirmation Modal for Note Project
  const promptDeleteNote = (note, e) => {
    if (e) e.stopPropagation();
    playMechanicalClick();
    setModalConfig({
      type: 'delete_note',
      title: 'Delete Note Project?',
      message: `Are you sure you want to delete note "${note?.title || 'Untitled Note'}" and all its chat history pages?`,
      targetId: note.id,
      confirmText: 'Okay, Delete',
      cancelText: 'Cancel',
      isDestructive: true
    });
  };

  // Trigger Edit / Rename Modal for Chat Page
  const promptEditChat = (chat, e) => {
    if (e) e.stopPropagation();
    playMechanicalClick();
    setModalConfig({
      type: 'edit_chat',
      title: 'Rename Chat Page',
      targetId: chat.id,
      inputValue: chat?.title || '',
      confirmText: 'Okay, Save',
      cancelText: 'Cancel',
      isEdit: true
    });
  };

  // Trigger Edit / Rename Modal for Note Project
  const promptEditNote = (note, e) => {
    if (e) e.stopPropagation();
    playMechanicalClick();
    setModalConfig({
      type: 'edit_note',
      title: 'Rename Note Project',
      targetId: note.id,
      inputValue: note?.title || '',
      confirmText: 'Okay, Save',
      cancelText: 'Cancel',
      isEdit: true
    });
  };

  // Modal Cancel Action
  const handleModalCancel = () => {
    playMechanicalClick();
    setModalConfig(null);
  };

  // Modal Confirm (Okay) Action
  const handleModalConfirm = async () => {
    if (!modalConfig) return;
    const { type, targetId, inputValue } = modalConfig;

    if (type === 'delete_chat') {
      await executeDeleteChat(targetId);
    } else if (type === 'delete_note') {
      await executeDeleteNote(targetId);
    } else if (type === 'edit_chat') {
      await executeSaveChatTitle(targetId, inputValue);
    } else if (type === 'edit_note') {
      await executeSaveNoteTitle(targetId, inputValue);
    }

    setModalConfig(null);
  };

  // 5. Update Note Title Execution
  const executeSaveNoteTitle = async (noteId, newTitle) => {
    if (!newTitle?.trim()) {
      showToast('Note title cannot be empty', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/md-notes/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: noteId,
          title: newTitle.trim(),
          category: activeNote?.category || 'General'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveNote(data.session);
        setNotes(data.sessions || []);
        showToast('Note project renamed successfully', 'success');
      } else {
        showToast('Failed to rename note', 'error');
      }
    } catch (err) {
      showToast('Error updating note title', 'error');
    }
  };

  // 6. Update Chat Page Title Execution
  const executeSaveChatTitle = async (chatId, newTitle) => {
    if (!newTitle?.trim()) {
      showToast('Chat title cannot be empty', 'warning');
      return;
    }
    try {
      const res = await fetch(`/api/md-notes/sessions/${activeNoteId}/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveNote(data.session);
        setNotes(data.sessions || []);
        showToast('Chat page renamed successfully', 'success');
      } else {
        showToast('Failed to rename chat page', 'error');
      }
    } catch (err) {
      showToast('Error updating chat title', 'error');
    }
  };

  // 7. Delete Note Execution
  const executeDeleteNote = async (noteId) => {
    try {
      const res = await fetch(`/api/md-notes/sessions/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        const updatedList = data.sessions || [];
        setNotes(updatedList);
        if (updatedList.length > 0) {
          const nextId = updatedList[0].id;
          setActiveNoteId(nextId);
          loadNoteDetail(nextId);
        } else {
          setActiveNote(null);
          setActiveChatId(null);
        }
        showToast('Note project deleted successfully', 'success');
      } else {
        showToast('Failed to delete note', 'error');
      }
    } catch (err) {
      showToast('Error deleting note', 'error');
    }
  };

  // 8. Delete Chat Page Execution
  const executeDeleteChat = async (chatId) => {
    try {
      const res = await fetch(`/api/md-notes/sessions/${activeNoteId}/chats/${chatId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setActiveNote(data.session);
        setNotes(data.sessions || []);
        const remainingChats = data.session?.chats || [];
        if (remainingChats.length > 0) {
          const nextChat = remainingChats[0].id;
          setActiveChatId(nextChat);
        } else {
          setActiveChatId(null);
        }
        showToast('Chat page deleted successfully', 'success');
      } else {
        showToast('Failed to delete chat page', 'error');
      }
    } catch (err) {
      showToast('Error deleting chat page', 'error');
    }
  };

  // 9. Send message with Real-time SSE streaming into the active Chat Page
  const handleSendMessage = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const promptToSend = (customPrompt || chatInput).trim();
    if (!promptToSend || isAiResponding || !activeNoteId) return;

    playMechanicalClick();
    if (!customPrompt) setChatInput('');

    const targetChatId = activeChatId || activeNote?.chats?.[0]?.id;

    // Instant optimistic user message
    const tempUserMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: promptToSend,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0]
    };

    // Streaming AI placeholder message
    const tempAiMsgId = `ai_stream_${Date.now()}`;
    const tempAiMsg = {
      id: tempAiMsgId,
      sender: 'ai',
      text: '',
      streaming: true,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0]
    };

    // Optimistically update active chat's messages
    setActiveNote((prev) => {
      if (!prev) return prev;
      const updatedChats = (prev.chats || []).map((c) => {
        if (c.id === targetChatId) {
          return {
            ...c,
            messages: [...(c.messages || []), tempUserMsg, tempAiMsg]
          };
        }
        return c;
      });
      return { ...prev, chats: updatedChats };
    });

    setIsAiResponding(true);

    try {
      const res = await fetch(`/api/md-notes/sessions/${activeNoteId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          chat_id: targetChatId
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(jsonStr);

            if (data.token) {
              accumulatedText += data.token;
              setActiveNote((prev) => {
                if (!prev) return prev;
                const updatedChats = (prev.chats || []).map((c) => {
                  if (c.id === targetChatId) {
                    const updatedMsgs = (c.messages || []).map((m) =>
                      m.id === tempAiMsgId ? { ...m, text: accumulatedText, streaming: true } : m
                    );
                    return { ...c, messages: updatedMsgs };
                  }
                  return c;
                });
                return { ...prev, chats: updatedChats };
              });
            }

            if (data.done) {
              playSuccessChime();
              if (data.session) {
                setActiveNote(data.session);
                if (data.chat_id) {
                  setActiveChatId(data.chat_id);
                  const updatedC = (data.session.chats || []).find((c) => c.id === data.chat_id);
                  if (updatedC) setEditChatTitleValue(updatedC.title);
                }
              } else {
                setActiveNote((prev) => {
                  if (!prev) return prev;
                  const updatedChats = (prev.chats || []).map((c) => {
                    if (c.id === targetChatId) {
                      const updatedMsgs = (c.messages || []).map((m) =>
                        m.id === tempAiMsgId
                          ? { ...m, text: data.full_text || accumulatedText, streaming: false }
                          : m
                      );
                      return { ...c, messages: updatedMsgs };
                    }
                    return c;
                  });
                  return { ...prev, chats: updatedChats };
                });
              }
              if (data.sessions) {
                setNotes(data.sessions);
              }
            }
          } catch (parseErr) {
            console.error('Error parsing SSE event:', parseErr);
          }
        }
      }
    } catch (err) {
      console.error('Streaming error:', err);
      setActiveNote((prev) => {
        if (!prev) return prev;
        const updatedChats = (prev.chats || []).map((c) => {
          if (c.id === targetChatId) {
            const updatedMsgs = (c.messages || []).map((m) =>
              m.id === tempAiMsgId
                ? {
                    ...m,
                    text: m.text
                      ? m.text + `\n\n(Stream note: ${err.message})`
                      : `Apologies MD sir, error connecting to local AI: ${err.message}`,
                    streaming: false
                  }
                : m
            );
            return { ...c, messages: updatedMsgs };
          }
          return c;
        });
        return { ...prev, chats: updatedChats };
      });
    } finally {
      setIsAiResponding(false);
    }
  };

  // Filtered lists for search
  const filteredNotes = notes.filter(
    (n) =>
      (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.preview || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChats = (activeNote?.chats || []).filter(
    (c) =>
      (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.messages?.[c.messages.length - 1]?.text || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="md-unified-viewport">
      {/* 1. TOP EXECUTIVE HEADER */}
      <header className="md-unified-header">
        <div className="md-unified-header-left">
          <button
            onMouseEnter={playHoverServo}
            onClick={() => {
              playMechanicalClick();
              onBack?.();
            }}
            className="md-unified-back-btn"
            title="Back to Executive Command Deck"
          >
            <ArrowLeft size={16} />
            <span>Command Deck</span>
          </button>

          <div className="md-unified-title-box">
            <div className="md-unified-badge">
              <BrainCircuit size={13} color="#ea580c" />
              <span>MD Executive Workspace</span>
            </div>
            <h1 className="md-unified-main-heading">Notes & AI Assistant</h1>
          </div>
        </div>

        <div className="md-unified-header-right">
          {/* Link to Dedicated Company Data AI */}
          {onOpenCompanyDataAI && (
            <button
              onMouseEnter={playHoverServo}
              onClick={() => {
                playMechanicalClick();
                onOpenCompanyDataAI();
              }}
              className="md-header-link-company-ai-btn"
              title="Open Company Data AI Workspace"
            >
              <Database size={13} color="#0284C7" />
              <span>Company Data AI</span>
              <span className="company-ai-badge">NEW</span>
            </button>
          )}

          {/* Executive Profile Capsule */}
          {currentUser && (
            <div className="exec-profile-capsule" style={{ height: '34px', padding: '0 8px 0 6px' }}>
              <span
                className={`exec-profile-avatar ${currentUser?.initials === 'MD' ? 'avatar-md' : 'avatar-ea'}`}
                style={{ width: '22px', height: '22px', fontSize: '9.5px' }}
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
                    onClick={() => {
                      playMechanicalClick();
                      onLogout();
                    }}
                    className="exec-profile-logout-btn"
                    title="Sign Out"
                    style={{ height: '24px', padding: '0 6px' }}
                  >
                    <LogOut size={12} />
                    <span style={{ fontSize: '10.5px' }}>Exit</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Floating Toast Alert */}
      {toast && (
        <div className={`md-notes-toast toast-${toast.type || 'success'}`}>
          {toast.type === 'error' ? (
            <AlertTriangle size={16} color="#EF4444" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle size={16} color="#F59E0B" />
          ) : (
            <CheckCircle2 size={16} color="#10B981" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* EXECUTIVE MODAL POPUP (OKAY / CANCEL FOR EDIT & DELETE)        */}
      {/* ============================================================== */}
      {modalConfig && (
        <div
          className="md-modal-backdrop"
          onClick={handleModalCancel}
        >
          <div
            className="md-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="md-modal-header">
              <div className="md-modal-title-group">
                <div className={`md-modal-icon-badge ${modalConfig.isDestructive ? 'badge-danger' : 'badge-edit'}`}>
                  {modalConfig.isDestructive ? (
                    <AlertTriangle size={18} />
                  ) : (
                    <Edit2 size={18} />
                  )}
                </div>
                <h3 className="md-modal-title">{modalConfig.title}</h3>
              </div>
              <button
                onClick={handleModalCancel}
                className="md-modal-close-btn"
                title="Cancel & Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="md-modal-body">
              {modalConfig.isEdit ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                    Title:
                  </label>
                  <input
                    type="text"
                    value={modalConfig.inputValue || ''}
                    onChange={(e) =>
                      setModalConfig((prev) => ({ ...prev, inputValue: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleModalConfirm();
                      if (e.key === 'Escape') handleModalCancel();
                    }}
                    autoFocus
                    className="md-modal-input-field"
                    placeholder="Enter title..."
                  />
                </div>
              ) : (
                <p className="md-modal-message">{modalConfig.message}</p>
              )}
            </div>

            <div className="md-modal-footer">
              <button
                type="button"
                onClick={handleModalCancel}
                className="md-modal-cancel-btn"
              >
                {modalConfig.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleModalConfirm}
                className={`md-modal-confirm-btn ${modalConfig.isDestructive ? 'btn-danger' : 'btn-primary'}`}
              >
                {modalConfig.confirmText || 'Okay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN WORKSPACE: LEFT PROJECT/CHAT SIDEBAR + RIGHT ACTIVE CHAT */}
      <div className="md-unified-body">
        
        {/* ============================================================== */}
        {/* LEFT COLUMN: CHATGPT PROJECT-STYLE NOTE & CHAT SIDEBAR         */}
        {/* ============================================================== */}
        <aside className="md-unified-sidebar">
          
          {/* Top Search & Actions */}
          <div className="md-unified-sidebar-top">
            <div className="md-unified-search-box">
              <Search size={14} color="#64748B" />
              <input
                type="text"
                placeholder={viewMode === 'chats' ? 'Search chat pages...' : 'Search notes & projects...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="md-unified-search-input"
              />
            </div>

            {/* In 'chats' view mode (inside a Note): Show "+ New Chat" button */}
            {viewMode === 'chats' && (
              <button
                onMouseEnter={playHoverServo}
                onClick={handleCreateNewChat}
                className="md-unified-new-chat-btn"
                title="Start a new chat page inside this note"
              >
                <Plus size={16} />
                <span>New Chat Page</span>
              </button>
            )}

            {/* In 'notes' view mode (all notes list): Show "+ New Note" button */}
            {viewMode === 'notes' && (
              <button
                onMouseEnter={playHoverServo}
                onClick={handleCreateNewNote}
                className="md-unified-new-chat-btn"
                title="Create a new note / project"
              >
                <Plus size={16} />
                <span>New Note</span>
              </button>
            )}
          </div>

          {/* STICKY SUB-NAV & SECTION HEADER */}
          {viewMode === 'chats' && (
            <div className="md-unified-sidebar-subnav">
              <div className="md-nav-back-bar">
                <button
                  onClick={() => {
                    playMechanicalClick();
                    setViewMode('notes');
                  }}
                  className="md-nav-back-btn"
                  title="View all Notes & Projects"
                >
                  <ArrowLeft size={13} />
                  <span>All Notes ({notes.length})</span>
                </button>
              </div>

              <div className="md-sidebar-section-header">
                <span>Chat History Pages ({activeNote?.chats?.length || 0})</span>
              </div>
            </div>
          )}

          {viewMode === 'notes' && (
            <div className="md-unified-sidebar-subnav">
              <div className="md-sidebar-section-header">
                <span>All Notes & Projects ({notes.length})</span>
              </div>
            </div>
          )}

          {/* SIDEBAR SCROLLABLE CARDS LIST */}
          {viewMode === 'chats' && (
            <div className="md-unified-session-list">
              {loading ? (
                <div className="md-unified-empty-list">Loading chat pages...</div>
              ) : filteredChats.length === 0 ? (
                <div className="md-unified-empty-list">
                  {searchQuery ? 'No chat pages match your search' : 'No chat pages yet. Click "+ New Chat Page" above.'}
                </div>
              ) : (
                filteredChats.map((c) => {
                  const isSelected = c.id === activeChatId;
                  const lastMsg = c.messages?.[c.messages.length - 1]?.text || '(Fresh discussion page)';
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectChat(c.id)}
                      className={`md-unified-session-card ${isSelected ? 'active' : ''}`}
                    >
                      <div className="session-card-header">
                        <span className="session-card-time">
                          <Clock size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                          {c.updatedAt || c.date}
                        </span>
                        <div className="session-card-actions">
                          <button
                            onClick={(e) => promptEditChat(c, e)}
                            className="session-edit-icon-btn"
                            title="Rename chat page"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => promptDeleteChat(c, e)}
                            className="session-delete-icon-btn"
                            title="Delete this chat page"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h4 className="session-card-title">
                        <MessageSquare size={13} style={{ marginRight: '6px', verticalAlign: '-2px', color: isSelected ? '#ea580c' : '#64748b' }} />
                        {c.title || 'Untitled Chat'}
                      </h4>
                      <p className="session-card-preview">{lastMsg}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SIDEBAR VIEW 2: ALL NOTES / PROJECTS LIST */}
          {viewMode === 'notes' && (
            <div className="md-unified-session-list">
              {loading ? (
                <div className="md-unified-empty-list">Loading notes...</div>
              ) : filteredNotes.length === 0 ? (
                <div className="md-unified-empty-list">
                  {searchQuery ? 'No notes match your query' : 'No notes yet. Click "+ New Note" to begin.'}
                </div>
              ) : (
                filteredNotes.map((n) => {
                  const isSelected = n.id === activeNoteId;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleSelectNote(n.id)}
                      className={`md-unified-session-card ${isSelected ? 'active' : ''}`}
                    >
                      <div className="session-card-header">
                        <span className="md-chat-count-pill">
                          <MessageSquare size={11} />
                          <span>{n.chat_count || 1} {n.chat_count === 1 ? 'chat' : 'chats'}</span>
                        </span>
                        <div className="session-card-actions">
                          <span className="session-card-time">{n.updatedAt || n.date}</span>
                          <button
                            onClick={(e) => promptEditNote(n, e)}
                            className="session-edit-icon-btn"
                            title="Rename note project"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => promptDeleteNote(n, e)}
                            className="session-delete-icon-btn"
                            title="Delete note"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <h4 className="session-card-title">
                        <Folder size={14} style={{ marginRight: '6px', verticalAlign: '-2px', color: '#ea580c' }} />
                        {n.title || 'Untitled Note'}
                      </h4>
                      <p className="session-card-preview">{n.preview || '(Fresh note)'}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </aside>

        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* RIGHT COLUMN: AI CHATBOT & INTELLIGENCE DASHBOARD             */}
        {/* ============================================================== */}
        <main className="md-unified-chat-card">
          {/* Dashboard Card Header */}
          <div className="md-chat-card-header">
            <div className="md-chat-card-title-group">
              <div className="md-chat-bot-avatar">
                <Bot size={22} color="#ea580c" />
              </div>
              <div className="md-chat-topic-info">
                {/* Breadcrumb Navigation: Note > Chat */}
                <div className="md-breadcrumb-crumb">
                  <span
                    onClick={() => {
                      playMechanicalClick();
                      setViewMode('notes');
                    }}
                    className="md-breadcrumb-link"
                    title="View all Notes"
                  >
                    📁 {activeNote?.title || 'Note'}
                  </span>
                  <button
                    onClick={(e) => promptEditNote(activeNote, e)}
                    className="session-edit-icon-btn"
                    title="Rename note"
                    style={{ padding: '2px', display: 'inline-flex' }}
                  >
                    <Edit2 size={11} />
                  </button>
                  <span>/</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>
                    {activeChat?.title || 'Chat Page'}
                  </span>
                </div>

                <div className="md-topic-title-row">
                  <h2
                    onClick={() => promptEditChat(activeChat)}
                    className="md-chat-main-title"
                    title="Click to rename this chat page"
                  >
                    {activeChat?.title || 'Discussion Page'}
                  </h2>
                  <button
                    onClick={() => promptEditChat(activeChat)}
                    className="md-title-edit-icon"
                    title="Rename chat page"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
                <p className="md-chat-sub-title">Private conversation channel for Managing Director S GANESAMOORTHY</p>
              </div>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="md-chat-messages-container">
                {/* 1. Initial / Current Messages */}
                {currentMessages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id || idx}
                      className={`md-chat-row ${isUser ? 'user-row' : 'ai-row'}`}
                    >
                      <div className="md-chat-bubble-avatar">
                        {isUser ? <User size={15} /> : <Bot size={15} color="#ea580c" />}
                      </div>

                      <div className={`md-chat-bubble ${isUser ? 'user-bubble' : 'ai-bubble'} ${msg.streaming ? 'streaming-bubble' : ''}`}>
                        {/* AI Bubble Top Header with Copy Button */}
                        {!isUser && (
                          <div className="md-bubble-meta-header">
                            <span className="md-bubble-bot-badge">
                              <Bot size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                              Director AI
                            </span>
                            {msg.text && (
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.text, msg.id || idx)}
                                className="md-bubble-copy-btn"
                                title="Copy AI response"
                              >
                                <Copy size={11} />
                                <span>{copiedMsgId === (msg.id || idx) ? 'Copied!' : 'Copy'}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {msg.streaming && !msg.text ? (
                          <div className="thinking-dots-inline">
                            <span className="dot-pulse" />
                            <span className="dot-pulse" />
                            <span className="dot-pulse" />
                            <span className="thinking-text-live">AI is consulting your notes & thinking...</span>
                          </div>
                        ) : (
                          <p className="md-bubble-content">
                            {msg.text}
                            {msg.streaming && <span className="streaming-cursor" />}
                          </p>
                        )}
                        <span className="md-bubble-timestamp">{msg.time || msg.date}</span>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Executive Intelligence Command Grid (Visible when conversation is fresh) */}
                {currentMessages.length <= 1 && (
                  <div className="md-dashboard-command-hub">
                    <div className="md-hub-header">
                      <div className="md-hub-icon-pill">
                        <Sparkles size={14} color="#EA580C" />
                        <span>Director Intelligence Hub</span>
                      </div>
                      <h3 className="md-hub-heading">What would you like to direct or analyze today?</h3>
                      <p className="md-hub-sub">Select an operational command tile or type any query in the command bar below.</p>
                    </div>

                    <div className="md-hub-grid">
                      <div
                        onClick={() => handleSendMessage(null, 'Summarize all operational instructions, directives, and decisions recorded in this project.')}
                        className="md-hub-card card-amber"
                      >
                        <div className="hub-card-icon-wrap">
                          <FileText size={18} />
                        </div>
                        <h4 className="hub-card-title">Executive Directives Summary</h4>
                        <p className="hub-card-desc">Synthesize recorded operational directives, instructions, and follow-up points.</p>
                        <span className="hub-card-action">Run Directive Review &rarr;</span>
                      </div>

                      <div
                        onClick={() => handleSendMessage(null, 'Give me a comprehensive review of accounts, daily collections, and pending imprest audit records.')}
                        className="md-hub-card card-blue"
                      >
                        <div className="hub-card-icon-wrap">
                          <Database size={18} />
                        </div>
                        <h4 className="hub-card-title">Company Accounts & Audit</h4>
                        <p className="hub-card-desc">Review cash vouchers, total collections status, and branch accounts telemetry.</p>
                        <span className="hub-card-action">Review Accounts Audit &rarr;</span>
                      </div>

                      <div
                        onClick={() => handleSendMessage(null, 'List the pending routine checklist items, today’s schedule, and priority operational follow-ups.')}
                        className="md-hub-card card-green"
                      >
                        <div className="hub-card-icon-wrap">
                          <Zap size={18} />
                        </div>
                        <h4 className="hub-card-title">Daily Operational Follow-ups</h4>
                        <p className="hub-card-desc">Track today's 10:30 AM checklist tasks, meetings, and priority action items.</p>
                        <span className="hub-card-action">Check Operations &rarr;</span>
                      </div>

                      <div
                        onClick={() => handleSendMessage(null, 'Let us brainstorm strategic priorities and draft an operational directive circular for field managers.')}
                        className="md-hub-card card-purple"
                      >
                        <div className="hub-card-icon-wrap">
                          <BrainCircuit size={18} />
                        </div>
                        <h4 className="hub-card-title">Strategic Policy Brainstorming</h4>
                        <p className="hub-card-desc">Draft executive circulars, policy frameworks, and managerial agenda points.</p>
                        <span className="hub-card-action">Start Brainstorm &rarr;</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatMessagesEndRef} />
              </div>

              {/* Sticky Bottom Chat Query Field */}
              <form onSubmit={handleSendMessage} className="md-chat-input-bar">
                <div className="md-chat-input-row">
                  <input
                    type="text"
                    placeholder={`Ask Director AI in "${activeChat?.title || 'this chat'}" (e.g. directives, accounts, strategy)...`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isAiResponding}
                    className="md-chat-input-field"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isAiResponding}
                    className="md-chat-submit-btn"
                    title="Send query (Enter)"
                  >
                    <Send size={15} />
                    <span>Send</span>
                  </button>
                </div>
                <div className="md-chat-input-meta">
                  <span className="md-chat-meta-hint">
                    <Sparkles size={11} color="#EA580C" style={{ marginRight: '5px', verticalAlign: '-1px' }} />
                    Director AI Copilot • DeepSeek R1 8B • Space Grotesk Universal
                  </span>
                  <span className="md-chat-meta-key">Press ↵ Enter to send</span>
                </div>
              </form>
        </main>

      </div>
    </div>
  );
};
