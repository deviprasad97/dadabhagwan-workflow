'use client';

import type { Card, User } from '@/lib/types';
import { Card as UICard, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Languages, Clock, Eye, UserPlus, UserMinus, MoreVertical, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { editLockService } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { cardService } from '@/lib/firestore';
import { toast } from '@/hooks/use-toast';

interface KanbanCardProps {
  card: Card;
  user?: User;
  assignee?: User;
  isDragging?: boolean;
  onTranslationClick?: () => void;
  openTranslationModal: (card: Card) => void;
  onCardClick?: (card: Card) => void;
}

export const KanbanCard = React.memo(function KanbanCard({ 
  card, 
  user, 
  assignee, 
  isDragging = false,
  onTranslationClick,
  openTranslationModal,
  onCardClick
}: KanbanCardProps) {
  const { user: currentUser } = useAuth();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [lockedByUser, setLockedByUser] = useState<User | null>(null);
  
  const isDraggable = useMemo(() => 
    currentUser?.role === 'Admin' || 
    (currentUser?.role === 'Editor' && (card.assigneeUid === currentUser.uid || !card.assigneeUid)),
    [currentUser?.role, currentUser?.uid, card.assigneeUid]
  );
  
  const canAssign = useMemo(() => 
    currentUser?.role === 'Admin' || currentUser?.role === 'Editor',
    [currentUser?.role]
  );

  // Check if card is locked by another user
  const lockInfo = useMemo(() => {
    if (!currentUser) return { isLocked: false };
    const result = editLockService.isCardLocked(card, currentUser.uid);
    
    // Debug logging
    if (result.isLocked) {
      console.log(`Card ${card.id} is locked by ${result.lockedBy}`, card.editingStatus);
    }
    
    return result;
  }, [card.editingStatus, currentUser]);

  // Fetch user info for who has the lock
  useEffect(() => {
    const fetchLockedByUser = async () => {
      if (lockInfo.isLocked && lockInfo.lockedBy) {
        // First try to find the user in availableUsers to avoid extra query
        const foundUser = availableUsers.find(u => u.uid === lockInfo.lockedBy);
        if (foundUser) {
          setLockedByUser(foundUser);
          return;
        }
        
        // If not found in available users, query Firestore
        try {
          const usersSnapshot = await getDocs(
            query(collection(firestore, 'users'), where('uid', '==', lockInfo.lockedBy))
          );
          if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data() as User;
            setLockedByUser({ ...userData, uid: lockInfo.lockedBy });
          }
        } catch (error) {
          console.error('Error fetching locked by user:', error);
          setLockedByUser(null);
        }
      } else {
        setLockedByUser(null);
      }
    };

    fetchLockedByUser();
  }, [lockInfo.isLocked, lockInfo.lockedBy, availableUsers]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: card.id,
    disabled: !isDraggable || lockInfo.isLocked, // Disable dragging if locked
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Fetch eligible users for assignment - memoized
  useEffect(() => {
    const fetchEligibleUsers = async () => {
      if (!canAssign) return;
      
      try {
        const usersQuery = query(
          collection(firestore, 'users'),
          where('role', 'in', ['Admin', 'Editor'])
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        
        setAvailableUsers(usersData);
      } catch (error) {
        console.error('Error fetching eligible users:', error);
      }
    };

    fetchEligibleUsers();
  }, [canAssign]);

  const handleTranslationClick = useCallback(() => {
    if (onTranslationClick) {
      onTranslationClick();
    } else {
      openTranslationModal(card);
    }
  }, [onTranslationClick, openTranslationModal, card]);

  const handleAssignUser = useCallback(async (userId: string | null) => {
    setLoadingAssignment(true);
    try {
      await cardService.updateCard(card.id, {
        assigneeUid: userId || undefined,
        updatedAt: new Date().toISOString()
      });

      const assigneeName = userId 
        ? availableUsers.find(u => u.uid === userId)?.name || 'Unknown User'
        : 'Unassigned';

      toast({
        title: "Assignment Updated",
        description: `Card "${card.title}" ${userId ? `assigned to ${assigneeName}` : 'unassigned'}.`
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update assignment. Please try again.'
      });
    } finally {
      setLoadingAssignment(false);
    }
  }, [card.id, card.title, availableUsers, toast]);
  
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Don't open modal if clicking on buttons or during drag operations
    if (
      e.target instanceof HTMLElement && 
      (e.target.closest('button') || e.target.closest('[role="button"]') || e.target.closest('[data-radix-collection-item]'))
    ) {
      return;
    }
    
    // Don't open modal if currently dragging
    if (sortableIsDragging) {
      return;
    }
    
    // Only trigger on left mouse button
    if (e.button === 0) {
      onCardClick?.(card);
    }
  }, [sortableIsDragging, onCardClick, card]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Mouse down handling if needed
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  }, []);

  return (
    <UICard
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={cn(
        "bg-card shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 group",
        isDraggable && !lockInfo.isLocked ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed',
        isDragging && 'opacity-50',
        sortableIsDragging && 'opacity-30',
        lockInfo.isLocked && 'bg-muted/50 border-red-300',
        !lockInfo.isLocked && (
          card.column === 'translate_gujarati' ? 'border-blue-400' : 
          card.column === 'checking_gujarati' ? 'border-purple-400' :
          card.column === 'print' ? 'border-orange-400' :
          card.column === 'done' ? 'border-green-400' :
          'border-gray-300'
        )
      )}
    >
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono">
                #{card.cardNumber}
              </Badge>
              {lockInfo.isLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        {lockedByUser ? `Editing: ${lockedByUser.name}` : 'Locked'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {lockedByUser 
                          ? `Currently being edited by ${lockedByUser.name}` 
                          : 'Currently being edited by another user'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <CardTitle className="text-base font-bold font-body">
              {card.metadata?.formData?.firstname && card.metadata?.formData?.lastname 
                ? `${card.metadata.formData.firstname} ${card.metadata.formData.lastname}`
                : card.title}
            </CardTitle>
          </div>
          {canAssign && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                  disabled={loadingAssignment}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignUser(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <UserMinus className="h-4 w-4" />
                  <span>Unassigned</span>
                  {!card.assigneeUid && <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableUsers.map((user) => (
                  <DropdownMenuItem 
                    key={user.uid}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignUser(user.uid);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={user.avatarUrl} alt={user.name} />
                      <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                    {card.assigneeUid === user.uid && <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {/* English Question */}
          {card.metadata?.formData?.english_question && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">English Question:</div>
              <p className="text-sm line-clamp-3">{card.metadata.formData.english_question}</p>
            </div>
          )}
          
          {/* Gujarati Translation */}
          {(card.metadata?.gujaratiTranslation || card.metadata?.approvedTranslation) && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Gujarati Translation:</div>
              <p className="text-sm line-clamp-3 text-blue-700">
                {card.metadata?.approvedTranslation || card.metadata?.gujaratiTranslation}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-4 pt-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {/* {card.column === 'translate_gujarati_stup' && (currentUser?.role === 'Admin' || currentUser?.role === 'Editor') && (
                   <Button variant="outline" size="sm" onClick={handleTranslationClick} className="h-8">
                      <Languages className="h-4 w-4 mr-2" /> Translate
                   </Button>
              )} */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick?.(card);
                }} 
                className="h-8 px-2"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              {assignee && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                        <AvatarFallback>{getInitials(assignee.name)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Assigned to {assignee.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {user && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Created by {user.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
        </div>
      </CardFooter>
    </UICard>
  );
});
