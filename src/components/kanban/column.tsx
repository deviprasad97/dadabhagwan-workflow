'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Card, ColumnData, ColumnId, User } from '@/lib/types';
import { KanbanCard } from './card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface KanbanColumnProps {
  column: ColumnData;
  users: Record<string, User>;
  openTranslationModal: (card: Card) => void;
  onCardClick?: (card: Card) => void;
}

export function KanbanColumn({ column, users, openTranslationModal, onCardClick }: KanbanColumnProps) {
  const { user } = useAuth();
  const canDrop = user?.role !== 'Viewer';

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: !canDrop,
  });

  console.log(`Column ${column.id} - isOver: ${isOver}, canDrop: ${canDrop}`);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 md:w-80 flex-shrink-0 h-full rounded-lg transition-all duration-200 border-2 p-1',
        isOver && canDrop ? 'bg-primary/20 border-primary border-dashed scale-[1.02]' : 'bg-secondary/50 border-border',
        canDrop ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
      )}
    >
      <div className="p-3 border-b-2 border-accent/50 bg-background/80 rounded-t-lg">
        <h2 className="text-lg font-headline font-semibold text-accent-foreground flex items-center justify-between">
          <span>{column.title}</span>
          <span className="text-sm font-body font-medium bg-accent/20 text-accent-foreground rounded-full px-2.5 py-0.5">
            {column.cards.length}
          </span>
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-3 min-h-[300px] relative">
        {/* Drop zone indicator */}
        {isOver && canDrop && (
          <div className="absolute inset-2 border-2 border-dashed border-primary bg-primary/10 rounded-lg flex items-center justify-center z-10 pointer-events-none">
            <span className="text-primary font-medium">Drop here</span>
          </div>
        )}
        
        <SortableContext items={column.cards.map(card => card.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => {
            const creator = users[card.creatorUid];
            const assignee = card.assigneeUid ? users[card.assigneeUid] : undefined;
            
            return (
              <KanbanCard
                key={card.id}
                card={card}
                user={creator}
                assignee={assignee}
                openTranslationModal={openTranslationModal}
                onCardClick={onCardClick}
              />
            );
          })}
        </SortableContext>
        
        {/* Empty state */}
        {column.cards.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg bg-muted/20">
            {canDrop ? 'Drop cards here' : 'No cards'}
          </div>
        )}
      </div>
    </div>
  );
}
