'use client';

import type { Card, User } from '@/lib/types';
import { Card as UICard, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Languages, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KanbanCardProps {
  card: Card;
  user?: User;
  assignee?: User;
  isDragging?: boolean;
  onTranslationClick?: () => void;
  openTranslationModal: (card: Card) => void;
}

export function KanbanCard({ 
  card, 
  user, 
  assignee, 
  isDragging = false,
  onTranslationClick,
  openTranslationModal 
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
  
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log(`Mouse down on card ${card.id}`, e);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    console.log(`Mouse up on card ${card.id}`, e);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <UICard
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={cn(
        "bg-card shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4",
        isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed',
        isDragging && 'opacity-50',
        sortableIsDragging && 'opacity-30',
        card.column === 'translate_gujarati' ? 'border-blue-400' : 
        card.column === 'checking_gujarati' ? 'border-purple-400' :
        card.column === 'print' ? 'border-orange-400' :
        card.column === 'done' ? 'border-green-400' :
        'border-gray-300'
      )}
    >
      <CardHeader className="p-4">
        <CardTitle className="text-base font-bold font-body">{card.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">{card.content}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-4 pt-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}</span>
        </div>
        <div className="flex items-center gap-2">
            {card.column === 'translate_gujarati' && (currentUser?.role === 'Admin' || currentUser?.role === 'Editor') && (
                 <Button variant="outline" size="sm" onClick={handleTranslationClick} className="h-8">
                    <Languages className="h-4 w-4 mr-2" /> Translate
                 </Button>
            )}
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
}
