'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { BoardSelector } from './board-selector';
import { CustomFieldsManager } from './custom-fields-manager';
import { ColumnManager } from './column-manager';
import { LiveView } from './live-view';
import { BoardTranslationSettings } from '../forms/board-translation-settings';
import type { Card, ColumnId, ColumnData, User, Board, ColumnDefinition } from '@/lib/types';
import { TranslationModal } from './translation-modal';
import { CardDetailsModal } from './card-details-modal';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cardService, userService, boardService, seedMockData } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Filter, 
  Users, 
  X, 
  UserMinus, 
  Plus, 
  ChevronDown, 
  ArrowUpDown, 
  MoreHorizontal,
  SortAsc,
  SortDesc,
  Calendar,
  Tag,
  Star,
  LayoutGrid,
  List
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Default columns for fallback
const defaultColumnDefinitions: ColumnDefinition[] = [
  {
    id: 'live',
    title: 'Live',
    description: 'Questions that are currently live and being discussed',
    color: '#ef4444',
    order: 0,
    isDefault: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'online_submitted',
    title: 'Online Submitted',
    description: 'Questions submitted through online forms',
    color: '#06b6d4',
    order: 1,
    isDefault: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'translate_gujarati',
    title: 'Translate Gujarati',
    description: 'Questions being translated to Gujarati',
    color: '#eab308',
    order: 2,
    isDefault: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'checking_gujarati',
    title: 'Checking Gujarati',
    description: 'Gujarati translations being reviewed',
    color: '#f97316',
    order: 3,
    isDefault: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'print',
    title: 'Print',
    description: 'Questions ready for printing',
    color: '#8b5cf6',
    order: 4,
    isDefault: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
  {
    id: 'done',
    title: 'Done',
    description: 'Completed questions',
    color: '#22c55e',
    order: 5,
    isDefault: true,
    createdAt: new Date().toISOString(),
    createdBy: 'system',
  },
];

// Filter types
type FilterType = 'assignee' | 'priority' | 'column' | 'dateRange' | 'topic';

interface ActiveFilter {
  id: string;
  type: FilterType;
  label: string;
  value: any;
}

// Sort options
type SortOption = 'created' | 'updated' | 'cardNumber' | 'title';
type SortDirection = 'asc' | 'desc';

interface KanbanBoardProps {
  selectedBoardId?: string | null;
}

export function KanbanBoard({ selectedBoardId }: KanbanBoardProps) {
  // All useState hooks first
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<Record<string, ColumnData>>({} as any);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [cardForTranslation, setCardForTranslation] = useState<Card | null>(null);
  const [cardForDetails, setCardForDetails] = useState<Card | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<'kanban' | 'live'>('kanban'); // Default to Live view
  
  // Then custom hooks
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // DnD sensors - moved outside useMemo to avoid hook violations
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    })
  );

  // Helper functions
  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }, []);

  const findCard = useCallback((id: string): Card | undefined => {
    return allCards.find(card => card.id === id);
  }, [allCards]);

  // Filter and sort processing - useMemo
  const processedCards = useMemo(() => {
    let filteredCards = [...allCards];

    // Apply active filters
    activeFilters.forEach(filter => {
      switch (filter.type) {
        case 'assignee':
          if (filter.value === 'unassigned') {
            filteredCards = filteredCards.filter(card => !card.assigneeUid);
          } else if (filter.value !== 'all') {
            filteredCards = filteredCards.filter(card => card.assigneeUid === filter.value);
          }
          break;
        case 'priority':
          filteredCards = filteredCards.filter(card => card.metadata?.priority === filter.value);
          break;
        case 'column':
          filteredCards = filteredCards.filter(card => card.column === filter.value);
          break;
        case 'topic':
          filteredCards = filteredCards.filter(card => card.metadata?.topic === filter.value);
          break;
      }
    });

    // Apply sorting
    filteredCards.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updated':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'cardNumber':
          aValue = a.cardNumber;
          bValue = b.cardNumber;
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredCards;
  }, [allCards, activeFilters, sortBy, sortDirection]);

  // Filter statistics - useMemo
  const filterStats = useMemo(() => {
    const total = allCards.length;
    const filtered = processedCards.length;
    return { total, filtered };
  }, [allCards.length, processedCards.length]);

  // Get unique users who have cards assigned to them - useMemo
  const assignedUsers = useMemo(() => {
    const assignedUserIds = new Set(allCards.map(card => card.assigneeUid).filter(Boolean) as string[]);
    return Array.from(assignedUserIds)
      .map(uid => users[uid])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allCards, users]);

  // Get unique priorities - useMemo
  const uniquePriorities = useMemo(() => {
    const priorities = new Set(allCards.map(card => card.metadata?.priority).filter(Boolean));
    return Array.from(priorities);
  }, [allCards]);

  // Get unique topics - useMemo
  const uniqueTopics = useMemo(() => {
    const topics = new Set(allCards.map(card => card.metadata?.topic).filter(Boolean));
    return Array.from(topics);
  }, [allCards]);

  // Get active column definitions - useMemo
  const activeColumnDefinitions = useMemo(() => {
    if (!currentBoard?.columnDefinitions || currentBoard.columnDefinitions.length === 0) {
      return defaultColumnDefinitions;
    }
    return [...currentBoard.columnDefinitions].sort((a, b) => a.order - b.order);
  }, [currentBoard?.columnDefinitions]);

  // Column order and titles based on definitions - useMemo
  const { columnOrder, columnTitles } = useMemo(() => {
    const order = activeColumnDefinitions.map(def => def.id as ColumnId);
    const titles = activeColumnDefinitions.reduce((acc, def) => {
      acc[def.id as ColumnId] = def.title;
      return acc;
    }, {} as Record<ColumnId, string>);
    return { columnOrder: order, columnTitles: titles };
  }, [activeColumnDefinitions]);

  // useCallback hooks
  const handleCardClick = useCallback((card: Card) => {
    setCardForDetails(card);
  }, []);

  const addFilter = useCallback((type: FilterType, value: any, label: string) => {
    const newFilter: ActiveFilter = {
      id: `${type}-${Date.now()}`,
      type,
      value,
      label
    };
    setActiveFilters(prev => [...prev, newFilter]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setActiveFilters(prev => prev.filter(f => f.id !== filterId));
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  const toggleFilterExpansion = useCallback(() => {
    setIsFilterExpanded(prev => !prev);
  }, []);

  const handleBoardChange = useCallback((board: Board) => {
    // Clear filters when changing boards
    setActiveFilters([]);
    setIsFilterExpanded(false);
    
    // Use Next.js router for smooth navigation
    router.push(`/?board=${board.id}`);
  }, [router]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const card = findCard(cardId);
    
    if (card) {
      setActiveCard(card);
    }
  }, [findCard]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const cardId = active.id as string;
    const overId = over?.id;

    if (!overId) {
      setActiveCard(null);
      return;
    }

    const currentCard = findCard(cardId);
    if (!currentCard) {
      setActiveCard(null);
      return;
    }

    // Determine target column
    let targetColumnId: ColumnId;
    
    if (columnOrder.includes(overId as string)) {
      targetColumnId = overId as string;
    } else {
      const targetCard = Object.values(columns)
        .flatMap(col => col.cards)
        .find(c => c.id === overId);
      
      if (targetCard) {
        targetColumnId = targetCard.column;
      } else {
        setActiveCard(null);
        return;
      }
    }

    if (currentCard.column === targetColumnId) {
      setActiveCard(null);
      return;
    }
    
    // Enforce role permissions
    if (!user) {
      toast({ 
        variant: 'destructive', 
        title: 'Permission Denied', 
        description: 'You must be logged in to move cards.' 
      });
      setActiveCard(null);
      return;
    }

    if (user.role === 'Viewer') {
      toast({ 
        variant: 'destructive', 
        title: 'Permission Denied', 
        description: 'Viewers are not allowed to move cards.' 
      });
      setActiveCard(null);
      return;
    }

    if (user.role === 'Editor' && currentCard.assigneeUid !== user.uid) {
      toast({ 
        variant: 'destructive', 
        title: 'Permission Denied', 
        description: 'You can only move cards assigned to you.' 
      });
      setActiveCard(null);
      return;
    }
    
    try {
      await cardService.moveCard(cardId, targetColumnId, user.uid);
      
      toast({
        title: "Card Moved",
        description: `Card "${currentCard.title}" moved to ${columnTitles[targetColumnId]}.`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to move card. Please try again.'
      });
    }

    setActiveCard(null);
  }, [findCard, columns, user, toast, columnOrder, columnTitles]);

  const handleUpdateCard = useCallback(async (updatedCard: Card) => {
    try {
      await cardService.updateCard(updatedCard.id, updatedCard);
      setCardForTranslation(null);
      setCardForDetails(null);
      toast({
        title: "Card Updated",
        description: "Card has been updated successfully."
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update card. Please try again.'
      });
    }
  }, [toast]);

  const handleUpdateBoard = useCallback(async (updatedBoard: Board) => {
    try {
      console.log('Attempting to update board:', updatedBoard.id, updatedBoard);
      await boardService.updateBoard(updatedBoard.id, updatedBoard);
      toast({
        title: "Board Updated",
        description: "Board settings have been updated successfully."
      });
    } catch (error) {
      console.error('Error updating board:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update board: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      });
    }
  }, [toast]);

  // Memoize the columns rendering
  const renderedColumns = useMemo(() => {
    return columnOrder.map((columnId) => {
      const column = columns[columnId];
      if (!column) return null;
      
      const columnDef = activeColumnDefinitions.find(def => def.id === columnId);
      
      return (
        <KanbanColumn
          key={columnId}
          column={{
            ...column,
            title: columnDef?.title || column.title,
            color: columnDef?.color,
            maxCards: columnDef?.maxCards,
          }}
          users={users}
          openTranslationModal={setCardForTranslation}
          onCardClick={handleCardClick}
        />
      );
    });
  }, [columns, users, handleCardClick, columnOrder, activeColumnDefinitions]);

  // Update columns when filtered cards change
  useEffect(() => {
    // Create initial columns structure based on active column definitions
    const initialColumns: Record<string, ColumnData> = {};
    
    activeColumnDefinitions.forEach((columnDef) => {
      initialColumns[columnDef.id] = {
        id: columnDef.id,
        title: columnDef.title,
        cards: [],
        color: columnDef.color,
        maxCards: columnDef.maxCards,
      };
    });

    // Distribute cards into columns
    processedCards.forEach((card) => {
      if (initialColumns[card.column]) {
        initialColumns[card.column].cards.push(card);
      }
    });
    
    setColumns(initialColumns);
  }, [processedCards, activeColumnDefinitions]);

  // Initialize default board and seed data
  useEffect(() => {
    const initializeBoards = async () => {
      try {
        await boardService.ensureDefaultBoard();
        await seedMockData();
        
        if (selectedBoardId && user) {
          const board = await boardService.getBoard(selectedBoardId);
          if (board) {
            const hasAccess = await boardService.hasAccess(selectedBoardId, user.uid, user.role);
            if (hasAccess) {
              setCurrentBoard(board);
            } else {
    toast({
                variant: 'destructive',
                title: 'Access Denied',
                description: 'You do not have access to this board.'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error initializing boards:', error);
      }
    };

    initializeBoards();
  }, [selectedBoardId, user, toast]);

  // Subscribe to board, cards and users
  useEffect(() => {
    if (!user || !selectedBoardId) {
      return;
    }

    let unsubscribeBoard: (() => void) | undefined;
    let unsubscribeCards: (() => void) | undefined;
    let unsubscribeUsers: (() => void) | undefined;

    try {
      // Subscribe to board for real-time updates
      unsubscribeBoard = boardService.subscribeToBoard(selectedBoardId, (board) => {
        if (board) {
          console.log('Board updated via subscription:', board);
          setCurrentBoard(board);
        } else {
          console.log('Board not found or deleted');
          setCurrentBoard(null);
        }
      });

      // Subscribe to cards
      unsubscribeCards = cardService.subscribeToCards(selectedBoardId, (cards) => {
        setAllCards(cards);
      });

      unsubscribeUsers = userService.subscribeToUsers((usersList) => {
        const usersMap = usersList.reduce((acc, user) => {
          acc[user.uid] = user;
          return acc;
        }, {} as Record<string, User>);
        setUsers(usersMap);
      });

      userService.upsertUser(user);
      
    } catch (error) {
      console.error('Error setting up subscriptions:', error);
    }

    return () => {
      if (typeof unsubscribeBoard === 'function') {
        try {
          unsubscribeBoard();
        } catch (error) {
          console.error('Error unsubscribing from board:', error);
        }
      }
      
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
  }, [user, selectedBoardId]);

  return (
    <div className="flex flex-col h-full">
      {/* Board Selector and Toolbar */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <BoardSelector
            currentBoard={currentBoard}
            onBoardChange={handleBoardChange}
          />
          
          {/* Toolbar - Right Side */}
          {currentBoard && (
            <div className="flex items-center gap-2">

              {/* Results Counter */}
              <Badge variant="outline" className="text-sm">
                {filterStats.filtered} of {filterStats.total} cards
              </Badge>

              {/* View Switcher */}
              <div className="flex items-center rounded-md border">
                <Button
                  variant={viewMode === 'live' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('live')}
                  className="rounded-r-none border-r"
                >
                  <List className="h-4 w-4 mr-1" />
                  Live
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="rounded-l-none"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Kanban
                </Button>
              </div>

              {/* Custom Fields Manager */}
              <CustomFieldsManager
                board={currentBoard}
                onUpdateBoard={handleUpdateBoard}
              />

              {/* Column Manager */}
              <ColumnManager
                board={currentBoard}
                onUpdateBoard={handleUpdateBoard}
              />

              {/* Translation Settings */}
              <BoardTranslationSettings
                board={currentBoard}
                onUpdateBoard={handleUpdateBoard}
              />

              {/* Filter Button */}
              <Button
                variant={activeFilters.length > 0 || isFilterExpanded ? "default" : "outline"}
                size="sm"
                onClick={toggleFilterExpansion}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilters.length}
                  </Badge>
                )}
                <ChevronDown className={`h-3 w-3 transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
              </Button>

              {/* Sort Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                    {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {[
                    { value: 'created', label: 'Created Date', icon: Calendar },
                    { value: 'updated', label: 'Updated Date', icon: Calendar },
                    { value: 'cardNumber', label: 'Card Number', icon: Tag },
                    { value: 'title', label: 'Title', icon: Tag },
                  ].map(({ value, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => {
                        if (sortBy === value) {
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy(value as SortOption);
                          setSortDirection('desc');
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {sortBy === value && (
                        <div className="ml-auto">
                          {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                        </div>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>View Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    Export Board (Coming Soon)
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    Print View (Coming Soon)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Expanded Filter Panel */}
        {currentBoard && isFilterExpanded && (
          <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Filters</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <Badge
                      key={filter.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {filter.label}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 w-4 h-4"
                        onClick={() => removeFilter(filter.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Add Filter */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Add Filter</span>
              <div className="flex flex-wrap gap-2">
                {/* Assignee Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Plus className="h-3 w-3" />
                      <Users className="h-3 w-3" />
                      Assignee
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium">Filter by Assignee</h4>
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            addFilter('assignee', 'unassigned', 'Unassigned');
                          }}
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Unassigned
                        </Button>
                        {assignedUsers.map((user) => (
                          <Button
                            key={user.uid}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              addFilter('assignee', user.uid, user.name);
                            }}
                          >
                            <Avatar className="h-4 w-4 mr-2">
                              <AvatarImage src={user.avatarUrl} alt={user.name} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            {user.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Priority Filter */}
                {uniquePriorities.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        <Star className="h-3 w-3" />
                        Priority
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48" align="start">
                      <div className="space-y-2">
                        <h4 className="font-medium">Filter by Priority</h4>
                        <div className="space-y-1">
                          {uniquePriorities.map((priority) => (
                            <Button
                              key={priority}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                addFilter('priority', priority, `Priority: ${priority}`);
                              }}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              {priority}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {/* Column Filter */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Plus className="h-3 w-3" />
                      <Tag className="h-3 w-3" />
                      Column
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium">Filter by Column</h4>
                      <div className="space-y-1">
                        {columnOrder.map((columnId) => (
                          <Button
              key={columnId}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => {
                              addFilter('column', columnId, `Column: ${columnTitles[columnId]}`);
                            }}
                          >
                            <Tag className="h-4 w-4 mr-2" />
                            {columnTitles[columnId]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Topic Filter */}
                {uniqueTopics.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        <Tag className="h-3 w-3" />
                        Topic
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48" align="start">
                      <div className="space-y-2">
                        <h4 className="font-medium">Filter by Topic</h4>
                        <div className="space-y-1">
                          {uniqueTopics.map((topic) => (
                            <Button
                              key={topic}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                addFilter('topic', topic, `Topic: ${topic}`);
                              }}
                            >
                              <Tag className="h-4 w-4 mr-2" />
                              {topic}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {currentBoard ? (
        viewMode === 'live' ? (
          // Live View
          <LiveView 
            cards={processedCards} 
            onCardClick={handleCardClick}
          />
        ) : (
          // Kanban View
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
              onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 md:gap-6 h-full w-full">
              {renderedColumns}
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
        )
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-lg font-medium text-muted-foreground mb-2">
              No board selected
            </div>
            <div className="text-sm text-muted-foreground">
              Please select a board from the dropdown above to view cards.
            </div>
          </div>
      </div>
      )}

      {/* Modals */}
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
          board={currentBoard || undefined}
          isOpen={!!cardForDetails}
          onClose={() => setCardForDetails(null)}
          onSave={handleUpdateCard}
        />
      )}
    </div>
  );
}
