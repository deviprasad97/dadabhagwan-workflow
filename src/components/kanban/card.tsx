'use client';

import type { Card, User } from '@/lib/types';
import { Card as UICard, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Languages, Clock, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';

interface KanbanCardProps {
  card: Card;
  user?: User;
  assignee?: User;
  isDragging?: boolean;
  onTranslationClick?: () => void;
  openTranslationModal: (card: Card) => void;
  onCardClick?: (card: Card) => void;
}

export function KanbanCard({ 
  card, 
  user, 
  assignee, 
  isDragging = false,
  onTranslationClick,
  openTranslationModal,
  onCardClick
}: KanbanCardProps) {
  const { user: currentUser } = useAuth();
  const isDraggable = currentUser?.role === 'Admin' || 
    (currentUser?.role === 'Editor' && (card.assigneeUid === currentUser.uid || !card.assigneeUid));

  console.log(`Card ${card.id} - isDraggable: ${isDraggable}, userRole: ${currentUser?.role}, assignee: ${card.assigneeUid}`);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: card.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  console.log(`Card ${card.id} dragging state - isDragging: ${isDragging}, sortableIsDragging: ${sortableIsDragging}`);

  const handleTranslationClick = () => {
    if (onTranslationClick) {
      onTranslationClick();
    } else {
      openTranslationModal(card);
    }
  };
  
  const handleMouseUp = (e: React.MouseEvent) => {
    console.log(`Mouse up on card ${card.id}`, e);
    
    // Don't open modal if clicking on buttons or during drag operations
    if (
      e.target instanceof HTMLElement && 
      (e.target.closest('button') || e.target.closest('[role="button"]'))
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
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log(`Mouse down on card ${card.id}`, e);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-sm transition-all duration-200',
        isDragging && 'rotate-3 scale-105 cursor-grabbing shadow-lg',
        !isDraggable && 'opacity-60 cursor-default',
        isDraggable && 'hover:shadow-md cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium leading-none">
              {card.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="text-sm text-muted-foreground line-clamp-2">
        {card.metadata?.formData?.english_question || 'No question provided'}
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between mt-2">
        {/* Priority and Topic */}
        <div className="flex items-center gap-2">
          {card.metadata?.priority && (
            <Badge className={cn(
              'text-xs',
              card.metadata.priority === 'Urgent' && 'bg-red-500 text-white',
              card.metadata.priority === 'High' && 'bg-orange-500 text-white',
              card.metadata.priority === 'Medium' && 'bg-yellow-500 text-white',
              card.metadata.priority === 'Low' && 'bg-green-500 text-white'
            )}>
              {card.metadata.priority}
            </Badge>
          )}
          {card.metadata?.topic && (
            <Badge variant="outline" className="text-xs">
              {card.metadata.topic}
            </Badge>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2">
          {assignee ? (
            <div className="flex items-center gap-1" title={`Assigned to ${assignee.name}`}>
              <Avatar className="h-6 w-6">
                <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                <AvatarFallback>{getInitials(assignee.name)}</AvatarFallback>
              </Avatar>
              <Badge variant="secondary" className="text-xs">
                {assignee.role}
              </Badge>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">Unassigned</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
