import React from 'react';
import Sidebar from '../components/Sidebar';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight,
  BookOpen,
  Lock,
  Target,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../UserContext';

const PhaseNode = ({ stage, index, isLocked, isCompleted, isCurrent, onEnter }) => {
  return (
    <div className={`relative flex gap-8 ${index % 2 !== 0 ? 'flex-row-reverse' : ''} group`}>
      {/* Path Connector */}
      <div className={`absolute top-1/2 ${index % 2 === 0 ? 'left-[calc(100%-2rem)]' : 'right-[calc(100%-2rem)]'} w-full h-1 border-t-4 border-dashed transition-colors duration-500 -translate-y-1/2 -z-10 ${
        isCompleted ? 'border-green-200' : 'border-slate-100'
      }`} />

      {/* Main Card */}
      <div className={`w-full max-w-md p-8 rounded-3xl border-2 transition-all duration-500 relative ${
        isLocked 
          ? 'bg-slate-50/50 border-slate-100 opacity-60 grayscale' 
          : isCurrent
            ? 'bg-white border-primary shadow-2xl shadow-indigo-100 scale-105'
            : isCompleted
              ? 'bg-white border-green-100 shadow-xl shadow-green-50'
              : 'bg-white border-slate-100 shadow-lg'
      }`}>
        <div className="flex justify-between items-start mb-6">
          <div className={`p-3 rounded-2xl ${
            isLocked ? 'bg-slate-100 text-slate-400' : isCompleted ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-primary'
          }`}>
            {isCompleted ? <CheckCircle2 size={24} /> : isLocked ? <Lock size={24} /> : <Target size={24} />}
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-1 ${
              isLocked ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-primary'
            }`}>
              Phase {stage.stage}
            </span>
            {isCurrent && (
              <span className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase tracking-tighter">
                <Sparkles size={10} /> Active Goal
              </span>
            )}
          </div>
        </div>

        <h3 className={`text-xl font-black mb-3 tracking-tight ${isLocked ? 'text-slate-400' : 'text-slate-900'}`}>
          {stage.stage_name || `Module ${stage.stage}`}
        </h3>
        
        <div className="space-y-3 mb-8">
          {stage.skills?.map((skill, sIdx) => (
            <div key={sIdx} className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <div className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-slate-200' : 'bg-indigo-300'}`} />
              {skill.skill}
            </div>
          ))}
        </div>

        {!isLocked && (
          <button 
            onClick={onEnter}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isCompleted 
                ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-100' 
                : 'bg-primary text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
            }`}
          >
            {isCompleted ? 'Review Content' : 'Enter Session'}
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Progress Circle Visual */}
      <div className={`hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full items-center justify-center font-black text-sm z-10 transition-all duration-500 ${
        isCompleted ? 'bg-green-500 text-white ring-8 ring-green-50' : isCurrent ? 'bg-primary text-white ring-8 ring-indigo-50' : 'bg-white border-2 border-slate-200 text-slate-300'
      }`}>
        {index + 1}
      </div>
    </div>
  );
};

export default function Roadmap() {
  const navigate = useNavigate();
  const { profile: rawProfile, loading } = useUser();

  if (loading && !rawProfile) return (
    <div className="flex h-screen items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-primary rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 animate-pulse">Syncing Roadmap...</p>
      </div>
    </div>
  );

  const profile = rawProfile?.profile || rawProfile?.learner_profile || rawProfile;
  const completed = rawProfile?.completed || rawProfile?.completed_topics || [];
  const stages = profile?.curriculum_plan?.learning_stages || [];
  const currentModuleIndex = profile?.current_module_index || 0;

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <header className="max-w-4xl mx-auto mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-primary text-[10px] font-black uppercase tracking-widest mb-6 border border-indigo-100">
            <Sparkles size={14} /> AI-Generated Learning Path
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
            Your Journey to <span className="text-primary">{profile?.target_role || 'Success'}</span>
          </h1>
          <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto leading-relaxed">
            Follow the pedagogically sequenced stages to master each core skill. Each phase builds upon the previous one.
          </p>
        </header>

        {/* Roadmap Visualization */}
        <div className="max-w-4xl mx-auto pb-20 relative">
          {/* Central Vertical Line (Visible only on desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-slate-100 -translate-x-1/2 -z-20" />

          <div className="space-y-24">
            {stages.length > 0 ? (
              stages.map((stage, idx) => {
                // A module is completed if its title is in the completed list
                const isCompleted = completed.includes(stage.stage_name);
                // A module is current if its index matches the backend index
                const isCurrent = idx === currentModuleIndex;
                // A module is locked if its index is greater than the current index AND it hasn't been completed
                const isLocked = idx > currentModuleIndex && !isCompleted;

                return (
                  <PhaseNode 
                    key={idx}
                    stage={stage}
                    index={idx}
                    isLocked={isLocked}
                    isCompleted={isCompleted}
                    isCurrent={isCurrent}
                    onEnter={() => {
                      const firstTopic = stage.skills?.[0]?.topics?.[0] || stage.stage_name;
                      const firstSkill = stage.skills?.[0]?.skill;
                      navigate(`/tutor?topic=${encodeURIComponent(firstTopic)}&skill=${encodeURIComponent(firstSkill)}`);
                    }}
                  />
                );
              })
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-xl">
                <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">No Stages Identified</h3>
                <p className="text-slate-500 font-medium">Please complete the onboarding to generate your personalized roadmap.</p>
                <button 
                  onClick={() => navigate('/onboarding')}
                  className="mt-6 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 mx-auto"
                >
                  Start Onboarding <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Final Milestone */}
          {stages.length > 0 && (
            <div className="mt-32 text-center relative">
              <div className={`inline-flex flex-col items-center gap-4 transition-all duration-1000 ${
                currentModuleIndex >= stages.length ? 'scale-110 opacity-100' : 'opacity-40 grayscale'
              }`}>
                <div className="w-24 h-24 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-2xl ring-8 ring-slate-100">
                  <Target size={40} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight">Professional Mastery</h4>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Goal Reached</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
