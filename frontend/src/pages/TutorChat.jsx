import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Phone,
  MessageCircle,
  Building,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  BookOpen,
  Smile,
  MoreVertical,
  X,
  UserCheck,
  FileText,
  Image as ImageIcon,
  Check,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/ui/Avatar';

// Pre-seeded Indian coaching centre tutors & educators
const INITIAL_TUTORS = [
  {
    id: 'tutor-1',
    name: 'Prof. Rajesh Sharma',
    subject: 'Mathematics & Calculus',
    category: 'maths',
    city: 'Delhi',
    institution: 'Apex Tutorials, South Delhi',
    phone: '+91 98111 22334',
    online: true,
    lastSeen: 'Active now',
    qualification: 'M.Sc. Mathematics (DU)',
    unread: 2,
    messages: [
      { id: 'm1', sender: 'them', text: 'Namaste! Are you conducting the Class 12 Calculus booster today?', time: '09:45 AM' },
      { id: 'm2', sender: 'me', text: 'Yes, scheduled at 4:30 PM. Just marked morning attendance with AttendIQ face scan in 2 seconds!', time: '09:48 AM' },
      { id: 'm3', sender: 'them', text: 'Excellent! Could you please share the question paper for differential equations?', time: '10:15 AM' },
    ],
  },
  {
    id: 'tutor-2',
    name: 'Dr. Anita Verma',
    subject: 'Physics & Mechanics',
    category: 'science',
    city: 'Kota',
    institution: 'Kota Star Academy, Rajasthan',
    phone: '+91 98222 33445',
    online: true,
    lastSeen: 'Active now',
    qualification: 'Ph.D Physics (IIT Roorkee)',
    unread: 1,
    messages: [
      { id: 'm4', sender: 'them', text: 'Hi colleague! We noticed 3 students had low attendance in JEE batch this week.', time: 'Yesterday' },
      { id: 'm5', sender: 'me', text: 'I sent WhatsApp alerts to their parents directly from the AttendIQ Reports tab.', time: 'Yesterday' },
      { id: 'm6', sender: 'them', text: 'Awesome! That WhatsApp feature really saved hours of manual calling.', time: '08:30 AM' },
    ],
  },
  {
    id: 'tutor-3',
    name: 'Er. Rahul Patel',
    subject: 'Organic & Physical Chemistry',
    category: 'science',
    city: 'Ahmedabad',
    institution: 'Sigma Science Hub, Ahmedabad',
    phone: '+91 98333 44556',
    online: false,
    lastSeen: '25m ago',
    qualification: 'B.Tech Chemical Engg.',
    unread: 0,
    messages: [
      { id: 'm7', sender: 'them', text: 'Hello! Are you organizing Sunday revision tests for NEET aspirants?', time: 'Nov 09' },
      { id: 'm8', sender: 'me', text: 'Yes, 10:00 AM to 1:00 PM. We can merge students for the combined test.', time: 'Nov 09' },
    ],
  },
  {
    id: 'tutor-4',
    name: 'Ms. Priya Sen',
    subject: 'Biology & Human Physiology',
    category: 'science',
    city: 'Bengaluru',
    institution: 'NEET Mentors, Koramangala',
    phone: '+91 98444 55667',
    online: true,
    lastSeen: 'Active now',
    qualification: 'M.Sc. Biotechnology',
    unread: 0,
    messages: [
      { id: 'm9', sender: 'them', text: 'Hi! Can you check if Aarav and Diya were marked present in Friday session?', time: 'Nov 08' },
      { id: 'm10', sender: 'me', text: 'Yes, both recognized by the camera engine with 96% confidence!', time: 'Nov 08' },
    ],
  },
  {
    id: 'tutor-5',
    name: 'Mr. Amit Joshi',
    subject: 'Computer Science & Python',
    category: 'maths',
    city: 'Pune',
    institution: 'TechPrep Academy, Pune',
    phone: '+91 98555 66778',
    online: false,
    lastSeen: '2h ago',
    qualification: 'M.Tech CSE',
    unread: 0,
    messages: [
      { id: 'm11', sender: 'them', text: 'Looking to start a coding batch for Class 11 students next month.', time: 'Nov 05' },
      { id: 'm12', sender: 'me', text: 'Great idea Amit! You can create a batch on AttendIQ and enroll students instantly.', time: 'Nov 05' },
    ],
  },
  {
    id: 'tutor-6',
    name: 'Dr. Vikramaditya Rao',
    subject: 'Advanced Algebra & Olympiad',
    category: 'maths',
    city: 'Hyderabad',
    institution: 'Hyderabad Toppers Academy',
    phone: '+91 98666 77889',
    online: true,
    lastSeen: 'Active now',
    qualification: 'Ph.D Mathematics (IISc)',
    unread: 0,
    messages: [
      { id: 'm13', sender: 'them', text: 'RMO (Regional Math Olympiad) sample test papers uploaded to our shared drive.', time: 'Nov 04' },
      { id: 'm14', sender: 'me', text: 'Thank you Dr. Rao! Will distribute them to our scholarship batch.', time: 'Nov 04' },
    ],
  },
  {
    id: 'tutor-7',
    name: 'Mrs. Sunita Mukherjee',
    subject: 'English Literature & Grammar',
    category: 'delhi',
    city: 'Kolkata',
    institution: 'Kolkata Scholars Forum',
    phone: '+91 98777 88990',
    online: false,
    lastSeen: '1d ago',
    qualification: 'M.A. English (Jadavpur)',
    unread: 0,
    messages: [
      { id: 'm15', sender: 'them', text: 'Board syllabus updates for 2026-27 have been finalized.', time: 'Nov 02' },
    ],
  },
];

const QUICK_PROMPTS = [
  '📚 Shared batch notes for tomorrow',
  '✅ Attendance marked with face scanner ✓',
  '📝 Combined test this Sunday?',
  '📞 Let us connect on call regarding syllabus',
  '📊 Sent WhatsApp report to parents',
];

const CATEGORIES = [
  { id: 'all', label: 'All Chats' },
  { id: 'unread', label: 'Unread' },
  { id: 'maths', label: 'Mathematics' },
  { id: 'science', label: 'Science' },
  { id: 'delhi', label: 'Delhi' },
  { id: 'kota', label: 'Kota' },
];

const TutorChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tutors, setTutors] = useState(() => {
    try {
      const saved = localStorage.getItem('attendiq_telegram_chats');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return INITIAL_TUTORS;
  });

  const [activeTutorId, setActiveTutorId] = useState(INITIAL_TUTORS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [inputText, setInputText] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTutorInfo, setShowTutorInfo] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('attendiq_telegram_chats', JSON.stringify(tutors));
    } catch (e) {
      // ignore
    }
  }, [tutors]);

  const activeTutor = tutors.find((t) => t.id === activeTutorId) || tutors[0];

  // Auto-scroll to latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTutorId, activeTutor?.messages]);

  // Handle Tutor Selection (Telegram behavior)
  const handleSelectTutor = (tutorId) => {
    setActiveTutorId(tutorId);
    setMobileView('chat');
    setShowAttachMenu(false);
    setShowTutorInfo(false);

    // Clear unread badge
    setTutors((prev) =>
      prev.map((t) => (t.id === tutorId ? { ...t, unread: 0 } : t))
    );

    // Focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleSendMessage = (textToSend = null) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: 'me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTutors((prev) =>
      prev.map((t) => {
        if (t.id === activeTutorId) {
          return {
            ...t,
            messages: [...t.messages, newMsg],
          };
        }
        return t;
      })
    );

    setInputText('');
    setShowAttachMenu(false);

    // Simulated Peer Reply after 1.5s
    if (!textToSend) {
      setTimeout(() => {
        const replies = [
          'Understood Prof! I will update the batch curriculum accordingly.',
          'Noted! I also reviewed the attendance log on AttendIQ.',
          'Great! Let us sync up on WhatsApp after classes.',
          'Shared with the faculty team. Thank you!',
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        const replyMsg = {
          id: `msg-reply-${Date.now()}`,
          sender: 'them',
          text: randomReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setTutors((current) =>
          current.map((t) =>
            t.id === activeTutorId ? { ...t, messages: [...t.messages, replyMsg] } : t
          )
        );
      }, 1500);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpenWhatsApp = (phone, name) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=Hello%20${encodeURIComponent(name)},%20connecting%20via%20AttendIQ%20Tutor%20Community.`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success(`Opening WhatsApp chat with ${name}!`);
  };

  // Filter tutors based on search and category tab
  const filteredTutors = tutors.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.institution.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (categoryFilter === 'unread') return t.unread > 0;
    if (categoryFilter === 'maths') return t.category === 'maths';
    if (categoryFilter === 'science') return t.category === 'science';
    if (categoryFilter === 'delhi') return t.city.toLowerCase() === 'delhi';
    if (categoryFilter === 'kota') return t.city.toLowerCase() === 'kota';

    return true;
  });

  return (
    <div className="telegram-app">
      {/* ====================================================================
          LEFT SIDEBAR: TELEGRAM TUTOR DIRECTORY & CHAT LIST
          ==================================================================== */}
      <aside
        className={`telegram-sidebar ${mobileView === 'chat' ? 'mobile-hidden' : ''}`}
        aria-label="Tutor Directory"
      >
        {/* Telegram Sidebar Header */}
        <div className="telegram-sidebar-header">
          {/* Search Bar */}
          <div className="telegram-search-wrapper">
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search tutors, subjects, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="telegram-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Telegram Category Tabs */}
          <div className="telegram-filter-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`telegram-filter-chip ${categoryFilter === cat.id ? 'active' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tutors Chat List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredTutors.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>No tutors found</p>
              <span style={{ fontSize: '0.8rem' }}>Try searching by name or subject</span>
            </div>
          ) : (
            filteredTutors.map((tutor) => {
              const isSelected = tutor.id === activeTutorId;
              const lastMsg = tutor.messages[tutor.messages.length - 1];

              return (
                <div
                  key={tutor.id}
                  onClick={() => handleSelectTutor(tutor.id)}
                  className={`telegram-chat-item ${isSelected ? 'active' : ''}`}
                >
                  {/* Tutor Avatar with Online Indicator */}
                  <div className="telegram-avatar-box">
                    <Avatar name={tutor.name} size="md" />
                    {tutor.online && <span className="telegram-online-dot" />}
                  </div>

                  {/* Tutor Content & Last Message */}
                  <div className="telegram-item-content">
                    <div className="telegram-item-header">
                      <span className="telegram-item-name">{tutor.name}</span>
                      {lastMsg && (
                        <span className="telegram-item-time">{lastMsg.time}</span>
                      )}
                    </div>

                    <div className="telegram-item-subject">
                      {tutor.subject} • {tutor.city}
                    </div>

                    <div className="telegram-item-footer">
                      <span className="telegram-item-msg">
                        {lastMsg ? (
                          <>
                            {lastMsg.sender === 'me' && (
                              <CheckCheck size={13} style={{ display: 'inline', marginRight: '4px', color: '#67e8f9' }} />
                            )}
                            {lastMsg.text}
                          </>
                        ) : (
                          tutor.institution
                        )}
                      </span>

                      {tutor.unread > 0 && (
                        <span className="telegram-unread-badge">
                          {tutor.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ====================================================================
          RIGHT SCREEN: TELEGRAM FULL CONVERSATION WINDOW
          ==================================================================== */}
      <main
        className={`telegram-main ${mobileView === 'list' ? 'mobile-hidden' : ''}`}
      >
        {activeTutor ? (
          <>
            {/* 1. Telegram Chat Top Bar */}
            <div className="telegram-main-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                {/* Back button for Mobile */}
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="btn btn-ghost"
                  style={{
                    padding: '6px',
                    borderRadius: '50%',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Back to Tutors List"
                >
                  <ArrowLeft size={20} />
                </button>

                {/* Avatar with click to view info */}
                <div
                  className="telegram-avatar-box"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowTutorInfo((prev) => !prev)}
                >
                  <Avatar name={activeTutor.name} size="md" />
                  {activeTutor.online && <span className="telegram-online-dot" />}
                </div>

                {/* Tutor Info */}
                <div
                  style={{ minWidth: 0, cursor: 'pointer' }}
                  onClick={() => setShowTutorInfo((prev) => !prev)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeTutor.name}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      Verified
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: activeTutor.online ? '#22c55e' : 'var(--text-muted)', fontWeight: 600 }}>
                    {activeTutor.online ? 'online' : activeTutor.lastSeen}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                      • {activeTutor.subject}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: WhatsApp, Call, More */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(activeTutor.phone, activeTutor.name)}
                  title="Open direct WhatsApp conversation"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                  }}
                >
                  <MessageCircle size={15} />
                  <span className="navbar-desktop-only">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => toast.info(`Calling ${activeTutor.name} via AttendIQ encrypted audio...`)}
                  title="Audio Call"
                  className="btn btn-ghost"
                  style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-primary)' }}
                >
                  <Phone size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => setShowTutorInfo((prev) => !prev)}
                  title="Tutor Profile & Info"
                  className="btn btn-ghost"
                  style={{ padding: '8px', borderRadius: '50%', color: 'var(--text-primary)' }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Tutor Information Drawer (When user clicks header/more) */}
            {showTutorInfo && (
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  backgroundColor: 'var(--bg-card)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                    <Building size={14} style={{ color: 'var(--primary)' }} />
                    <strong>{activeTutor.institution}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                    <GraduationCap size={14} style={{ color: 'var(--primary)' }} />
                    <span>{activeTutor.qualification}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                    <Phone size={14} style={{ color: 'var(--primary)' }} />
                    <span>{activeTutor.phone}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTutorInfo(false)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                >
                  <X size={14} /> Close
                </button>
              </div>
            )}

            {/* 2. Telegram Messages Canvas (Wallpaper with Doodle Pattern) */}
            <div className="telegram-canvas">
              {/* Telegram Date Chip */}
              <div className="telegram-date-badge">
                Today
              </div>

              {/* Security Pill */}
              <div
                style={{
                  alignSelf: 'center',
                  backgroundColor: 'var(--bg-card)',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-color)',
                  userSelect: 'none',
                }}
              >
                🔒 End-to-end peer encrypted • AttendIQ Tutor Network
              </div>

              {/* Messages Stream */}
              {activeTutor.messages.map((msg) => {
                const isMe = msg.sender === 'me';

                return (
                  <div
                    key={msg.id}
                    className={`telegram-msg-row ${isMe ? 'sent' : 'received'}`}
                  >
                    <div className={`telegram-bubble ${isMe ? 'sent' : 'received'}`}>
                      {!isMe && (
                        <div className="telegram-bubble-sender">
                          {activeTutor.name}
                        </div>
                      )}
                      <div>{msg.text}</div>
                      <div className="telegram-bubble-meta">
                        <span>{msg.time}</span>
                        {isMe && (
                          <CheckCheck size={14} style={{ color: '#86efac' }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 3. Quick Action Chips (Floating above Input) */}
            <div className="telegram-prompts-bar">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="telegram-prompt-chip"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* 4. Attachment Menu Popup */}
            {showAttachMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '70px',
                  left: '1.25rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  padding: '0.5rem',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  zIndex: 20,
                  minWidth: '180px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleSendMessage('📎 Shared document: CBSE_Maths_Booster_Notes.pdf');
                    setShowAttachMenu(false);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', gap: '8px', fontSize: '0.8rem' }}
                >
                  <FileText size={16} style={{ color: '#3b82f6' }} /> Document / Notes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendMessage('🖼️ Shared classroom snapshot: Attendance_Batch_1.png');
                    setShowAttachMenu(false);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', gap: '8px', fontSize: '0.8rem' }}
                >
                  <ImageIcon size={16} style={{ color: '#10b981' }} /> Photo / Snapshot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendMessage('📊 Shared AttendIQ Attendance Register (Locked Audit)');
                    setShowAttachMenu(false);
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: 'flex-start', gap: '8px', fontSize: '0.8rem' }}
                >
                  <Sparkles size={16} style={{ color: '#8b5cf6' }} /> Attendance Report
                </button>
              </div>
            )}

            {/* 5. Telegram Bottom Input Bar */}
            <div className="telegram-composer">
              {/* Paperclip Button */}
              <button
                type="button"
                onClick={() => setShowAttachMenu((prev) => !prev)}
                className="btn btn-ghost"
                style={{
                  padding: '8px',
                  borderRadius: '50%',
                  color: showAttachMenu ? 'var(--primary)' : 'var(--text-muted)',
                }}
                title="Attach Document or Photo"
              >
                <Paperclip size={20} />
              </button>

              {/* Message Input Field */}
              <input
                ref={inputRef}
                type="text"
                placeholder={`Write a message to ${activeTutor.name}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                className="telegram-composer-input"
              />

              {/* Telegram Circular Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="telegram-send-btn"
                title="Send Message"
              >
                <Send size={18} style={{ transform: 'translateX(1px)' }} />
              </button>
            </div>
          </>
        ) : (
          /* Empty State when no tutor is selected */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: '1rem',
              padding: '2rem',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <MessageCircle size={36} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.35rem 0' }}>
                Select a chat to start messaging
              </h3>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Choose an educator from the list to collaborate, share notes, or discuss batches.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TutorChat;
