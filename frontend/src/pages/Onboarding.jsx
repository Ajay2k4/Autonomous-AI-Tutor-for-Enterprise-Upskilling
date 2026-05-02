import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Target, Clock, Rocket, Sparkles } from 'lucide-react';
import { learnerApi } from '../api';

export default function Onboarding() {
  const [formData, setFormData] = useState({
    current_role: '',
    target_role: '',
    experience_years: '',
    learning_goal: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Data preparation
      const payload = {
        current_role: formData.current_role,
        target_role: formData.target_role,
        experience_years: parseFloat(formData.experience_years) || 0,
        learning_goal: formData.learning_goal || `Transition from ${formData.current_role} to ${formData.target_role}`
      };

      const response = await learnerApi.onboard(payload);
      // Wrap in a structure consistent with getProfile API
      const sessionData = {
        profile: {
          ...response.learner_profile,
          curriculum_plan: response.curriculum_plan,
          skill_gap: response.skill_gap,
          target_role: payload.target_role
        },
        completed: response.completed_topics || []
      };
      localStorage.setItem('graph_state', JSON.stringify(sessionData));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred during onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-dark)', letterSpacing: '-0.025em' }}>
            Set Your <span style={{ color: 'var(--primary)' }}>Trajectory</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontWeight: 500 }}>
            Tell us where you are and where you want to go. We'll bridge the gap.
          </p>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label><Briefcase size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Current Role</label>
            <input 
              type="text" 
              placeholder="e.g. Junior Web Developer"
              value={formData.current_role}
              onChange={(e) => setFormData({ ...formData, current_role: e.target.value })}
              required
            />
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label><Target size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Target Role</label>
            <input 
              type="text" 
              placeholder="e.g. Senior Full Stack Engineer"
              value={formData.target_role}
              onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label><Clock size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Experience (Years)</label>
            <input 
              type="number" 
              step="0.5"
              placeholder="e.g. 2.5"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
              required
            />
          </div>

          <div className="input-group">
            <label><Sparkles size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Main Goal</label>
            <select 
              value={formData.learning_goal}
              onChange={(e) => setFormData({ ...formData, learning_goal: e.target.value })}
            >
              <option value="">Select Priority</option>
              <option value="Get Promoted">Get Promoted</option>
              <option value="Switch Career">Switch Career</option>
              <option value="Upskill Fast">Upskill Fast</option>
              <option value="Job Readiness">Job Readiness</option>
            </select>
          </div>

          <button 
            className="btn-primary" 
            type="submit" 
            disabled={loading}
            style={{ gridColumn: 'span 2', marginTop: '1rem', height: '3.5rem' }}
          >
            {loading ? 'Initializing Path...' : 'Launch My Career Roadmap'}
            {!loading && <Rocket size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}
