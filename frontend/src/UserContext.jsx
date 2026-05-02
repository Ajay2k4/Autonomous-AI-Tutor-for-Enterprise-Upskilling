import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { learnerApi } from './api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const data = await learnerApi.getProfile();
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile in context", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <UserContext.Provider value={{ profile, setProfile, refreshProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
