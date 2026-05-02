import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  Send, 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  MessageCircle,
  X,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Home,
  CheckSquare,
  Square,
  Type,
  Pencil,
  ArrowRight,
  BrainCircuit,
  Zap,
  Trophy,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { learnerApi } from '../api';
import { useUser } from '../UserContext';

// Custom Markdown Components for Modern LMS Aesthetic
const MarkdownComponents = {
  p: ({ children }) => <div className="text-lg text-slate-600 leading-relaxed mb-6">{children}</div>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  h1: ({ children }) => <h1 className="text-4xl font-extrabold text-slate-900 mb-8 tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-2xl font-bold text-slate-800 mb-4 mt-10 tracking-tight flex items-center gap-2">
    {children}
  </h2>,
  h3: ({ children }) => <h3 className="text-xl font-bold text-slate-800 mb-3 mt-8">{children}</h3>,
  code: ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    return !inline ? (
      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg my-8 group">
        <div className="bg-slate-800/50 px-4 py-2 flex items-center justify-between border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            {match ? match[1] : 'code'}
          </span>
        </div>
        <div className="p-6 overflow-x-auto">
          <code className="text-sm md:text-base font-mono text-slate-300 leading-normal" {...props}>
            {children}
          </code>
        </div>
      </div>
    ) : (
      <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-sm border border-slate-200" {...props}>
        {children}
      </code>
    );
  },
  ul: ({ children }) => <ul className="list-disc list-outside ml-6 mb-6 space-y-2 text-slate-600">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside ml-6 mb-6 space-y-2 text-slate-600">{children}</ol>,
  li: ({ children }) => <li className="text-lg leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <div className="bg-indigo-50 border-l-4 border-primary rounded-r-xl p-6 my-8 italic text-slate-700">
      {children}
    </div>
  )
};

export default function Tutor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicFromUrl = searchParams.get('topic');
  const skillFromUrl = searchParams.get('skill');
  const { profile, refreshProfile } = useUser();
  
  // App States
  const [phase, setPhase] = useState('lecture'); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  
  // Content States
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Module Metadata (Snapshot for current session)
  const [sessionMetadata, setSessionMetadata] = useState({ 
    title: "Active Module", 
    currentIndex: 0
  });
  
  // Quiz States
  const [quiz, setQuiz] = useState([]);
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [evaluation, setEvaluation] = useState(null);
  const [userFeedback, setUserFeedback] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  // Chat States
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const streamingRef = useRef(null);
  const hasFetched = useRef(false);

  // 1. Initial Load (Lecture only)
  useEffect(() => {
    // GUARD: Prevent background re-fetches when viewing results
    if (phase === 'result' || evaluation?.passed) return;

    const initModule = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      
      setLoading(true);
      try {
        const rawLectureData = await learnerApi.startModule(topicFromUrl, skillFromUrl);
        console.log("Full Backend Response:", rawLectureData);
        
        // 1. Deep Payload Extraction & Type Enforcement
        let lectureText = "";
        
        if (typeof rawLectureData === 'string') {
          lectureText = rawLectureData;
        } else if (Array.isArray(rawLectureData)) {
          lectureText = rawLectureData.join('\n\n');
        } else if (typeof rawLectureData === 'object' && rawLectureData !== null) {
          // Check multiple nested paths for the lesson string
          const rawData = rawLectureData;
          const extracted = rawData.lecture_text || 
                            rawData.lecture || 
                            rawData.tutor_session?.lecture || 
                            rawData.state?.tutor_session?.lecture || 
                            rawData.content || 
                            rawData.text || 
                            "";
          
          lectureText = typeof extracted === 'string' ? extracted : JSON.stringify(extracted);
        }

        console.log("EXTRACTED TEXT TYPE:", typeof lectureText);
        console.log("EXTRACTED TEXT PREVIEW:", String(lectureText).substring(0, 100));

        const isInvalidContent = !lectureText || lectureText === "{}" || lectureText === "null" || lectureText === "";
        
        if (isInvalidContent) {
          setPages(["No module content available."]);
          setLoading(false);
          return;
        }

        // Use global profile for current session metadata with robust path checking
        const rawProfile = profile?.profile || profile?.learner_profile || profile;
        const currentIdx = rawProfile?.current_module_index || 0;
        
        // Find curriculum_plan regardless of where it's tucked in
        const curriculumPlan = rawProfile?.curriculum_plan || profile?.curriculum_plan || {};
        const stages = curriculumPlan?.learning_stages || [];
        
        setSessionMetadata({
          title: topicFromUrl || stages[currentIdx]?.stage_name || `Module ${currentIdx + 1}`,
          currentIndex: currentIdx
        });
        
        // 2. Safe Pagination Logic
        const rawLines = lectureText.split('\n');
        const paginated = [];
        let currentBuffer = [];
        rawLines.forEach(line => {
          if (line.includes('[NEW_PAGE]') || currentBuffer.length >= 80) {
            paginated.push(currentBuffer.join('\n'));
            currentBuffer = [];
            if (!line.includes('[NEW_PAGE]')) currentBuffer.push(line);
          } else {
            currentBuffer.push(line);
          }
        });
        if (currentBuffer.length) paginated.push(currentBuffer.join('\n'));
        
        setPages(paginated);
        
        setMessages([{ 
          role: 'assistant', 
          content: "Welcome to this module. I've prepared the full curriculum on the main screen. Read at your own pace, and I'm here if you need any clarifications." 
        }]);
      } catch (err) {
        console.error("Module start failed", err);
        setPages(["No module content available."]);
      } finally {
        setLoading(false);
      }
    };
    initModule();
  }, [profile, phase, evaluation, topicFromUrl, skillFromUrl]); 

  // 2. Navigation Guard
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (phase !== 'result') {
        e.preventDefault();
        e.returnValue = 'Progress in this module will be lost. Are you sure you want to leave?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // 3. Typewriter Effect
  useEffect(() => {
    if (pages.length > 0 && phase === 'lecture') {
      const targetText = pages[currentPageIndex];
      setDisplayedText("");
      setIsStreaming(true);
      let index = 0;
      if (streamingRef.current) clearInterval(streamingRef.current);
      streamingRef.current = setInterval(() => {
        if (index < targetText.length) {
          setDisplayedText(prev => prev + targetText.charAt(index));
          index++;
        } else {
          clearInterval(streamingRef.current);
          setIsStreaming(false);
        }
      }, 5);
    }
    return () => clearInterval(streamingRef.current);
  }, [pages, currentPageIndex, phase]);

  const handleStartAssessment = async () => {
    setPhase('assessment');
    setIsGeneratingQuiz(true);
    setCurrentQuizStep(0);
    try {
      const questions = await learnerApi.generateQuiz(topicFromUrl);
      setQuiz(questions || []);
    } catch (err) {
      console.error("Quiz generation failed", err);
      setQuiz([]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSkipToAssessment = async () => {
    if (streamingRef.current) clearInterval(streamingRef.current);
    setIsStreaming(false);
    setPhase('assessment');
    setIsGeneratingQuiz(true);
    setCurrentQuizStep(0);
    try {
      const questions = await learnerApi.generateQuiz(topicFromUrl);
      setQuiz(questions || []);
    } catch (err) {
      console.error("Fast-track assessment failed", err);
      setQuiz([]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const toggleMultiSelect = (qId, optionIdx) => {
    const current = userAnswers[qId] || [];
    const updated = current.includes(optionIdx) 
      ? current.filter(i => i !== optionIdx)
      : [...current, optionIdx];
    setUserAnswers({ ...userAnswers, [qId]: updated });
  };

  const handleFillInBlank = (qId, value) => {
    setUserAnswers({ ...userAnswers, [qId]: value });
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    try {
      const payload = {};
      quiz.forEach(q => {
        payload[q.id] = {
          type: q.type,
          user_answer: userAnswers[q.id],
          correct_answer: q.answer,
          question: q.question
        };
      });

      const result = await learnerApi.submitAssessment(payload, userFeedback);
      setEvaluation(result);
      
      if (result.passed) {
        // Sync global state to unlock next modules and update dashboard
        await refreshProfile();
      }
      
      setPhase('result');
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNextModule = () => {
    // Re-check next topic from the freshly synced global profile
    const stages = profile?.profile?.curriculum_plan?.learning_stages || [];
    const currentIdx = profile?.profile?.current_module_index || 0;
    const nextTopicExists = stages[currentIdx] !== undefined;

    if (nextTopicExists) {
      window.location.reload(); 
    } else {
      navigate('/roadmap');
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!userFeedback.trim() || savingFeedback) return;
    setSavingFeedback(true);
    try {
      await learnerApi.submitPedagogyFeedback(userFeedback);
      setFeedbackSaved(true);
      setTimeout(() => setFeedbackSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save feedback", err);
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await learnerApi.sendChatMessage(msg, "Current Module", "General Context");
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Failed to connect to tutor." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-bg-main flex-col gap-6">
      <Loader2 size={48} className="animate-spin text-primary" />
      <p className="font-black text-xs uppercase tracking-widest text-slate-400 animate-pulse text-center">Synchronizing Module Knowledge...</p>
    </div>
  );

  // Derive next module name from global state for the result button
  const globalStages = profile?.profile?.curriculum_plan?.learning_stages || [];
  const globalIdx = profile?.profile?.current_module_index || 0;
  const nextModuleTitle = globalStages[globalIdx]?.stage_name;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">
      {/* Unified Header */}
      <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 rounded-xl text-slate-500 font-bold text-xs transition-all border border-slate-100"
          >
            <Home size={16} /> Dashboard
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="font-black text-slate-900 tracking-tight">Active Learning Session</h1>
        </div>

        <div className="flex items-center gap-4">
          {phase === 'lecture' && (
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Reading Page {currentPageIndex + 1} of {pages.length}
            </div>
          )}
          {evaluation?.passed && (
            <div className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-100">
              Module Mastery Achieved
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-12">
          
          {/* PHASE 1: LECTURE */}
          {phase === 'lecture' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
              <div className="max-w-4xl mx-auto w-full p-10 bg-white rounded-2xl shadow-sm border border-slate-100 mb-8">
                <div className="mb-8 flex justify-between items-start">
                   <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-sm font-medium">
                     Learning Phase {currentPageIndex + 1}
                   </span>
                   <button 
                    onClick={handleSkipToAssessment}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors text-sm flex items-center gap-2 shadow-sm"
                   >
                     <Zap size={16} className="text-amber-500" /> Skip to Assessment
                   </button>
                </div>
                
                <div className="markdown-content">
                  <ReactMarkdown components={MarkdownComponents}>
                    {displayedText}
                  </ReactMarkdown>
                </div>
                
                {isStreaming && (
                  <div className="mt-4 flex items-center gap-2 text-indigo-400 font-medium italic text-sm">
                    <Sparkles size={16} className="animate-pulse" />
                    AI is preparing your module content...
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between w-full max-w-4xl mx-auto mt-8 pt-6 border-t border-slate-200">
                <div className="w-1/3 text-left">
                  {currentPageIndex > 0 && (
                    <button 
                      disabled={isStreaming}
                      onClick={() => setCurrentPageIndex(p => p - 1)}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                      ← Previous Page
                    </button>
                  )}
                </div>

                <div className="w-1/3 text-center">
                  <p className="text-sm font-semibold text-slate-700">Topic: {sessionMetadata.title}</p>
                  <p className="text-xs text-slate-500">Page {currentPageIndex + 1} of {pages.length}</p>
                </div>

                <div className="w-1/3 text-right flex justify-end">
                  {currentPageIndex < pages.length - 1 ? (
                    <button 
                      disabled={isStreaming}
                      onClick={() => setCurrentPageIndex(p => p + 1)}
                      className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                      Next Page →
                    </button>
                  ) : !isStreaming && (
                    <button 
                      onClick={handleStartAssessment}
                      className="px-6 py-2 bg-primary text-white hover:bg-primary-hover rounded-lg transition-colors font-bold flex items-center gap-2 shadow-lg shadow-indigo-100"
                    >
                      Begin Assessment <ArrowRight size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PHASE 2: ASSESSMENT */}
          {phase === 'assessment' && (
            <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-10 mb-12 flex flex-col items-center text-center">
                <div className="inline-flex p-4 bg-white rounded-2xl text-primary mb-6 shadow-sm border border-indigo-100">
                  <Pencil size={32} />
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Module Mastery</h2>
                <p className="text-slate-500 font-medium mt-2 max-w-lg">
                  Verify your understanding through this interactive session. Complete all questions to finalize your result.
                </p>
              </div>

              {isGeneratingQuiz ? (
                <div className="bg-white p-20 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <BrainCircuit size={64} className="text-primary animate-pulse" />
                    <Loader2 size={80} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-100 animate-spin" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-slate-900">AI is generating your customized assessment...</p>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Synthesizing module content</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 text-left">
                  {quiz && quiz.length > 0 ? (
                    <>
                      {/* Wizard Header */}
                      <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          Question {currentQuizStep + 1} of {quiz.length}
                        </span>
                        <div className="flex gap-1.5">
                          {quiz.map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                                i === currentQuizStep ? 'bg-primary w-10' : 
                                (userAnswers[quiz[i].id] !== undefined ? 'bg-indigo-200' : 'bg-slate-100')
                              }`} 
                            />
                          ))}
                        </div>
                      </div>

                      {/* Active Question Card */}
                      <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-xl shadow-indigo-100/20 relative group min-h-[400px] flex flex-col">
                        <div className="mb-10">
                          <div className="flex items-center gap-2 mb-3">
                            {quiz[currentQuizStep].type === 'mcq' && <CheckCircle2 size={16} className="text-blue-500" />}
                            {quiz[currentQuizStep].type === 'multi-select' && <CheckSquare size={16} className="text-purple-500" />}
                            {quiz[currentQuizStep].type === 'fill-in-the-blank' && <Type size={16} className="text-orange-500" />}
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {quiz[currentQuizStep].type.replace('-', ' ')}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 leading-tight">
                            {quiz[currentQuizStep].question}
                          </h3>
                        </div>

                        <div className="flex-1">
                          {quiz[currentQuizStep].type === 'fill-in-the-blank' ? (
                            <input 
                              type="text"
                              autoFocus
                              placeholder="Type your answer here..."
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 font-bold text-xl text-primary focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                              value={userAnswers[quiz[currentQuizStep].id] || ""}
                              onChange={(e) => handleFillInBlank(quiz[currentQuizStep].id, e.target.value)}
                            />
                          ) : (
                            <div className="grid grid-cols-1 gap-4">
                              {quiz[currentQuizStep].options?.map((opt, oIdx) => {
                                const isSelected = quiz[currentQuizStep].type === 'mcq' 
                                  ? userAnswers[quiz[currentQuizStep].id] === oIdx
                                  : (userAnswers[quiz[currentQuizStep].id] || []).includes(oIdx);
                                
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => quiz[currentQuizStep].type === 'mcq' ? setUserAnswers({...userAnswers, [quiz[currentQuizStep].id]: oIdx}) : toggleMultiSelect(quiz[currentQuizStep].id, oIdx)}
                                    className={`flex items-center justify-between p-6 rounded-2xl border-2 transition-all group/opt ${
                                      isSelected 
                                        ? 'border-primary bg-indigo-50/50 text-primary shadow-md' 
                                        : 'border-slate-50 hover:border-slate-200 bg-white text-slate-600'
                                    }`}
                                  >
                                    <span className="text-lg font-bold">{opt}</span>
                                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${
                                      isSelected ? 'bg-primary border-primary text-white' : 'border-slate-200 bg-slate-50 group-hover/opt:border-slate-300'
                                    }`}>
                                      {isSelected && (quiz[currentQuizStep].type === 'mcq' ? <div className="w-2.5 h-2.5 rounded-full bg-white" /> : <CheckCircle2 size={18} />)}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Navigation Footer */}
                      <div className="flex items-center justify-between pt-6">
                        <button 
                          disabled={currentQuizStep === 0}
                          onClick={() => setCurrentQuizStep(prev => prev - 1)}
                          className={`px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${
                            currentQuizStep === 0 ? 'opacity-0 pointer-events-none' : 'text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <ChevronLeft size={20} /> Previous Question
                        </button>

                        {currentQuizStep < quiz.length - 1 ? (
                          <button 
                            onClick={() => setCurrentQuizStep(prev => prev + 1)}
                            className="px-8 py-4 bg-white border border-slate-200 text-slate-900 hover:border-primary hover:text-primary rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
                          >
                            Save & Next Question <ChevronRight size={20} />
                          </button>
                        ) : (
                          <button 
                            disabled={submitting}
                            onClick={submitAssessment}
                            className="px-10 py-5 bg-slate-900 text-white hover:bg-black rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 transition-all shadow-xl shadow-slate-200 animate-in fade-in zoom-in duration-300"
                          >
                            {submitting ? <Loader2 size={20} className="animate-spin" /> : <><Trophy size={20} className="text-amber-400" /> Complete Assessment</>}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-xl">
                      <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                      <h3 className="text-xl font-black text-slate-900 mb-2">Assessment Unavailable</h3>
                      <p className="text-slate-500 font-medium">Failed to load questions. Please refresh or try again later.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PHASE 3: RESULT */}
          {phase === 'result' && evaluation && (
            <div className="max-w-4xl mx-auto space-y-12 pb-20 animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center">
                <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl rotate-3 transition-transform hover:rotate-0 ${
                  evaluation.passed ? 'bg-green-500 text-white shadow-green-100' : 'bg-red-500 text-white shadow-red-100'
                }`}>
                  <span className="text-3xl font-black">{Math.round(evaluation.score)}%</span>
                </div>
                
                <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                  {evaluation.passed ? "Module Mastered" : "Review Recommended"}
                </h2>
                <p className="text-slate-500 font-medium text-lg leading-relaxed italic max-w-2xl mx-auto">
                  "{evaluation.motivational_feedback}"
                </p>
              </div>

              {/* Action Bar */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex gap-4">
                  {!evaluation.passed && (
                    <button 
                      onClick={() => { setPhase('lecture'); setUserAnswers({}); setCurrentQuizStep(0); setShowReview(false); }}
                      className="px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
                    >
                      <ArrowLeft size={18} /> Review Lesson
                    </button>
                  )}
                  <button 
                    onClick={() => setShowReview(!showReview)}
                    className={`px-8 py-4 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 ${
                      showReview ? 'bg-slate-100 text-slate-900' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {showReview ? <ChevronUp size={18} /> : <ChevronDown size={18} />} 
                    {showReview ? "Hide Review" : "Detailed Answer Review"}
                  </button>
                </div>

                <button 
                  onClick={handleStartNextModule}
                  className="px-10 py-4 bg-primary text-white hover:bg-primary-hover rounded-2xl font-black uppercase tracking-widest text-sm flex items-center gap-3 shadow-xl shadow-indigo-100 active:scale-95 transition-all"
                >
                  {nextModuleTitle ? (
                    <>Start Next Module: {nextModuleTitle} <ChevronRight size={20} /></>
                  ) : (
                    <>Complete Journey <Trophy size={20} className="text-amber-300" /></>
                  )}
                </button>
              </div>

              {/* Detailed Review Section */}
              {showReview && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <h3 className="text-xl font-bold text-slate-900 px-2 flex items-center gap-2">
                    <Info size={20} className="text-primary" /> Performance Breakdown
                  </h3>
                  {quiz.map((q, idx) => {
                    const isCorrect = evaluation.is_correct_map?.[q.id];
                    const userAns = userAnswers[q.id];
                    const correctAns = q.answer;

                    return (
                      <div key={q.id} className={`bg-white p-8 rounded-3xl border-2 transition-all ${
                        isCorrect ? 'border-green-100' : 'border-red-100'
                      }`}>
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                              isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {q.type.replace('-', ' ')}
                            </span>
                          </div>
                          {isCorrect ? (
                            <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs uppercase tracking-wider">
                              <CheckCircle2 size={16} /> Correct
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-red-600 font-bold text-xs uppercase tracking-wider">
                              <XCircle size={16} /> Incorrect
                            </div>
                          )}
                        </div>

                        <p className="text-lg font-bold text-slate-900 mb-6">{q.question}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className={`p-4 rounded-2xl border ${isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Your Response</span>
                            <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {q.type === 'mcq' ? q.options[userAns] : (q.type === 'multi-select' ? (userAns?.map(i => q.options[i]).join(', ') || 'No answer') : (userAns || 'No answer'))}
                            </p>
                          </div>
                          {!isCorrect && (
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Correct Answer</span>
                              <p className="font-bold text-slate-700">
                                {q.type === 'mcq' ? q.options[correctAns] : (q.type === 'multi-select' ? correctAns.map(i => q.options[i]).join(', ') : correctAns)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex gap-4">
                          <BrainCircuit size={20} className="text-primary shrink-0 mt-1" />
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-primary block mb-1">Tutor Explanation</span>
                            <p className="text-sm text-indigo-900 font-medium leading-relaxed">
                              {q.explanation || "This concept focuses on applying core principles learned in the module to practical scenarios. Understanding this helps bridge the gap between theory and execution."}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Post-Lesson Feedback */}
              <div className="bg-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-black mb-2 tracking-tight flex items-center gap-3">
                    <Sparkles size={24} className="text-indigo-400" />
                    How was this lesson?
                    <span className="text-[10px] bg-white/10 text-slate-400 px-2 py-1 rounded uppercase tracking-widest ml-2">Optional</span>
                  </h3>
                  <p className="text-slate-400 text-sm font-medium mb-8 max-w-lg">
                    Your feedback is processed by my AI to adapt future modules to your learning style.
                  </p>
                  
                  <div className="space-y-6">
                    <textarea 
                      rows={4}
                      placeholder="Optional: Tell me about the clarity, pace, or difficulty..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-slate-500 outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium disabled:opacity-50"
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      disabled={feedbackSaved}
                    />
                    
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex-1 w-full">
                        <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 text-left">Current Learning Profile</h4>
                        <p className="text-xs font-bold text-indigo-100 leading-relaxed text-left">{evaluation?.new_pedagogy}</p>
                      </div>
                      
                      <button 
                        onClick={handleFeedbackSubmit}
                        disabled={!userFeedback.trim() || savingFeedback || feedbackSaved}
                        className={`px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3 min-w-[220px] justify-center shadow-2xl ${
                          feedbackSaved 
                            ? 'bg-green-500 text-white cursor-default' 
                            : 'bg-primary text-white hover:bg-primary-hover active:scale-95 disabled:opacity-30'
                        }`}
                      >
                        {savingFeedback ? <Loader2 size={18} className="animate-spin" /> : (
                          feedbackSaved ? <><CheckCircle2 size={18} /> Preference Saved</> : <>Send Feedback <ArrowRight size={18} /></>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Chat */}
      <button 
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed bottom-8 left-8 p-5 bg-primary text-white rounded-[1.5rem] shadow-2xl transition-all hover:scale-110 z-50 ${chatOpen ? 'opacity-0 scale-0' : 'opacity-100'}`}
      >
        <MessageCircle size={32} />
      </button>

      {chatOpen && (
        <div className="fixed bottom-8 left-8 w-[400px] h-[650px] bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-10">
          <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              <Sparkles size={24} className="text-indigo-400" />
              <span className="font-black text-xs uppercase tracking-widest">AI Support</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={20} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                  m.role === 'user' ? 'bg-primary text-white' : 'bg-white border border-slate-100 text-slate-700'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                  <Loader2 className="animate-spin text-primary" size={20} />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleChat} className="p-6 bg-white border-t border-slate-100">
            <div className="relative">
              <input 
                type="text"
                placeholder="Ask your tutor..."
                className="w-full pl-6 pr-16 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 text-sm font-medium border border-slate-100"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-primary-hover transition-colors">
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
