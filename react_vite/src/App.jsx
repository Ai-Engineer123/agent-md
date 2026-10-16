import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  Sun,
  Moon,
  Sunset,
  Sparkles,
  Volume2,
  VolumeX,
  LogOut,
  UserCheck
} from 'lucide-react';
import { LoginPage } from './components/LoginPage';
import { RoboticCoreOrb } from './components/RoboticCoreOrb';
import { ExecutiveCommandDeck } from './components/ExecutiveCommandDeck';
import { ChecklistPage } from './components/ChecklistPage';
import { AuditPage } from './components/AuditPage';
import { MeetingsPage } from './components/MeetingsPage';
import { CalendarPage } from './components/CalendarPage';
import { DayDossierPage } from './components/DayDossierPage';
import { MDNotesPage } from './components/MDNotesPage';
import { playMechanicalClick, playHoverServo, playSuccessChime } from './audio/soundEffects';

export default function App() {
  const VALID_VIEWS = ['welcome', 'command_deck', 'checklist', 'audit', 'meetings', 'meeting_desk', 'calendar', 'day_dossier', 'notes'];

  // Restore current view on refresh from hash or localStorage
  const getInitialView = () => {
    try {
      const rawHash = window.location.hash.replace('#', '').trim();
      const hash = rawHash.split('?')[0];
      if (VALID_VIEWS.includes(hash)) return hash;
      const saved = localStorage.getItem('md_current_view');
      if (saved && VALID_VIEWS.includes(saved)) return saved;
    } catch {
      // ignore
    }
    return 'welcome';
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('md_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    playMechanicalClick();
    setCurrentUser(null);
    try {
      localStorage.removeItem('md_auth_user');
    } catch {}
    setCurrentView('welcome');
  };

  const [dossierDate, setDossierDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Breadcrumb navigation history stack (persists in sessionStorage across refresh)
  const [viewHistory, setViewHistory] = useState(() => {
    try {
      const saved = sessionStorage.getItem('md_view_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const navigateTo = (newView) => {
    if (newView === currentView) return;
    setViewHistory((prev) => {
      const next = [...prev, currentView];
      try {
        sessionStorage.setItem('md_view_history', JSON.stringify(next));
      } catch {}
      return next;
    });
    setCurrentView(newView);
  };

  const navigateBack = (fallback = 'command_deck') => {
    playMechanicalClick();
    setViewHistory((prev) => {
      if (prev.length > 0) {
        const next = [...prev];
        const prevView = next.pop();
        try {
          sessionStorage.setItem('md_view_history', JSON.stringify(next));
        } catch {}
        setCurrentView(prevView || fallback);
        return next;
      }
      setCurrentView(fallback);
      return [];
    });
  };

  // Sync current view with localStorage & URL hash so refresh stays on current page
  useEffect(() => {
    try {
      localStorage.setItem('md_current_view', currentView);
    } catch {}

    if (currentView === 'welcome') {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      if (window.location.hash.replace('#', '') !== currentView) {
        window.location.hash = currentView;
      }
    }
  }, [currentView]);

  const [auditInitialModal, setAuditInitialModal] = useState(null);
  const [auditInitialTab, setAuditInitialTab] = useState(null);

  const handleOpenAuditModal = (modalName, tabName = null) => {
    playSuccessChime();
    setAuditInitialModal(modalName);
    setAuditInitialTab(tabName);
    navigateTo('audit');
  };

  // Support browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace('#', '').trim();
      const hash = rawHash.split('?')[0];
      if (VALID_VIEWS.includes(hash)) {
        setCurrentView(hash);
      } else if (!hash) {
        setCurrentView('welcome');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Precision 1-second live clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute time-based executive greeting
  const getExecutiveGreeting = useCallback(() => {
    const hour = currentTime.getHours();
    const executiveName = currentUser?.name || 'Managing Director';

    if (hour >= 5 && hour < 12) {
      return {
        greeting: `Good Morning, ${executiveName}`,
        badge: '10:30 AM Executive Audit Ready',
        icon: <Sun size={17} color="#D97706" />,
        briefing:
          'All morning operational streams are synchronized. The 10:30 AM executive audit checklist is standing by for your review.',
        spokenText:
          `Good morning ${executiveName}. Welcome to A.E.G.I.S. All morning operational streams are synchronized and ready for your 10:30 AM review.`,
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: `Good Afternoon, ${executiveName}`,
        badge: 'Mid-Day Operations Active',
        icon: <Sun size={17} color="#ff914d" />,
        briefing:
          'Mid-day operations underway. Collections, DMR reports, and support ticket resolutions are updating live.',
        spokenText:
          `Good afternoon ${executiveName}. Mid-day operations telemetry is live. Accounts collection and report updates are streamed.`,
      };
    } else if (hour >= 17 && hour < 21) {
      return {
        greeting: `Good Evening, ${executiveName}`,
        badge: 'Daily Executive Closure',
        icon: <Sunset size={17} color="#D97706" />,
        briefing:
          'Daily audit closure in progress. Review pending submissions, 52-week milestones, and sign off today’s log.',
        spokenText:
          `Good evening ${executiveName}. Daily closure telemetry active. 52-week plan progress and final sign-offs are awaiting your clearance.`,
      };
    } else {
      return {
        greeting: `Welcome, ${executiveName}`,
        badge: 'Autonomous Sentinel Active',
        icon: <Moon size={17} color="#6366F1" />,
        briefing:
          'Night telemetry active. Autonomous background monitors are running under strict read-only database safeguards.',
        spokenText:
          `Welcome ${executiveName}. Autonomous night sentinel is active. All database connections are protected in read-only mode.`,
      };
    }
  }, [currentTime, currentUser]);

  const greetingData = getExecutiveGreeting();

  // Realistic AI Voice Greeting using Web Speech API
  const speakGreeting = useCallback(
    (customText) => {
      if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();
      const textToSpeak = customText || greetingData.spokenText;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('David'))
        ) || voices.find((v) => v.lang.startsWith('en'));

      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled, greetingData]
  );

  const handleFirstInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      playMechanicalClick();
      if (voiceEnabled) {
        speakGreeting();
      }
    }
  };

  const handleEnterCommandDeck = () => {
    playSuccessChime();
    navigateTo('command_deck');
    speakGreeting('Command deck initialized. All morning operational streams are standing by.');
  };

  const handleBackToWelcome = () => {
    navigateBack('welcome');
  };

  // ==============================================================
  // 0. GATE: EXECUTIVE AUTHENTICATION LOGIN PAGE
  // ==============================================================
  if (!currentUser) {
    return (
      <LoginPage
        onLogin={(user) => {
          setCurrentUser(user);
          try {
            localStorage.setItem('md_auth_user', JSON.stringify(user));
          } catch {}
        }}
      />
    );
  }

  // If in Checklist view, render the 10:30 AM Executive Checklist
  if (currentView === 'checklist') {
    return (
      <ChecklistPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onBack={() => navigateBack('command_deck')}
        onOpenAuditModal={handleOpenAuditModal}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        currentTime={currentTime}
      />
    );
  }

  // If in Audit view, render the Executive Audit & Briefing Page
  if (currentView === 'audit') {
    return (
      <AuditPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onBack={() => {
          setAuditInitialModal(null);
          setAuditInitialTab(null);
          navigateBack('command_deck');
        }}
        initialModal={auditInitialModal}
        initialModalTab={auditInitialTab}
        onClearInitialModal={() => {
          setAuditInitialModal(null);
          setAuditInitialTab(null);
        }}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        currentTime={currentTime}
      />
    );
  }

  // If in Meetings view or Meeting Desk view, render the Review Meetings & MD Directives Desk
  if (currentView === 'meetings' || currentView === 'meeting_desk') {
    return (
      <MeetingsPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onBack={() => navigateBack('command_deck')}
        onBackToSchedule={() => navigateBack('meetings')}
        onNavigate={navigateTo}
        currentView={currentView}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        currentTime={currentTime}
      />
    );
  }

  // If in Calendar view, render the Operations & Work Calendar
  if (currentView === 'calendar') {
    return (
      <CalendarPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onBack={() => navigateBack('command_deck')}
        onOpenChecklist={() => {
          playSuccessChime();
          navigateTo('checklist');
        }}
        onOpenMeetings={() => {
          playSuccessChime();
          navigateTo('meetings');
        }}
        onOpenDayDossier={(targetDate) => {
          playSuccessChime();
          setDossierDate(targetDate);
          navigateTo('day_dossier');
        }}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        currentTime={currentTime}
      />
    );
  }

  // If in Day Dossier view, render the Comprehensive Single-Day Executive Operations Record
  if (currentView === 'day_dossier') {
    return (
      <DayDossierPage
        currentUser={currentUser}
        onLogout={handleLogout}
        date={dossierDate}
        onBack={() => navigateBack('calendar')}
        onChangeDate={(newDate) => setDossierDate(newDate)}
        currentTime={currentTime}
        voiceEnabled={voiceEnabled}
      />
    );
  }

  // If in Notes view, render the MD Executive Notes & AI Directives Workspace
  if (currentView === 'notes') {
    return (
      <MDNotesPage
        currentUser={currentUser}
        onLogout={handleLogout}
        onBack={() => navigateBack('command_deck')}
        currentTime={currentTime}
      />
    );
  }

  // If in Command Deck view, render the Executive Command Deck
  if (currentView === 'command_deck') {
    return (
      <ExecutiveCommandDeck
        currentUser={currentUser}
        onLogout={handleLogout}
        onBack={handleBackToWelcome}
        onOpenChecklist={() => {
          playSuccessChime();
          navigateTo('checklist');
        }}
        onOpenAudit={() => {
          playSuccessChime();
          navigateTo('audit');
        }}
        onOpenMeetings={() => {
          playSuccessChime();
          navigateTo('meetings');
        }}
        onOpenCalendar={() => {
          playSuccessChime();
          navigateTo('calendar');
        }}
        onOpenNotes={() => {
          playSuccessChime();
          navigateTo('notes');
        }}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        currentTime={currentTime}
      />
    );
  }

  // Welcome Screen View
  return (
    <div onClick={handleFirstInteraction} className="executive-welcome-viewport">
      {/* Laser Scanline Ambient Effect */}
      <div className="scanline-effect" />

      {/* Top Executive Controls Dock (Audio + Profile) */}
      <aside className="exec-top-controls-dock" aria-label="Executive session and audio controls">
        {/* Voice Toggle Capsule */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            playMechanicalClick();
            const next = !voiceEnabled;
            setVoiceEnabled(next);
            if (next) {
              speakGreeting();
            } else {
              window.speechSynthesis?.cancel();
              setIsSpeaking(false);
            }
          }}
          className="exec-audio-capsule"
          title="Toggle Voice Protocol"
        >
          {voiceEnabled ? <Volume2 size={15} color="#ff914d" /> : <VolumeX size={15} color="#64748B" />}
          <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
        </button>

        {/* Executive Identity & Sign Out Capsule */}
        <div className="exec-profile-capsule">
          <span className={`exec-profile-avatar ${currentUser?.initials === 'MD' ? 'avatar-md' : 'avatar-ea'}`}>
            {currentUser?.initials || 'MD'}
          </span>
          <div className="exec-profile-info">
            <span className="exec-profile-name">{currentUser?.name || 'Managing Director'}</span>
            <span className="exec-profile-sub">
              <span className="exec-live-dot" />
              {currentUser?.role || 'Executive Office'}
            </span>
          </div>
          <span className="exec-profile-divider" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="exec-profile-logout-btn"
            title="Sign out / Switch account"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* CENTER ROBOTIC EXECUTIVE WELCOME (POPPINS)                     */}
      {/* ============================================================== */}
      <main className="welcome-center-box">
        {/* Interactive Gyroscopic AI Core Orb */}
        <RoboticCoreOrb
          isSpeaking={isSpeaking}
          onInteract={() => {
            playMechanicalClick();
            speakGreeting();
          }}
        />

        {/* Dynamic Oscilloscope Waveform */}
        <div className="waveform-container">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((bar) => (
            <span
              key={bar}
              className="waveform-bar"
              style={{
                height: isSpeaking ? `${Math.sin(bar + Date.now() / 180) * 12 + 16}px` : '4px',
                opacity: isSpeaking ? 0.95 : 0.35,
              }}
            />
          ))}
        </div>
        <div className="orb-caption">
          {isSpeaking ? 'Speaking...' : 'A.E.G.I.S. Core Online'}
        </div>

        {/* Time-Based Status Capsule Badge */}
        <div className="status-capsule">
          {greetingData.icon}
          <span className="status-capsule-text">{greetingData.badge}</span>
          <span className="dot-live dot-cyan" />
        </div>

        {/* Executive Greeting Typography - Poppins Clean */}
        <h1 className="greeting-title">{greetingData.greeting}</h1>
        <p className="greeting-briefing">{greetingData.briefing}</p>

        {/* Tactical Action Button */}
        <div className="action-deck">
          <button
            onMouseEnter={playHoverServo}
            onClick={handleEnterCommandDeck}
            className="btn-primary-action"
          >
            <Sparkles size={16} />
            <span>Enter Command Center</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </main>
    </div>
  );
}
