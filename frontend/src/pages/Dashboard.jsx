import React from 'react';
import Sidebar from '../components/Sidebar';
import { 
  Sparkles, 
  Target, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  Clock,
  PlayCircle,
  ArrowRight
} from 'lucide-react';
import { useUser } from '../UserContext';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{value}</p>
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { profile: rawProfile, loading } = useUser();

  if (loading && !rawProfile) return (
    <div className="flex h-screen items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-primary rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 animate-pulse uppercase tracking-widest text-xs text-center">Syncing Intelligence...</p>
      </div>
    </div>
  );

  const profile = rawProfile?.profile || rawProfile?.learner_profile || rawProfile;
  const completed = rawProfile?.completed || rawProfile?.completed_topics || [];

  const targetRole = profile?.target_role || "Professional Role";
  const skillGapCount = profile?.skill_gap?.skills?.length || 0;
  const estWeeks = profile?.curriculum_plan?.total_estimated_duration_weeks || 0;
  const stages = profile?.curriculum_plan?.learning_stages || [];
  
  const allTopics = stages.flatMap(s => (s.skills || []).flatMap(sk => sk.topics || [])) || [];
  const totalTopics = allTopics.length || 1;
  const overallProgress = Math.round((completed.length / totalTopics) * 100);

  const calculateStageProgress = (stage) => {
    const stageTopics = (stage.skills || []).flatMap(sk => sk.topics || []);
    if (stageTopics.length === 0) return 0;
    
    // Check how many of these specific topics are in the global 'completed' list
    const completedInStage = stageTopics.filter(topic => completed.includes(topic));
    return Math.round((completedInStage.length / stageTopics.length) * 100);
  };

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 text-left">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Focus Dashboard</h1>
            <p className="text-slate-500 font-bold mt-1">Accelerate your transition to {targetRole}</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-primary transition-colors shadow-sm">
              <Calendar size={20} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-white shadow-md flex items-center justify-center text-primary font-black">
              {localStorage.getItem('username')?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-indigo-700 rounded-3xl p-10 mb-10 text-white shadow-2xl shadow-indigo-200 text-left">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20">
              <Sparkles size={14} className="animate-pulse" />
              Intelligence Optimized Path
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight tracking-tight">
              Your roadmap to <span className="underline decoration-white/30 underline-offset-8">{targetRole}</span> is ready
            </h2>
            <p className="text-indigo-100 text-lg mb-8 font-medium leading-relaxed">
              We've identified {skillGapCount} critical skill gaps. Your personalized curriculum is designed to bridge them in {estWeeks} weeks.
            </p>
            <button 
              onClick={() => {
                const firstStage = stages[profile?.current_module_index || 0];
                const firstTopic = firstStage?.skills?.[0]?.topics?.[0] || firstStage?.stage_name;
                const firstSkill = firstStage?.skills?.[0]?.skill;
                window.location.href = `/tutor?topic=${encodeURIComponent(firstTopic)}&skill=${encodeURIComponent(firstSkill)}`;
              }}
              className="bg-white text-primary px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all flex items-center gap-2 shadow-xl shadow-black/10 group active:scale-95"
            >
              Start Learning Session
              <PlayCircle size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 skew-x-12 translate-x-1/4 pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 text-left">
          <StatCard 
            icon={Target} 
            label="Skills to Master" 
            value={skillGapCount} 
            color="bg-purple-50 text-purple-600"
          />
          <StatCard 
            icon={Clock} 
            label="Estimated Weeks" 
            value={estWeeks} 
            color="bg-orange-50 text-orange-600"
          />
          <StatCard 
            icon={BookOpen} 
            label="Modules Available" 
            value={stages.length} 
            color="bg-blue-50 text-blue-600"
          />
          <StatCard 
            icon={TrendingUp} 
            label="Current Completion" 
            value={`${overallProgress}%`} 
            color="bg-green-50 text-green-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 text-left">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Learning Stages</h3>
                <span className="text-[10px] font-black text-primary bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-indigo-100">Live Track</span>
              </div>
              
              <div className="space-y-8">
                {stages.map((stage, idx) => {
                  const stageProgress = calculateStageProgress(stage);
                  const isCurrent = idx === (profile?.current_module_index || 0);
                  
                  return (
                    <div key={idx} className="group cursor-pointer">
                      <div className="flex justify-between items-end mb-3">
                        <div>
                          <h4 className={`font-black tracking-tight transition-colors ${isCurrent ? 'text-primary' : 'text-slate-800 group-hover:text-primary'}`}>
                            {stage.stage_name || `Phase ${stage.stage}`}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {stage.skills?.length} Skill Nodes • {stage.skills?.reduce((sum, s) => sum + (s.estimated_weeks || 0), 0)} Weeks
                          </p>
                        </div>
                        <span className="text-sm font-black text-slate-900">{stageProgress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${isCurrent ? 'bg-primary' : (stageProgress === 100 ? 'bg-green-500' : 'bg-slate-300')}`}
                          style={{ width: `${stageProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Phase Summary</h3>
                <div className="p-2 bg-indigo-50 rounded-xl text-primary">
                  <Target size={20} />
                </div>
              </div>
              
              <div className="space-y-6">
                {stages.map((stage, idx) => {
                  const isCurrent = idx === (profile?.current_module_index || 0);
                  const isCompleted = calculateStageProgress(stage) === 100;

                  return (
                    <div key={idx} className="flex gap-4 group">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-black text-xs border-2 transition-all ${
                          isCurrent 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-indigo-100 scale-110' 
                            : isCompleted 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'bg-white border-slate-100 text-slate-300'
                        }`}>
                          {idx + 1}
                        </div>
                        {idx !== (stages.length - 1) && (
                          <div className="w-0.5 h-full bg-slate-100 rounded-full" />
                        )}
                      </div>
                      <div className="pb-6">
                        <h4 className={`text-sm font-black tracking-tight ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                          {stage.stage_name || `Phase ${stage.stage}`}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
                          {stage.skills?.reduce((sum, s) => sum + (s.estimated_weeks || 0), 0)} Weeks
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button 
                onClick={() => window.location.href = '/roadmap'}
                className="w-full mt-4 py-4 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group"
              >
                View Full Roadmap
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
