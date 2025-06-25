'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { editLockService, userService } from '@/lib/firestore';
import { useAuth } from './use-auth';
import type { Card, User } from '@/lib/types';

interface EditLockState {
  isLocked: boolean;
  lockedBy?: string;
  lockedByUser?: User | null;
  isAcquiring: boolean;
  isReleasing: boolean;
}

export function useEditLock(card: Card, boardId: string) {
  const { user } = useAuth();
  const [lockState, setLockState] = useState<EditLockState>({
    isLocked: false,
    isAcquiring: false,
    isReleasing: false,
  });
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isEditingRef = useRef(false);

  // Check lock status and get user info
  const updateLockState = useCallback(async () => {
    if (!user) return;

    const lockInfo = editLockService.isCardLocked(card, user.uid);
    
    if (lockInfo.isLocked && lockInfo.lockedBy) {
      // Get user info for the person who has the lock
      try {
        const lockedByUser = await userService.getUser(lockInfo.lockedBy);
        setLockState(prev => ({
          ...prev,
          isLocked: true,
          lockedBy: lockInfo.lockedBy,
          lockedByUser,
        }));
      } catch (error) {
        console.error('Error fetching locked user info:', error);
        setLockState(prev => ({
          ...prev,
          isLocked: true,
          lockedBy: lockInfo.lockedBy,
          lockedByUser: undefined,
        }));
      }
    } else {
      setLockState(prev => ({
        ...prev,
        isLocked: false,
        lockedBy: undefined,
        lockedByUser: undefined,
      }));
    }
  }, [card, user]);

  // Acquire edit lock
  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!user || !boardId) return false;

    setLockState(prev => ({ ...prev, isAcquiring: true }));

    try {
      const success = await editLockService.acquireEditLock(card.id, user.uid, boardId);
      
      if (success) {
        isEditingRef.current = true;
        
        // Start refresh interval to keep lock alive
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        
        refreshIntervalRef.current = setInterval(async () => {
          if (isEditingRef.current) {
            const refreshed = await editLockService.refreshEditLock(card.id, user.uid, boardId);
            if (!refreshed) {
              // Failed to refresh, release the lock
              await releaseLock();
            }
          }
        }, 5 * 60 * 1000); // Refresh every 5 minutes (lock expires after 10 minutes)
        
        // Update lock state immediately after acquiring
        setLockState(prev => ({
          ...prev,
          isLocked: false, // Current user acquired the lock, so it's not locked for them
          lockedBy: user.uid,
          lockedByUser: user,
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Error acquiring edit lock:', error);
      return false;
    } finally {
      setLockState(prev => ({ ...prev, isAcquiring: false }));
    }
  }, [card.id, user, boardId]);

  // Release edit lock
  const releaseLock = useCallback(async (): Promise<void> => {
    if (!user || !boardId) return;

    setLockState(prev => ({ ...prev, isReleasing: true }));
    isEditingRef.current = false;

    // Clear refresh interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    try {
      await editLockService.releaseEditLock(card.id, user.uid, boardId);
      
      // Update lock state immediately after releasing
      setLockState(prev => ({
        ...prev,
        isLocked: false,
        lockedBy: undefined,
        lockedByUser: undefined,
      }));
    } catch (error) {
      console.error('Error releasing edit lock:', error);
    } finally {
      setLockState(prev => ({ ...prev, isReleasing: false }));
    }
  }, [card.id, user, boardId]);

  // Check if current user can edit (not locked by someone else)
  const canEdit = useCallback((): boolean => {
    if (!user) return false;
    
    const lockInfo = editLockService.isCardLocked(card, user.uid);
    return !lockInfo.isLocked;
  }, [card, user]);

  // Check if current user is the one editing
  const isCurrentUserEditing = useCallback((): boolean => {
    if (!user) return false;
    
    return card.editingStatus?.isLocked === true && 
           card.editingStatus?.lockedBy === user.uid;
  }, [card, user]);

  // Update lock state when card editing status changes (real-time updates)
  useEffect(() => {
    updateLockState();
  }, [card.editingStatus, updateLockState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Release lock if user was editing
      if (isEditingRef.current && user && boardId) {
        editLockService.releaseEditLock(card.id, user.uid, boardId);
      }
    };
  }, [card.id, user, boardId]);

  return {
    ...lockState,
    acquireLock,
    releaseLock,
    canEdit,
    isCurrentUserEditing,
    updateLockState,
  };
} 