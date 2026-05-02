import React from 'react';
import Sidebar from '../components/Sidebar';
import { UserCircle, Settings, Shield, Bell, CreditCard } from 'lucide-react';
import { useUser } from '../UserContext';

const ProfileSection = ({ icon: Icon, title, description, badge }) => (
  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer text-left">
    <div className="flex justify-between items-start mb-6">
      <div className="p-4 bg-indigo-50 text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
        <Icon size={24} />
      </div>
      {badge && (
        <span className="text-[10px] font-black bg-green-100 text-green-600 px-3 py-1.5 rounded-full uppercase tracking-widest border border-green-200">
          {badge}
        </span>
      )}
    </div>
    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 uppercase">{title}</h3>
    <p className="text-slate-500 font-medium text-sm leading-relaxed">{description}</p>
  </div>
);

const UserProfile = () => {
  const { profile: rawProfile } = useUser();
  const username = localStorage.getItem('username') || 'Learner';
  const profile = rawProfile?.profile || rawProfile?.learner_profile || rawProfile;
  const targetRole = profile?.target_role || "Professional Role";

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar />
      
      <main className="flex-1 p-8 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-end mb-12 text-left">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-primary text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-100">
              Account Management
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">User Profile</h1>
            <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs">Manage your preferences and career goals</p>
          </div>
        </header>

        {/* User Identity Card */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-indigo-100/20 mb-12 relative overflow-hidden text-left">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-[2rem] bg-primary text-white flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-200 rotate-3 hover:rotate-0 transition-transform cursor-default">
              {username[0]?.toUpperCase()}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase">{username}</h2>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <span className="bg-slate-50 text-slate-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-slate-100">
                  Target: {targetRole}
                </span>
                <span className="bg-indigo-50 text-primary px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100">
                  Account: Standard
                </span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-full bg-slate-50/50 skew-x-12 translate-x-1/2 -z-0" />
        </div>

        {/* Profile Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ProfileSection 
            icon={UserCircle} 
            title="Personal Info" 
            description="Update your display name and personal identification details."
          />
          <ProfileSection 
            icon={Settings} 
            title="Career Goals" 
            description="Redefine your target role and desired proficiency levels."
            badge="AI Powered"
          />
          <ProfileSection 
            icon={Shield} 
            title="Security" 
            description="Manage your password and account authentication methods."
          />
          <ProfileSection 
            icon={Bell} 
            title="Notifications" 
            description="Configure how and when you receive learning updates."
          />
          <ProfileSection 
            icon={CreditCard} 
            title="Subscription" 
            description="Manage your payment methods and billing history."
            badge="Active"
          />
        </div>

        <div className="mt-16 p-12 bg-slate-900 rounded-[3rem] text-white text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-4 tracking-tight uppercase">Ready to refine your journey?</h3>
            <p className="text-slate-400 font-medium mb-8 max-w-xl mx-auto leading-relaxed">
              Updating your profile helps our AI better tailor the curriculum to your evolving career aspirations.
            </p>
            <button className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-black/20">
              Update Preferences
            </button>
          </div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
