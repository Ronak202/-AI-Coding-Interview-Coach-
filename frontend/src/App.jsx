import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  FileText, 
  Upload, 
  Brain, 
  Mic, 
  MicOff, 
  Send, 
  Award, 
  Compass, 
  Play, 
  Plus, 
  BookOpen, 
  CheckSquare, 
  Sparkles, 
  LogOut, 
  ArrowRight, 
  ShieldAlert, 
  Loader, 
  Volume2, 
  VolumeX, 
  History, 
  Calendar, 
  CheckCircle2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  // Authentication & Global States
  const [token, setToken] = useState(localStorage.getItem('ai_interview_token') || null);
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ email: '', password: '', fullName: '' });
  
  // App Navigation & Hub States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sessions, setSessions] = useState([]);
  const [resume, setResume] = useState(null);
  
  // Setup States
  const [setupForm, setSetupForm] = useState({
    company: 'Google',
    position: 'Software Engineer',
    mode: 'DSA',
    difficulty: 'Medium',
    total_questions: 5
  });

  // Active Interview Session States
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Evaluation States
  const [activeEvaluation, setActiveEvaluation] = useState(null);
  const [roadmapChecklist, setRoadmapChecklist] = useState(
    JSON.parse(localStorage.getItem('roadmap_checklist') || '{}')
  );

  // Global UI States
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);

  // Refs for Chat Auto Scroll & Speech Recognition
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechUtteranceRef = useRef(null);

  // Fetch initial profile & dashboard data on mount or token change
  useEffect(() => {
    if (token) {
      localStorage.setItem('ai_interview_token', token);
      fetchUserProfile();
      fetchDashboardData();
    } else {
      localStorage.removeItem('ai_interview_token');
      setUser(null);
    }
  }, [token]);

  // Autoscroll chat history
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages, chatLoading]);

  // Initialize Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript) {
          setNewAnswer((prev) => prev + transcript);
        }
      };

      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Sync Roadmap Checklist with LocalStorage
  const handleToggleRoadmapStep = (topic) => {
    const updated = { ...roadmapChecklist, [topic]: !roadmapChecklist[topic] };
    setRoadmapChecklist(updated);
    localStorage.setItem('roadmap_checklist', JSON.stringify(updated));
  };

  // Helper for API headers
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Profile API call
  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Token expired/invalid
        setToken(null);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  // Dashboard API calls
  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch sessions
      const sessionsRes = await fetch(`${API_BASE_URL}/api/interviews/sessions`, {
        headers: getHeaders()
      });
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData);
      }

      // 2. Fetch resume
      const resumeRes = await fetch(`${API_BASE_URL}/api/resumes/my`, {
        headers: getHeaders()
      });
      if (resumeRes.ok) {
        const resumeData = await resumeRes.json();
        setResume(resumeData);
      } else {
        setResume(null);
      }
    } catch (err) {
      console.error('Error fetching dashboard info:', err);
      setError('Could not connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  // User Auth Actions
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);
    
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
    
    try {
      let res;
      if (isLoginMode) {
        // FastAPI OAuth2PasswordRequestForm expects URLSearchParams
        const params = new URLSearchParams();
        params.append('username', authForm.email); // standard OAuth2 field
        params.append('password', authForm.password);
        
        res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params
        });
      } else {
        res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authForm.email,
            password: authForm.password,
            full_name: authForm.fullName
          })
        });
      }

      const data = await res.json();
      if (res.ok) {
        setToken(data.access_token);
        setAuthForm({ email: '', password: '', fullName: '' });
      } else {
        setError(data.detail || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setError('Connection to auth server failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Logout action
  const handleLogout = () => {
    // Cancel speaking if any
    window.speechSynthesis?.cancel();
    setToken(null);
    setUser(null);
    setResume(null);
    setSessions([]);
    setActiveSession(null);
    setActiveEvaluation(null);
  };

  // PDF Resume upload action
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF format resume only.');
      return;
    }

    setError('');
    setUploadProgress('Analyzing resume components...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/resumes/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setResume(data);
        fetchDashboardData();
        setUploadProgress(null);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      } else {
        const errorData = await res.json();
        setError(errorData.detail || 'Resume upload failed.');
        setUploadProgress(null);
      }
    } catch (err) {
      setError('Could not reach backend parser.');
      setUploadProgress(null);
    }
  };

  // Start/Setup Interview Session
  const handleCreateSession = async () => {
    setError('');
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/interviews/sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(setupForm)
      });
      if (res.ok) {
        const session = await res.json();
        setActiveSession(session);
        setActiveTab('room');
        // Initial question voice output
        if (session.messages.length > 0) {
          const firstQuestion = session.messages[0].content;
          speakQuestion(firstQuestion);
        }
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to start interview session.');
      }
    } catch (err) {
      setError('Server communication failure.');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit answer in interview session
  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!newAnswer.trim() || chatLoading) return;

    // Stop recording if active
    if (isRecording) {
      stopVoiceRecording();
    }

    // Stop synthesis reading
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    const candidateAnswer = newAnswer;
    setNewAnswer('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/interviews/sessions/${activeSession.id}/answer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ answer: candidateAnswer })
      });

      if (res.ok) {
        const updatedSession = await res.json();
        setActiveSession(updatedSession);
        
        if (updatedSession.status === 'completed') {
          // Fetch evaluation
          fetchEvaluationReport(updatedSession.id);
        } else {
          // Speak the next interviewer question
          const latestMessage = updatedSession.messages[updatedSession.messages.length - 1];
          if (latestMessage && latestMessage.role === 'interviewer') {
            speakQuestion(latestMessage.content);
          }
        }
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to submit answer.');
      }
    } catch (err) {
      setError('Unable to submit answer to backend.');
    } finally {
      setChatLoading(false);
    }
  };

  // Retrieve evaluation reports
  const fetchEvaluationReport = async (sessionId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/interviews/sessions/${sessionId}/evaluation`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const evalData = await res.json();
        setActiveEvaluation(evalData);
        setActiveTab('evaluation');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        fetchDashboardData();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Could not fetch evaluation report.');
      }
    } catch (err) {
      setError('Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Browser Text-To-Speech (SpeechSynthesis)
  const speakQuestion = (text) => {
    if (speechMuted) return;
    window.speechSynthesis?.cancel(); // stop current sound
    
    // Clean interviewer metadata or tags if any
    const cleanedText = text.replace(/[*#_]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = 'en-US';
    
    // Attempt to pick a premium/nice sounding voice
    const voices = window.speechSynthesis?.getVoices() || [];
    const englishVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.includes('en-US')) || 
                        voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechUtteranceRef.current = utterance;
    window.speechSynthesis?.speak(utterance);
  };

  // Toggle Voice Recognition (Speech-to-text Mic)
  const handleMicToggle = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const startVoiceRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Safari.');
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  // Helper to safely parse strings to JSON lists
  const safeParseJSON = (jsonStr, defaultVal = []) => {
    if (!jsonStr) return defaultVal;
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return defaultVal;
    }
  };

  // Utility to determine track layout label/color
  const getTrackModeLabel = (mode) => {
    switch (mode) {
      case 'DSA': return { name: 'Data Structures', class: 'badge-dsa' };
      case 'SYSTEM_DESIGN': return { name: 'System Design', class: 'badge-sysdesign' };
      case 'CS_FUNDAMENTALS': return { name: 'CS Fundamentals', class: 'badge-cs' };
      case 'HR': return { name: 'HR & Behavioral', class: 'badge-hr' };
      default: return { name: mode, class: 'badge-cs' };
    }
  };

  return (
    <div className="app-wrapper">
      {/* Background ambient glowing shapes */}
      <div className="ambient-glow" style={{ top: '10%', left: '5%' }}></div>
      <div className="ambient-glow" style={{ bottom: '20%', right: '5%', animationDelay: '-10s' }}></div>

      {/* Nav bar */}
      <header className="navbar">
        <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => token && setActiveTab('dashboard')}>
          <Brain size={28} style={{ color: 'var(--accent-secondary)' }} />
          <span>AI COACH</span>
        </div>
        
        {token && (
          <div className="nav-links">
            <span className="nav-user">
              Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.full_name || user?.email}</strong>
            </span>
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Main App Section */}
      {!token ? (
        // ---------------- AUTHENTICATION HUB ----------------
        <div className="auth-container">
          <div className="glass-card auth-card">
            <div className="auth-header">
              <Sparkles size={36} style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
              <h2>{isLoginMode ? 'Welcome Back' : 'Get Started'}</h2>
              <p>{isLoginMode ? 'Level up your placement prep with AI mock interviews.' : 'Create an account to begin mock interviews.'}</p>
            </div>

            {error && (
              <div className="error-banner">
                <ShieldAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {!isLoginMode && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="John Doe"
                    value={authForm.fullName}
                    onChange={(e) => setAuthForm({ ...authForm, fullName: e.target.value })}
                    required
                  />
                </div>
              )}
              
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="name@university.edu"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={actionLoading}>
                {actionLoading ? <Loader size={20} className="animate-spin" style={{ margin: '0 auto' }} /> : (isLoginMode ? 'Sign In' : 'Sign Up')}
              </button>
            </form>

            <div className="auth-footer">
              <span>{isLoginMode ? "Don't have an account?" : "Already have an account?"}</span>
              <button className="auth-toggle-link" onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}>
                {isLoginMode ? 'Sign Up' : 'Log In'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // ---------------- MAIN LOGGED IN APP AREA ----------------
        <main className="main-container">
          {error && (
            <div className="error-banner" style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <Loader size={36} className="animate-spin" style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Syncing placement records...</p>
            </div>
          ) : (
            <>
              {/* ---------------- DASHBOARD TAB ---------------- */}
              {activeTab === 'dashboard' && (
                <div>
                  <div className="dashboard-header">
                    <div>
                      <h1>Prep Dashboard</h1>
                      <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Analyze metrics, resumes, and launch mock interviews.</p>
                    </div>
                    <button className="btn-new-interview" onClick={() => setActiveTab('setup')}>
                      <Plus size={18} />
                      Start Mock Interview
                    </button>
                  </div>

                  {/* Metrics grid */}
                  <div className="stats-grid">
                    <div className="glass-card stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Total Interviews</span>
                        <span className="stat-value">{sessions.length}</span>
                      </div>
                      <div className="stat-icon-wrapper">
                        <History size={24} />
                      </div>
                    </div>

                    <div className="glass-card stat-card">
                      <div className="stat-info">
                        <span className="stat-label">Average Score</span>
                        <span className="stat-value">
                          {sessions.filter(s => s.status === 'completed').length > 0
                            ? (sessions.filter(s => s.status === 'completed').reduce((acc, s) => acc + (s.evaluation?.overall_score || 0), 0) / sessions.filter(s => s.status === 'completed').length).toFixed(1)
                            : '--'}
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}> / 10</span>
                        </span>
                      </div>
                      <div className="stat-icon-wrapper">
                        <Award size={24} />
                      </div>
                    </div>

                    <div className="glass-card stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('upload')}>
                      <div className="stat-info">
                        <span className="stat-label">Resume Vector status</span>
                        <span className="stat-value" style={{ fontSize: '1.25rem', color: resume ? 'var(--accent-success)' : 'var(--accent-tertiary)' }}>
                          {resume ? 'RAG Database Ready' : 'Upload Resume'}
                        </span>
                      </div>
                      <div className="stat-icon-wrapper">
                        <FileText size={24} />
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-columns">
                    {/* Past Sessions List */}
                    <div className="glass-card">
                      <h2 className="section-title">
                        <History size={20} style={{ color: 'var(--accent-secondary)' }} />
                        Past Interview Sessions
                      </h2>
                      
                      {sessions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                          <BookOpen size={48} style={{ strokeWidth: 1, marginBottom: '1rem', color: 'var(--text-muted)' }} />
                          <p>No mock interviews recorded yet.</p>
                          <button className="btn-secondary" style={{ marginTop: '1rem', maxWidth: '200px', margin: '1rem auto 0' }} onClick={() => resume ? setActiveTab('setup') : setActiveTab('upload')}>
                            Create Session
                          </button>
                        </div>
                      ) : (
                        <div className="sessions-list">
                          {sessions.map((session) => {
                            const track = getTrackModeLabel(session.mode);
                            return (
                              <div key={session.id} className="session-item">
                                <div className="session-meta">
                                  <div className="session-title-text">
                                    {session.company} — <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>{session.position}</span>
                                  </div>
                                  <div className="session-details-row">
                                    <span className={`badge ${track.class}`}>{track.name}</span>
                                    <span className={`badge badge-${session.difficulty.toLowerCase()}`}>{session.difficulty}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                      <Calendar size={12} />
                                      {new Date(session.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="session-score">
                                  {session.status === 'completed' && session.evaluation ? (
                                    <>
                                      <span className="score-text">{session.evaluation.overall_score.toFixed(1)}/10</span>
                                      <button className="btn-view-report" onClick={() => fetchEvaluationReport(session.id)}>
                                        View Evaluation
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <span className="badge badge-active">In Progress</span>
                                      <button className="btn-view-report" onClick={() => {
                                        setActiveSession(session);
                                        setActiveTab('room');
                                      }}>
                                        Resume Room
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Resume/Profile Summary Panel */}
                    <div className="glass-card resume-box">
                      <h2 className="section-title">
                        <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                        Target Resume
                      </h2>
                      
                      {resume ? (
                        <div>
                          <div className="resume-file-info">
                            <div className="resume-file-meta">
                              <FileText size={18} style={{ color: 'var(--accent-secondary)' }} />
                              <span style={{ fontWeight: '600', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {resume.filename}
                              </span>
                            </div>
                            <button className="btn-view-report" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setActiveTab('upload')}>
                              Update
                            </button>
                          </div>
                          
                          <div style={{ marginTop: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                              Detected Skills
                            </h4>
                            <div className="skills-wrapper">
                              {safeParseJSON(resume.skills).slice(0, 10).map((skill, i) => (
                                <span key={i} className="skill-tag">{skill}</span>
                              ))}
                              {safeParseJSON(resume.skills).length > 10 && (
                                <span className="skill-tag" style={{ borderStyle: 'dashed' }}>
                                  +{safeParseJSON(resume.skills).length - 10} more
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ marginTop: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                              Recent Projects
                            </h4>
                            <div className="preview-list">
                              {safeParseJSON(resume.projects).slice(0, 2).map((proj, i) => (
                                <div key={i} className="preview-item">
                                  <div className="preview-title">{proj.title}</div>
                                  <div className="preview-desc">{proj.description.slice(0, 80)}...</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            Upload your PDF resume to let AI customize mock questions around your actual tech stack.
                          </p>
                          <button className="btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => setActiveTab('upload')}>
                            Upload Resume (PDF)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- RESUME UPLOAD TAB ---------------- */}
              {activeTab === 'upload' && (
                <div className="setup-container">
                  <div className="glass-card">
                    <h2 className="setup-title">
                      <Upload size={24} style={{ color: 'var(--accent-primary)' }} />
                      Upload Placement Resume
                    </h2>
                    
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                      Our platform parses your resume text and index it into a localized **FAISS Vector Database (RAG)**.
                      The interview agents will dynamically pull context from your projects and skills to test your depth of experience.
                    </p>

                    {uploadProgress ? (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                        <Loader size={36} className="animate-spin" style={{ color: 'var(--accent-secondary)', marginBottom: '1rem' }} />
                        <p style={{ fontWeight: '500' }}>{uploadProgress}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                          Analyzing text structure, identifying project keywords, and generating vector embeddings.
                        </p>
                      </div>
                    ) : (
                      <label className="resume-uploader">
                        <Upload size={40} className="resume-uploader-icon" />
                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>Click to upload resume PDF</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supported format: PDF (Max size 5MB)</span>
                        <input type="file" accept=".pdf" onChange={handleResumeUpload} />
                      </label>
                    )}

                    {resume && !uploadProgress && (
                      <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-success)', marginBottom: '1rem' }}>
                          <CheckCircle2 size={18} />
                          <strong style={{ fontSize: '0.95rem' }}>Successfully Embed into Vector Index</strong>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Extracted Skill Keywords</label>
                          <div className="skills-wrapper">
                            {safeParseJSON(resume.skills).map((skill, i) => (
                              <span key={i} className="skill-tag">{skill}</span>
                            ))}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '1.5rem' }}>
                          <label className="form-label">Structured Projects</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                            {safeParseJSON(resume.projects).map((proj, i) => (
                              <div key={i} className="preview-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem' }}>
                                <div className="preview-title" style={{ color: 'var(--accent-secondary)' }}>{proj.title}</div>
                                <div className="preview-desc" style={{ marginTop: '0.25rem' }}>{proj.description}</div>
                                {proj.tech_stack && (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                    {proj.tech_stack.map((t, idx) => (
                                      <span key={idx} style={{ fontSize: '0.7rem', padding: '1px 5px', background: 'rgba(139,92,246,0.1)', color: '#c084fc', borderRadius: '3px' }}>
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="btn-row">
                      <button className="btn-secondary" onClick={() => setActiveTab('dashboard')}>
                        Back to Dashboard
                      </button>
                      {!resume && (
                        <button className="btn-secondary" style={{ borderStyle: 'dashed' }} onClick={() => setActiveTab('setup')}>
                          Skip Resume & Start
                        </button>
                      )}
                      {resume && (
                        <button className="btn-primary" onClick={() => setActiveTab('setup')}>
                          Configure Session
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- INTERVIEW SETUP TAB ---------------- */}
              {activeTab === 'setup' && (
                <div className="setup-container">
                  <div className="glass-card">
                    <h2 className="setup-title">
                      <Brain size={24} style={{ color: 'var(--accent-secondary)' }} />
                      Mock Interview Configuration
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                      Configure the specific company guidelines and track for the AI agent panel to target.
                    </p>

                    <div className="setup-grid">
                      <div className="form-group">
                        <label className="form-label">Target Company</label>
                        <select 
                          className="form-select"
                          value={setupForm.company}
                          onChange={(e) => setSetupForm({ ...setupForm, company: e.target.value })}
                        >
                          <option value="Google">Google (Algorithmic Depth & Googliness)</option>
                          <option value="Amazon">Amazon (Leadership Principles Focus)</option>
                          <option value="Microsoft">Microsoft (Core Tech & Engineering Quality)</option>
                          <option value="Netflix">Netflix (Freedom & Responsibility Core)</option>
                          <option value="Meta">Meta (Fast Paced Product Architecture)</option>
                          <option value="Standard Technical">Standard Technical (General Placement Prep)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Target Position</label>
                        <select 
                          className="form-select"
                          value={setupForm.position}
                          onChange={(e) => setSetupForm({ ...setupForm, position: e.target.value })}
                        >
                          <option value="Software Engineer">Software Engineer (Generalist)</option>
                          <option value="Frontend Developer">Frontend Engineer</option>
                          <option value="Backend Developer">Backend Engineer</option>
                          <option value="Fullstack Developer">Fullstack Engineer</option>
                          <option value="Data Scientist">Data Scientist</option>
                          <option value="DevOps Specialist">DevOps Specialist</option>
                        </select>
                      </div>

                      <div className="form-group setup-full">
                        <label className="form-label">Interview Mode / Track</label>
                        <div className="setup-options-list">
                          {[
                            { id: 'DSA', name: 'Data Structures' },
                            { id: 'SYSTEM_DESIGN', name: 'System Design' },
                            { id: 'CS_FUNDAMENTALS', name: 'CS Fundamentals' },
                            { id: 'HR', name: 'Behavioral & HR' }
                          ].map((track) => (
                            <div 
                              key={track.id}
                              className={`setup-option-card ${setupForm.mode === track.id ? 'active' : ''}`}
                              onClick={() => setSetupForm({ ...setupForm, mode: track.id })}
                            >
                              {track.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Difficulty Level</label>
                        <select 
                          className="form-select"
                          value={setupForm.difficulty}
                          onChange={(e) => setSetupForm({ ...setupForm, difficulty: e.target.value })}
                        >
                          <option value="Easy">Easy (L1 Placement / Internship)</option>
                          <option value="Medium">Medium (L2 Standard Placement)</option>
                          <option value="Hard">Hard (Elite Tech Programs / Product Heavy)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Total Questions</label>
                        <select 
                          className="form-select"
                          value={setupForm.total_questions}
                          onChange={(e) => setSetupForm({ ...setupForm, total_questions: parseInt(e.target.value) })}
                        >
                          <option value={3}>3 Questions (Fast Track)</option>
                          <option value={5}>5 Questions (Standard Practice)</option>
                          <option value={7}>7 Questions (Detailed Interview)</option>
                          <option value={10}>10 Questions (Complete Evaluation)</option>
                        </select>
                      </div>
                    </div>

                    <div className="btn-row">
                      <button className="btn-secondary" onClick={() => setActiveTab('dashboard')}>
                        Back
                      </button>
                      <button className="btn-primary" onClick={handleCreateSession} disabled={actionLoading}>
                        {actionLoading ? <Loader size={18} className="animate-spin" /> : 'Launch Interview Room'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- INTERVIEW CHAT ROOM ---------------- */}
              {activeTab === 'room' && activeSession && (
                <div className="chat-container">
                  {/* Left Pane - Voice / Visualizer Aura */}
                  <div className="chat-left-pane">
                    <div className="glass-card interviewer-visualizer-card">
                      <span className="badge badge-sysdesign" style={{ marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
                        Active Recruiter Agent
                      </span>
                      
                      <div className={`voice-visualizer-orb ${isSpeaking ? 'speaking' : ''}`}>
                        <Brain size={48} style={{ color: 'white', opacity: 0.9 }} />
                      </div>
                      
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{activeSession.company} Interviewer</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Evaluating for <strong style={{ color: 'var(--text-primary)' }}>{activeSession.position}</strong>
                      </p>

                      <div className="audio-waves-container">
                        {[1, 2, 3, 4, 5].map((idx) => (
                          <div 
                            key={idx} 
                            className={`wave-bar ${isSpeaking || isRecording ? 'active' : ''}`}
                            style={{ 
                              background: isRecording ? 'var(--accent-tertiary)' : 'var(--accent-secondary)'
                            }}
                          ></div>
                        ))}
                      </div>

                      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button 
                          className="btn-secondary"
                          style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          onClick={() => {
                            setSpeechMuted(!speechMuted);
                            if (!speechMuted) {
                              window.speechSynthesis?.cancel();
                              setIsSpeaking(false);
                            } else {
                              // Read last message
                              const interviewerMsgs = activeSession.messages.filter(m => m.role === 'interviewer');
                              if (interviewerMsgs.length > 0) {
                                speakQuestion(interviewerMsgs[interviewerMsgs.length - 1].content);
                              }
                            }
                          }}
                        >
                          {speechMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          {speechMuted ? 'Voice Muted' : 'Voice Active'}
                        </button>
                      </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Session Progress</span>
                        <strong>Question {activeSession.current_question_index + 1} of {activeSession.total_questions}</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${((activeSession.current_question_index) / activeSession.total_questions) * 100}%`,
                            height: '100%',
                            background: 'var(--gradient-main)',
                            transition: 'width 0.5s ease-in-out'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Right Pane - Chat Window */}
                  <div className="glass-card chat-right-pane" style={{ padding: 0 }}>
                    <div className="chat-history-box">
                      {activeSession.messages.map((msg, i) => (
                        <div key={i} className={`chat-message-row ${msg.role}`}>
                          <div className="chat-message-bubble">
                            {msg.content}
                          </div>
                          <div className="chat-message-meta">
                            <span>{msg.role === 'interviewer' ? 'Interviewer' : 'You'}</span>
                            <span>•</span>
                            <span>{new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                      
                      {chatLoading && (
                        <div className="chat-message-row interviewer">
                          <div className="chat-message-bubble" style={{ padding: '0.75rem 1rem' }}>
                            <div className="typing-indicator">
                              <div className="typing-dot"></div>
                              <div className="typing-dot"></div>
                              <div className="typing-dot"></div>
                            </div>
                          </div>
                          <div className="chat-message-meta">
                            <span>AI Evaluating answer...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef}></div>
                    </div>

                    <form onSubmit={handleSubmitAnswer} className="chat-input-bar">
                      <button 
                        type="button"
                        className={`btn-mic ${isRecording ? 'recording' : ''}`}
                        onClick={handleMicToggle}
                        title={isRecording ? 'Stop Voice Input' : 'Voice Input (Speech-to-Text)'}
                      >
                        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>

                      <input 
                        type="text"
                        className="chat-text-input"
                        placeholder={isRecording ? 'Listening to voice... speak clearly.' : 'Type your detailed response...'}
                        value={newAnswer}
                        onChange={(e) => setNewAnswer(e.target.value)}
                        disabled={chatLoading}
                      />

                      <button 
                        type="submit" 
                        className="btn-send"
                        disabled={!newAnswer.trim() || chatLoading}
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ---------------- EVALUATION REPORT TAB ---------------- */}
              {activeTab === 'evaluation' && activeEvaluation && (
                <div>
                  <div className="dashboard-header">
                    <div>
                      <h1>Evaluation Report</h1>
                      <p style={{ color: 'var(--text-secondary)' }}>Comprehensive performance analysis and preparation timeline.</p>
                    </div>
                    <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setActiveTab('dashboard')}>
                      Return to Dashboard
                    </button>
                  </div>

                  <div className="eval-grid">
                    {/* Left Pane - Score Ring */}
                    <div className="glass-card score-radial-wrapper">
                      <div className="score-radial-chart">
                        <svg className="score-radial-svg">
                          <defs>
                            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="var(--accent-primary)" />
                              <stop offset="100%" stopColor="var(--accent-secondary)" />
                            </linearGradient>
                          </defs>
                          <circle className="score-radial-bg" cx="80" cy="80" r="72" />
                          <circle 
                            className="score-radial-progress" 
                            cx="80" 
                            cy="80" 
                            r="72" 
                            style={{ 
                              strokeDashoffset: 452 - (452 * activeEvaluation.overall_score) / 10 
                            }}
                          />
                        </svg>
                        <div className="score-radial-val">
                          {activeEvaluation.overall_score.toFixed(1)}
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Overall Performance</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Score generated based on core placement parameters & domain depth.
                      </p>
                    </div>

                    {/* Right Pane - Summary & Bullets */}
                    <div className="glass-card">
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={20} style={{ color: 'var(--accent-secondary)' }} />
                        Hiring Summary
                      </h3>
                      <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                        {activeEvaluation.summary}
                      </p>

                      <div className="evaluation-detail-columns">
                        <div className="strengths">
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-success)', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: '700' }}>
                            Demonstrated Strengths
                          </h4>
                          <ul className="eval-bullet-list">
                            {safeParseJSON(activeEvaluation.strengths).map((str, i) => (
                              <li key={i} className="eval-bullet-item">{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="weaknesses">
                          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-tertiary)', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: '700' }}>
                            Areas of Improvement
                          </h4>
                          <ul className="eval-bullet-list">
                            {safeParseJSON(activeEvaluation.weaknesses).map((weak, i) => (
                              <li key={i} className="eval-bullet-item">{weak}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preparational Roadmap timeline */}
                  <div className="glass-card" style={{ marginTop: '2rem' }}>
                    <div className="roadmap-card-header">
                      <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Compass size={20} style={{ color: 'var(--accent-primary)' }} />
                        Personalized Preparation Roadmap
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Save state checklists of completed topics.
                      </span>
                    </div>

                    <div className="roadmap-timeline">
                      {safeParseJSON(activeEvaluation.roadmap_json).map((step, i) => (
                        <div key={i} className="roadmap-step">
                          <input 
                            type="checkbox" 
                            className="roadmap-step-checkbox"
                            checked={!!roadmapChecklist[step.topic]}
                            onChange={() => handleToggleRoadmapStep(step.topic)}
                          />
                          <div className="roadmap-step-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span 
                                className="roadmap-step-topic"
                                style={{ textDecoration: roadmapChecklist[step.topic] ? 'line-through' : 'none', opacity: roadmapChecklist[step.topic] ? 0.5 : 1 }}
                              >
                                {step.topic}
                              </span>
                              <span className={`roadmap-priority roadmap-priority-${step.priority?.toLowerCase() || 'medium'}`}>
                                {step.priority || 'Medium'}
                              </span>
                            </div>
                            <span 
                              className="roadmap-step-action"
                              style={{ textDecoration: roadmapChecklist[step.topic] ? 'line-through' : 'none', opacity: roadmapChecklist[step.topic] ? 0.5 : 1 }}
                            >
                              {step.action}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      )}
    </div>
  );
}

export default App;
