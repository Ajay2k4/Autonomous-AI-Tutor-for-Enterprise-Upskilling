import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, User, UserPlus } from 'lucide-react';
import { learnerApi } from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (isRegistering = false) => {
    setLoading(true);
    setError('');
    setShowRegisterPrompt(false);
    
    try {
      if (isRegistering) {
        // Explicit Registration
        await learnerApi.register(username, password);
        // After registration, auto-login
        const data = await learnerApi.login(username, password);
        processLogin(data);
      } else {
        // Attempt Login
        try {
          const data = await learnerApi.login(username, password);
          processLogin(data);
        } catch (err) {
          if (err.response?.status === 404) {
            // User not found, ask to register
            setShowRegisterPrompt(true);
            setLoading(false);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
      setLoading(false);
    }
  };

  const processLogin = async (data) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('username', data.username);
    
    if (data.has_profile) {
      try {
        // Explicitly fetch and cache the latest profile before redirection
        const profileData = await learnerApi.getProfile();
        localStorage.setItem('graph_state', JSON.stringify(profileData));
      } catch (err) {
        console.error("Login sync failed:", err);
      }
      navigate('/dashboard');
    } else {
      // Clear cache for new user onboarding
      localStorage.removeItem('graph_state');
      navigate('/onboarding');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAuth(false);
  };

  return (
    <div className="auth-container">
      <div className="glass-card">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary text-white rounded-xl mb-4 shadow-lg shadow-indigo-100">
            <Sparkles size={28} />
          </div>
          <h2 className="text-2xl font-black text-text-dark tracking-tight">
            SkillForge AI
          </h2>
          <p className="text-sm font-bold text-text-muted mt-1 uppercase tracking-widest">
            Intelligent Pathfinding
          </p>
        </div>

        {error && !showRegisterPrompt && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider text-center">
            {error}
          </div>
        )}

        {showRegisterPrompt ? (
          <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 text-center mb-2">
            <p className="font-black text-indigo-900 mb-2 uppercase tracking-tight">User Not Found</p>
            <p className="text-sm font-medium text-indigo-700/70 mb-6 leading-relaxed">
              Would you like to create a new secure account for <span className="text-indigo-900 font-bold">{username}</span>?
            </p>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleAuth(true)}
                className="btn-primary"
              >
                <UserPlus size={18} /> Yes, Register Now
              </button>
              <button 
                onClick={() => setShowRegisterPrompt(false)}
                className="py-3 text-xs font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Username</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Your username"
                  className="pl-12"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="relative group">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password" 
                  placeholder="Your password"
                  className="pl-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Authorizing...' : 'Access My Path'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
