import { useContext } from 'react';
import { AuthContext, type AuthContextState } from '../contexts/AuthContext';

/**
 * Custom hook to access auth context
 * 
 * @throws {Error} If used outside of AuthProvider
 */
export const useAuth = (): AuthContextState => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
