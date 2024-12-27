// AuthContext.js
import React, { createContext, useState, useContext } from 'react';

// Create a Context for the authentication data
const AuthContext = createContext();

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);

  const login = (userProfile) => {
    setProfile(userProfile);
  };

  const logout = () => {
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};