import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  BookOpen, 
  Target, 
  UserCircle, 
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';

const NavItem = ({ icon: Icon, label, to, active = false }) => (
  <Link to={to} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
    active 
      ? 'bg-primary text-white shadow-lg shadow-indigo-100' 
      : 'text-slate-500 hover:bg-indigo-50 hover:text-primary'
  }`}>
    <Icon size={20} className={active ? 'text-white' : 'group-hover:text-primary'} />
    <span className="font-bold text-sm">{label}</span>
    {active && <ChevronRight size={16} className="ml-auto" />}
  </Link>
);

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Learner';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isPathActive = (path) => location.pathname === path;

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-100 flex flex-col p-6 sticky top-0 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
          <Sparkles size={24} />
        </div>
        <span className="font-black text-xl tracking-tight">SkillForge <span className="text-primary">AI</span></span>
      </div>

      {/* User Profile Widget */}
      <div className="flex items-center gap-3 mb-10 p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
        <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-primary font-bold text-lg">
          {username[0]?.toUpperCase() || 'U'}
        </div>
        <div className="overflow-hidden">
          <h3 className="font-bold text-slate-900 text-sm truncate">{username}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Free Plan</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        <NavItem 
          icon={LayoutDashboard} 
          label="Dashboard" 
          to="/dashboard" 
          active={isPathActive('/dashboard')} 
        />
        <NavItem 
          icon={Map} 
          label="My Roadmap" 
          to="/roadmap" 
          active={isPathActive('/roadmap')} 
        />
        <NavItem 
          icon={BookOpen} 
          label="Courses" 
          to="/courses" 
          active={isPathActive('/courses')} 
        />
        <NavItem 
          icon={Target} 
          label="Skill Gap" 
          to="/skill-gap" 
          active={isPathActive('/skill-gap')} 
        />
        <NavItem 
          icon={UserCircle} 
          label="Profile" 
          to="/profile" 
          active={isPathActive('/profile')} 
        />
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-slate-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group font-bold text-sm"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          Logout
        </button>
      </div>
    </aside>
  );
}
