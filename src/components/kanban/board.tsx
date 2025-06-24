'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './column';
import { KanbanCard } from './card';
import type { Card, ColumnId, ColumnData, User } from '@/lib/types';
import { TranslationModal } from './translation-modal';
import { CardDetailsModal } from './card-details-modal';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cardService, userService, seedMockData } from '@/lib/firestore';

// Column order for display
const columnOrder: ColumnId[] = [
  'online_submitted',
  'translate_gujarati',
  'checking_gujarati',
  'print',
  'done',
];

// Column titles mapping for toast messages
const columnTitles: Record<ColumnId, string> = {
  online_submitted: 'Online Submitted',
  translate_gujarati: 'Translate Gujarati',
  checking_gujarati: 'Checking Gujarati',
  print: 'Print',
  done: 'Done',
};

export function KanbanBoard() {
  const [columns, setColumns] = useState<Record<ColumnId, ColumnData>>({} as any);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [cardForTranslation, setCardForTranslation] = useState<Card | null>(null);
  const [cardForDetails, setCardForDetails] = useState<Card | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // Very small distance to trigger drag
      },
    })
  );

  useEffect(() => {
    if (!user) {
      console.log('No user authenticated, skipping board setup');
      return;
    }

    // Seed mock data on first load
    seedMockData();

    let unsubscribeCards: (() => void) | undefined;
    let unsubscribeUsers: (() => void) | undefined;

    try {
      // Subscribe to real-time card updates
      unsubscribeCards = cardService.subscribeToCards((cards) => {
        const initialColumns: Record<ColumnId, ColumnData> = {
          online_submitted: { id: 'online_submitted', title: 'Online Submitted', cards: [] },
          translate_gujarati: { id: 'translate_gujarati', title: 'Translate Gujarati', cards: [] },
          checking_gujarati: { id: 'checking_gujarati', title: 'Checking Gujarati', cards: [] },
          print: { id: 'print', title: 'Print', cards: [] },
          done: { id: 'done', title: 'Done', cards: [] },
        };

        cards.forEach((card) => {
          if (initialColumns[card.column]) {
            initialColumns[card.column].cards.push(card);
          } else {
            console.warn('Unknown column for card:', card.column, card.id);
          }
        });
        
        setColumns(initialColumns);
      });

      // Subscribe to real-time user updates
      unsubscribeUsers = userService.subscribeToUsers((usersList) => {
        const usersMap = usersList.reduce((acc, user) => {
          acc[user.uid] = user;
          return acc;
        }, {} as Record<string, User>);
        setUsers(usersMap);
      });

      // Create or update the current user in Firestore
      userService.upsertUser(user);
      
    } catch (error) {
      console.error('Error setting up subscriptions:', error);
    }

    return () => {
      // Safely unsubscribe if functions exist
      if (typeof unsubscribeCards === 'function') {
        try {
          unsubscribeCards();
        } catch (error) {
          console.error('Error unsubscribing from cards:', error);
        }
      }
      
      if (typeof unsubscribeUsers === 'function') {
        try {
          unsubscribeUsers();
        } catch (error) {
          console.error('Error unsubscribing from users:', error);
        }
      }
    };
  }, [user]);

  // Test function to verify drag functionality
  const testDragFunctionality = () => {
    console.log('=== DRAG TEST ===');
    console.log('Columns:', Object.keys(columns));
    console.log('User role:', user?.role);
    console.log('Cards available:', Object.values(columns).flatMap(col => col.cards).length);
    console.log('Sensors configured:', sensors);
  };

  // Call test on mount
  useEffect(() => {
    if (user && Object.keys(columns).length > 0) {
      testDragFunctionality();
    }
  }, [user, columns]);

  const handleDragStart = (event: DragStartEvent) => {
    console.log('=== DRAG START ===');
    console.log('Active item:', event.active);
    console.log('Active ID:', event.active.id);
    
    const cardId = event.active.id as string;
    const card = Object.values(columns)
      .flatMap(col => col.cards)
      .find(c => c.id === cardId);
    
    console.log('Found card:', card);
    setActiveCard(card || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    console.log('=== DRAG END ===');
    console.log('Full event:', event);
    
    const { active, over } = event;
    
    console.log('Active:', active);
    console.log('Over:', over);
    
    if (!active || !over || !user) {
      console.log('Drag end cancelled - missing:', { 
        active: !!active, 
        over: !!over, 
        user: !!user 
      });
      setActiveCard(null);
      return;
    }

    const cardId = active.id as string;
    const overId = over.id as string;
    
    console.log('Dragging card:', cardId, 'Over:', overId);
    
    // Find the current card
    const currentCard = Object.values(columns)
      .flatMap(col => col.cards)
      .find(c => c.id === cardId);

    if (!currentCard) {
      console.warn('Card not found:', cardId);
      setActiveCard(null);
      return;
    }

    console.log('Current card:', currentCard);
    console.log('Available columns:', columnOrder);

    // Determine target column
    let targetColumnId: ColumnId;
    
    // Check if dropping directly on a column
    if (columnOrder.includes(overId as ColumnId)) {
      targetColumnId = overId as ColumnId;
      console.log('Dropping directly on column:', targetColumnId);
    } else {
      // If dropping on a card, find which column that card belongs to
      const targetCard = Object.values(columns)
        .flatMap(col => col.cards)
        .find(c => c.id === overId);
      
      if (targetCard) {
        targetColumnId = targetCard.column;
        console.log('Dropping on card, target column:', targetColumnId);
      } else {
        console.warn('Could not determine target column for:', overId);
        setActiveCard(null);
        return;
      }
    }

    console.log('Target column determined:', targetColumnId);

    // Check if the card is actually moving to a different column
    if (currentCard.column === targetColumnId) {
      console.log('Card already in target column, no move needed');
      setActiveCard(null);
      return;
    }

    // Enforce role permissions
    if (user.role === 'Viewer') {
      console.log('Permission denied - Viewer role');
      toast({ 
        variant: 'destructive', 
        title: 'Permission Denied', 
        description: 'Viewers are not allowed to move cards.' 
      });
      setActiveCard(null);
      return;
    }

    if (user.role === 'Editor' && currentCard.assigneeUid !== user.uid) {
      console.log('Permission denied - Editor can only move assigned cards');
      toast({ 
        variant: 'destructive', 
        title: 'Permission Denied', 
        description: 'You can only move cards assigned to you.' 
      });
      setActiveCard(null);
      return;
    }

    try {
      console.log(`Moving card "${currentCard.title}" from ${currentCard.column} to ${targetColumnId}`);
      
      // Update the card in Firestore
      await cardService.moveCard(cardId, targetColumnId, user.uid);
      
      toast({
        title: "Card Moved",
        description: `Card "${currentCard.title}" moved to ${columnTitles[targetColumnId]}.`
      });
    } catch (error) {
      console.error('Error moving card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to move card. Please try again.'
      });
    }

    setActiveCard(null);
  };

  const handleUpdateCard = async (updatedCard: Card) => {
    try {
      await cardService.updateCard(updatedCard.id, updatedCard);
      setCardForTranslation(null);
      setCardForDetails(null);
      toast({
        title: "Card Updated",
        description: "Card has been updated successfully."
      });
    } catch (error) {
      console.error('Error updating card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update card. Please try again.'
      });
    }
  };

  const handleCardClick = (card: Card) => {
    setCardForDetails(card);
  };

  const findCard = (id: string): Card | undefined => {
    return Object.values(columns)
      .flatMap(col => col.cards)
      .find(card => card.id === id);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 md:gap-6 h-full w-full">
          {columnOrder.map((columnId) => {
            const column = columns[columnId];
            if (!column) return null;
            
            return (
              <KanbanColumn
                key={columnId}
                column={column}
                users={users}
                openTranslationModal={setCardForTranslation}
                onCardClick={handleCardClick}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="rotate-3 opacity-90">
              <KanbanCard
                card={activeCard}
                user={users[activeCard.creatorUid]}
                assignee={activeCard.assigneeUid ? users[activeCard.assigneeUid] : undefined}
                isDragging={true}
                openTranslationModal={setCardForTranslation}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {cardForTranslation && (
        <TranslationModal
          card={cardForTranslation}
          onClose={() => setCardForTranslation(null)}
          onSave={handleUpdateCard}
        />
      )}

      {cardForDetails && (
        <CardDetailsModal
          card={cardForDetails}
          user={users[cardForDetails.creatorUid]}
          assignee={cardForDetails.assigneeUid ? users[cardForDetails.assigneeUid] : undefined}
          isOpen={!!cardForDetails}
          onClose={() => setCardForDetails(null)}
          onSave={handleUpdateCard}
        />
      )}
    </>
  );
}
