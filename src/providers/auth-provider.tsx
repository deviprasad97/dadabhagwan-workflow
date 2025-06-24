'use client';

import type { User } from '@/lib/types';
import { mockUsers } from '@/lib/mock-data';
import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { userService } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: () => void;
  logout: () => void;
  loading: boolean;
  firebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseConfigured, setFirebaseConfigured] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if Firebase is properly configured
    const isConfigured = !!(auth?.app && auth.app.options && auth.app.options.apiKey);
    setFirebaseConfigured(isConfigured);
    console.log('Firebase configured check:', isConfigured);
    console.log('Auth app:', auth?.app);
    console.log('Auth app options:', auth?.app?.options);

    if (!isConfigured) {
      console.warn('Firebase is not properly configured. Authentication will be disabled.');
      setLoading(false);
      return;
    }

    // This effect runs once on mount to set up the auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user');
      if (firebaseUser) {
        try {
          // First, try to get existing user from Firestore
          const existingUser = await userService.getUser(firebaseUser.uid);
          
          let role: 'Admin' | 'Editor' | 'Viewer' = 'Viewer';
          
          if (existingUser) {
            // User exists in Firestore, use their existing role
            role = existingUser.role;
            console.log('Using existing user role from Firestore:', role);
          } else {
            // New user, assign default role based on email
            console.log('New user, assigning default role...');
            
            // Check if user is in mock data
            const mockUser = mockUsers.find(
              (u) => u.email === firebaseUser.email
            );
            
            // List of admin emails for testing - add your email here
            const adminEmails = [
              'tripathy.devi7@gmail.com',
              'deviprasadt97@gmail.com',
              'admin@example.com'
            ];
            
            if (adminEmails.includes(firebaseUser.email || '')) {
              role = 'Admin';
            } else if (mockUser) {
              role = mockUser.role;
            }
            // else defaults to 'Viewer'
          }
          
          const appUser: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || existingUser?.name || 'Anonymous',
            email: firebaseUser.email || '',
            avatarUrl: firebaseUser.photoURL || existingUser?.avatarUrl || `https://placehold.co/40x40.png`,
            role: role,
          };
          console.log('Setting user:', appUser);
          
          // Create or update user in Firestore (but preserve existing role if user exists)
          if (!existingUser) {
            // Only create new user if they don't exist
            await userService.upsertUser(appUser);
            console.log('New user created in Firestore:', appUser.email);
          } else {
            // Update user info but keep existing role
            const updateData = {
              ...appUser,
              role: existingUser.role // Preserve existing role
            };
            await userService.upsertUser(updateData);
            console.log('Existing user updated in Firestore (role preserved):', appUser.email);
          }
          
          setUser(appUser);
        } catch (error) {
          console.error('Error handling user authentication:', error);
          // Fallback: create user with basic info
          const fallbackUser: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            avatarUrl: firebaseUser.photoURL || `https://placehold.co/40x40.png`,
            role: 'Viewer',
          };
          setUser(fallbackUser);
        }
      } else {
        // If no user is found, set the user to null.
        console.log('Setting user to null');
        setUser(null);
      }
      // The initial auth check is complete, so we can stop loading.
      setLoading(false);
    });

    // Cleanup the subscription when the component unmounts.
    return () => unsubscribe();
  }, [toast]);

  const login = async () => {
    if (!firebaseConfigured) {
      toast({
        variant: 'destructive',
        title: 'Configuration Error',
        description: 'Firebase is not properly configured. Please check your environment variables.',
      });
      return;
    }

    if (!auth?.app) return;
    
    try {
      console.log('Starting Google sign-in popup...');
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Sign-in successful:', result.user.email);
      
      toast({
        title: 'Sign-in Successful',
        description: `Welcome, ${result.user.displayName || result.user.email}!`,
      });
    } catch (error) {
      console.error('Error during sign-in popup:', error);
      setLoading(false);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('popup-closed-by-user')) {
          toast({
            title: 'Sign-in Cancelled',
            description: 'You closed the sign-in window. Please try again.',
          });
        } else if (error.message.includes('popup-blocked')) {
          toast({
            variant: 'destructive',
            title: 'Popup Blocked',
            description: 'Please allow popups for this site and try again.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Sign-in Error',
            description: `Failed to sign in: ${error.message}`,
          });
        }
      }
    }
  };

  const logout = async () => {
    if (!firebaseConfigured || !auth?.app) return;
    try {
      await signOut(auth);
      console.log('User logged out successfully');
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        variant: 'destructive',
        title: 'Logout Error',
        description: `Failed to log out: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, firebaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
