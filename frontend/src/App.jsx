import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './UserContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Roadmap from './pages/Roadmap';
import Courses from './pages/Courses';
import Tutor from './pages/Tutor';
import UserProfile from './pages/UserProfile';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/roadmap" 
            element={
              <ProtectedRoute>
                <Roadmap />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/courses" 
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tutor" 
            element={
              <ProtectedRoute>
                <Tutor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/skill-gap" 
            element={
              <ProtectedRoute>
                <div className="auth-container">
                  <div className="glass-card">
                    <h2 className="text-xl font-black text-slate-900 mb-2 text-center">Skill Gap Analysis</h2>
                    <p className="text-slate-500 font-medium text-center">Deep dive analysis of your current vs. target role is coming soon.</p>
                  </div>
                </div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } 
          />
          
          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;
