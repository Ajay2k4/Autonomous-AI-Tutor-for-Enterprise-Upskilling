import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Clock, 
  BarChart, 
  PlayCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { learnerApi } from '../api';

const CourseCard = ({ course, completedTopics }) => {
  const navigate = useNavigate();
  const { skill, stage_number, estimated_weeks, topics, difficulty } = course;
  
  // Calculate progress based on completed topics
  const completedInSkill = topics.filter(t => completedTopics.includes(t)).length;
  const progress = topics.length > 0 ? Math.round((completedInSkill / topics.length) * 100) : 0;
  const isCompleted = progress === 100;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all group overflow-hidden flex flex-col h-full">
      <div className={`h-2 w-full ${isCompleted ? 'bg-green-500' : 'bg-primary opacity-20 group-hover:opacity-100 transition-opacity'}`} />
      
      <div className="p-8 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-6">
          <span className="px-3 py-1 rounded-lg bg-indigo-50 text-primary text-[10px] font-black uppercase tracking-widest border border-indigo-100/50">
            Phase {stage_number}
          </span>
          {isCompleted && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 size={16} />
            </span>
          )}
        </div>
        
        <h4 className="text-xl font-black text-slate-900 mb-2 group-hover:text-primary transition-colors leading-tight">
          {skill}
        </h4>
        <p className="text-slate-500 text-xs font-medium mb-6 line-clamp-2">
          Master the essentials of {skill} through {topics.length} specialized topic modules.
        </p>

        <div className="mt-auto space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              <BarChart size={14} className="text-primary opacity-50" />
              {difficulty}
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              <Clock size={14} className="text-primary opacity-50" />
              {estimated_weeks} Weeks
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-400">Proficiency</span>
              <span className={isCompleted ? 'text-green-600' : 'text-primary'}>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-8 pb-8 pt-2">
        <button 
          onClick={() => !isCompleted && navigate(`/tutor?topic=${encodeURIComponent(skill)}`)}
          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all ${
          isCompleted 
            ? 'bg-slate-50 text-slate-400 cursor-default' 
            : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-indigo-100 active:scale-[0.98]'
        }`}>
          {isCompleted ? 'Module Completed' : progress > 0 ? 'Continue Lesson' : 'Start Lesson'}
          {!isCompleted && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  );
};

export default function Courses() {
  const [stages, setStages] = useState([]);
  const [profile, setProfile] = useState(null);
  const [completedTopics, setCompletedTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const hydrate = async () => {
      try {
        const normalize = (raw) => {
          if (!raw) return null;
          const profile = raw.profile || raw.learner_profile || raw;
          const curriculum = profile.curriculum_plan || raw.curriculum_plan;
          const completed = raw.completed || raw.completed_topics || [];
          
          if (curriculum?.learning_stages) {
            return {
              stages: curriculum.learning_stages,
              profile: profile,
              completed: completed
            };
          }
          return null;
        };

        // 1. Immediate hydration from cache
        const cached = localStorage.getItem('graph_state');
        if (cached) {
          const normalized = normalize(JSON.parse(cached));
          if (normalized) {
            setStages(normalized.stages);
            setProfile(normalized.profile);
            setCompletedTopics(normalized.completed);
            setLoading(false);
          }
        }

        // 2. Fresh sync from API
        const data = await learnerApi.getProfile();
        const normalized = normalize(data);
        if (normalized) {
          setStages(normalized.stages);
          setProfile(normalized.profile);
          setCompletedTopics(normalized.completed);
        }
      } catch (err) {
        console.error("Courses hydration error:", err);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  if (loading && stages.length === 0) return (
    <div className="flex h-screen items-center justify-center bg-bg-main">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-primary rounded-full animate-spin"></div>
        <p className="font-bold text-slate-500 animate-pulse uppercase tracking-widest text-xs text-center">Cataloging Skills...</p>
      </div>
    </div>
  );

  const skillGapSkills = profile?.skill_gap?.skills || [];

  const flattenedCourses = stages.flatMap(stage => 
    (stage.skills || []).map(skill => {
      // Find matching skill in skill_gap to infer difficulty
      const gapInfo = skillGapSkills.find(s => s.skill === skill.skill);
      const targetLevel = gapInfo?.target_level || 3;
      let difficulty = 'Intermediate';
      if (targetLevel <= 2) difficulty = 'Beginner';
      if (targetLevel >= 4) difficulty = 'Advanced';

      return {
        ...skill,
        stage_number: stage.stage,
        difficulty
      };
    })
  );

  const filteredCourses = flattenedCourses.filter(course => {
    const completedInSkill = course.topics.filter(t => completedTopics.includes(t)).length;
    const progress = course.topics.length > 0 ? Math.round((completedInSkill / course.topics.length) * 100) : 0;
    
    if (filter === 'In Progress') return progress > 0 && progress < 100;
    if (filter === 'Completed') return progress === 100;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-50 rounded-lg text-primary">
                <BookOpen size={20} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-pretty">My Learning Path</h1>
            </div>
            <p className="text-slate-500 font-bold text-sm">
              Flattened roadmap into {flattenedCourses.length} skill modules across {stages.length} pedagogical phases.
            </p>
          </div>
          
          <div className="relative group min-w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search your curriculum..." 
              className="pl-12 pr-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full font-bold text-xs uppercase tracking-widest placeholder:text-slate-300 transition-all"
            />
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-10 p-1.5 bg-slate-200/40 rounded-[1.25rem] w-fit border border-slate-100">
          {['All', 'In Progress', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                filter === tab 
                  ? 'bg-white text-primary shadow-lg shadow-indigo-100 border border-indigo-50' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredCourses.map((course, idx) => (
              <CourseCard key={idx} course={course} completedTopics={completedTopics} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-200 mb-6">
              <Sparkles size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">No modules found here</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Try adjusting your filters to see more</p>
          </div>
        )}
      </main>
    </div>
  );
}
