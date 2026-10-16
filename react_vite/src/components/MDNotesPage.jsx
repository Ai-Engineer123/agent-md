import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  StickyNote,
  Plus,
  Search,
  Send,
  Sparkles,
  Bot,
  Trash2,
  Save,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileText,
  User
} from 'lucide-react';
import { playMechanicalClick, playHoverServo, playSuccessChime } from '../audio/soundEffects';
import { CustomSelect } from './CustomSelect';

export const MDNotesPage = ({ onBack, currentTime }) => {
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('md_executive_notes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved notes', e);
    }
    return [
      {
        id: 'note_init',
        title: 'MD Operational Priorities',
        category: 'Directives',
        content: 'Review collection reconciliation with accounts team.\nAudit 10:30 AM checklist submissions and branch roll-call.',
        updatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0]
      }
    ];
  });

  const [activeNoteId, setActiveNoteId] = useState(() => notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'chat'
  const [toastMessage, setToastMessage] = useState('');

  // Active note state
  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];
  const [editorTitle, setEditorTitle] = useState(activeNote?.title || '');
  const [editorContent, setEditorContent] = useState(activeNote?.content || '');
  const [editorCategory, setEditorCategory] = useState(activeNote?.category || 'General');

  // AI Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Good day Managing Director. I am your Executive AI Assistant. You can draft directives, organize instructions, brain-dump operational thoughts, or formulate action items with me.',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Sync editor when active note switches
  useEffect(() => {
    if (activeNote) {
      setEditorTitle(activeNote.title);
      setEditorContent(activeNote.content);
      setEditorCategory(activeNote.category || 'General');
    }
  }, [activeNoteId]);

  // Save notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('md_executive_notes', JSON.stringify(notes));
    } catch (e) {
      console.warn('Failed to save notes', e);
    }
  }, [notes]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCreateNote = () => {
    playSuccessChime();
    const newNote = {
      id: `note_${Date.now()}`,
      title: 'Untitled Executive Note',
      category: 'General',
      content: '',
      updatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0]
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    showToast('New note created');
  };

  const handleSaveNote = () => {
    playSuccessChime();
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? {
              ...n,
              title: editorTitle.trim() || 'Untitled Note',
              content: editorContent,
              category: editorCategory,
              updatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            }
          : n
      )
    );
    showToast('Note saved successfully');
  };

  const handleDeleteNote = (id) => {
    playMechanicalClick();
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (remaining.length > 0) {
      setActiveNoteId(remaining[0].id);
    } else {
      setActiveNoteId(null);
    }
    showToast('Note removed');
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    playMechanicalClick();
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const prompt = chatInput.trim();
    setChatInput('');

    // Executive AI response simulation
    setTimeout(() => {
      playSuccessChime();
      const aiReply = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Understood, MD sir. Noted: "${prompt}". I have logged this thought into your executive workspace. Would you like me to structure this into a formal directive or draft an operational checklist item?`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, aiReply]);
    }, 600);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="md-notes-viewport">
      {/* 1. TOP EXECUTIVE HEADER */}
      <header className="md-notes-header">
        <div className="md-notes-header-left">
          <button
            onMouseEnter={playHoverServo}
            onClick={() => {
              playMechanicalClick();
              onBack?.();
            }}
            className="md-notes-back-btn"
            title="Back to Executive Command Deck"
          >
            <ArrowLeft size={16} />
            <span>Command Deck</span>
          </button>

          <div className="md-notes-title-box">
            <div className="md-notes-badge">
              <StickyNote size={13} color="#ff914d" />
              <span>MD Executive Workspace</span>
            </div>
            <h1 className="md-notes-main-heading">Notes & AI Assistant</h1>
          </div>
        </div>

        <div className="md-notes-header-right">
          {/* Mode Tabs: Notes vs AI Chat */}
          <div className="md-notes-mode-pills">
            <button
              onClick={() => {
                playMechanicalClick();
                setActiveTab('notes');
              }}
              className={`md-notes-pill-btn ${activeTab === 'notes' ? 'active' : ''}`}
            >
              <FileText size={14} />
              <span>Notebook</span>
            </button>
            <button
              onClick={() => {
                playMechanicalClick();
                setActiveTab('chat');
              }}
              className={`md-notes-pill-btn ${activeTab === 'chat' ? 'active' : ''}`}
            >
              <Sparkles size={14} />
              <span>AI Chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="md-notes-toast">
          <CheckCircle2 size={15} color="#059669" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="md-notes-workspace">
        {/* ============================================================== */}
        {/* TAB 1: EXECUTIVE NOTEBOOK                                      */}
        {/* ============================================================== */}
        {activeTab === 'notes' ? (
          <div className="md-notes-split-layout">
            {/* Left: Notes Sidebar */}
            <aside className="md-notes-sidebar">
              <div className="md-notes-sidebar-top">
                <div className="md-notes-search-wrapper">
                  <Search size={14} color="#64748B" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="md-notes-search-input"
                  />
                </div>
                <button
                  onClick={handleCreateNote}
                  className="md-notes-create-btn"
                  title="Create New Note"
                >
                  <Plus size={16} />
                  <span>New Note</span>
                </button>
              </div>

              <div className="md-notes-list">
                {filteredNotes.length === 0 ? (
                  <div className="md-notes-empty-list">No notes found</div>
                ) : (
                  filteredNotes.map((note) => {
                    const isSelected = note.id === activeNoteId;
                    return (
                      <div
                        key={note.id}
                        onClick={() => {
                          playMechanicalClick();
                          setActiveNoteId(note.id);
                        }}
                        className={`md-notes-card-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="md-notes-card-header">
                          <span className="md-notes-card-cat">{note.category || 'General'}</span>
                          <span className="md-notes-card-time">{note.updatedAt}</span>
                        </div>
                        <h4 className="md-notes-card-title">{note.title || 'Untitled Note'}</h4>
                        <p className="md-notes-card-preview">
                          {note.content ? note.content.slice(0, 75) + '...' : 'Empty note content...'}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Right: Active Note Editor */}
            <main className="md-notes-editor-panel">
              {activeNote ? (
                <>
                  <div className="md-notes-editor-topbar">
                    <input
                      type="text"
                      placeholder="Note Title..."
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                      className="md-notes-title-input"
                    />

                    <div className="md-notes-editor-actions">
                      <CustomSelect
                        value={editorCategory}
                        onChange={setEditorCategory}
                        options={['General', 'Directives', 'Accounts', 'Operations', 'Meetings']}
                        triggerStyle={{ padding: '6px 12px', minWidth: '130px', height: '32px' }}
                      />

                      <button
                        onClick={handleSaveNote}
                        className="md-notes-save-btn"
                        title="Save Changes"
                      >
                        <Save size={14} />
                        <span>Save</span>
                      </button>

                      <button
                        onClick={() => handleDeleteNote(activeNote.id)}
                        className="md-notes-delete-btn"
                        title="Delete Note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <textarea
                    placeholder="Type executive notes, meeting minutes, directives, or thoughts here..."
                    value={editorContent}
                    onChange={(e) => setEditorContent(e.target.value)}
                    className="md-notes-textarea"
                  />
                </>
              ) : (
                <div className="md-notes-no-selection">
                  <StickyNote size={36} color="#94A3B8" />
                  <p>Select a note from the left or create a new note to start writing.</p>
                  <button onClick={handleCreateNote} className="md-notes-create-btn">
                    <Plus size={16} />
                    <span>Create Note</span>
                  </button>
                </div>
              )}
            </main>
          </div>
        ) : (
          /* ============================================================== */
          /* TAB 2: AI EXECUTIVE CHAT ASSISTANT                            */
          /* ============================================================== */
          <div className="md-notes-chat-layout">
            <div className="md-notes-chat-header">
              <div className="md-notes-chat-bot-info">
                <div className="md-notes-chat-avatar">
                  <Bot size={20} color="#ff914d" />
                </div>
                <div>
                  <h3 className="md-notes-chat-bot-title">Executive AI Advisor</h3>
                  <p className="md-notes-chat-bot-sub">Private, secure conversation channel for Managing Director</p>
                </div>
              </div>
            </div>

            <div className="md-notes-chat-messages">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`md-notes-chat-bubble-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}
                >
                  <div className="md-notes-bubble-avatar">
                    {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} color="#ff914d" />}
                  </div>
                  <div className={`md-notes-chat-bubble ${msg.sender === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                    <p className="md-notes-bubble-text">{msg.text}</p>
                    <span className="md-notes-bubble-time">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} className="md-notes-chat-input-bar">
              <input
                type="text"
                placeholder="Ask AI, draft instructions, or formulate thoughts..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="md-notes-chat-input"
              />
              <button type="submit" className="md-notes-chat-send-btn">
                <Send size={15} />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
