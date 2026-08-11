import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfileData } from '../types';
import { profileService } from '../services/profileService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfileData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (email: string, password: string, name: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: { display_name?: string; username?: string; bio?: string; avatar_url?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to load user profile
  const fetchAndSetProfile = async (userId: string, userMeta?: any) => {
    try {
      let prof = await profileService.getProfile(userId);
      if (!prof && userMeta) {
        // Retry shortly in case trigger is executing
        await new Promise((res) => setTimeout(res, 500));
        prof = await profileService.getProfile(userId);
      }
      setProfile(prof);
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (isSupabaseConfigured()) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (mounted) {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
              await fetchAndSetProfile(currentSession.user.id, currentSession.user.user_metadata);
            }
          }
        } catch (err) {
          console.warn('Auth session check error:', err);
        } finally {
          if (mounted) setIsLoading(false);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            await fetchAndSetProfile(newSession.user.id, newSession.user.user_metadata);
          } else {
            setProfile(null);
          }
          setIsLoading(false);
        });

        return () => {
          authListener?.subscription.unsubscribe();
        };
      } else {
        setIsLoading(false);
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Sign Up Function
  const signUp = async (email: string, password: string, name: string, username: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    if (!cleanName) {
      throw new Error('Name is required.');
    }
    if (!cleanUsername) {
      throw new Error('Username is required.');
    }

    // Check if username is taken in public profiles
    const isTaken = await profileService.isUsernameTaken(cleanUsername);
    if (isTaken) {
      throw new Error('This username is already taken.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanName,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        throw new Error('An account with this email already exists.');
      }
      throw new Error(error.message || 'Could not complete registration. Please try again.');
    }

    if (data.user) {
      setUser(data.user);
      setSession(data.session);

      // Give database trigger 500ms to insert profile row
      await new Promise((res) => setTimeout(res, 500));
      await fetchAndSetProfile(data.user.id, data.user.user_metadata);
    }
  };

  // Sign In Function
  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Incorrect email or password.');
      }
      throw new Error(error.message || 'No account exists with these credentials.');
    }

    if (data.user) {
      setUser(data.user);
      setSession(data.session);
      await fetchAndSetProfile(data.user.id, data.user.user_metadata);
    }
  };

  // Sign Out Function
  const signOut = async () => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Signout error:', err);
      }
    }

    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Password Reset
  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send password reset email.');
      }
    }
  };

  // Update Profile
  const updateProfile = async (updates: { display_name?: string; username?: string; bio?: string; avatar_url?: string }) => {
    if (!user) throw new Error('You must be logged in to update your profile.');

    const updated = await profileService.updateProfile(user.id, updates);
    setProfile(updated);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchAndSetProfile(user.id, user.user_metadata);
    }
  };

  const value = {
    user,
    session,
    profile,
    isAuthenticated: Boolean(user),
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
