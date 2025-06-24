'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Search,
  Plus,
  Calendar,
  MapPin,
  Users,
  Crown,
  Edit3,
  Eye,
  Tag,
  Clock,
  Star
} from 'lucide-react';
import { boardService, userService } from '@/lib/firestore';
import type { Board, User } from '@/lib/types';

export default function BoardsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [filteredBoards, setFilteredBoards] = useState<Board[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: '',
    category: '',
    location: '',
    eventDate: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Archived',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    tags: [] as string[],
    color: '#3B82F6'
  });

  // Fetch boards and users
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoadingBoards(true);
        const [userBoards, allUsers] = await Promise.all([
          boardService.getUserBoards(user.uid, user.role),
          userService.getAllUsers()
        ]);
        setBoards(userBoards);
        setUsers(allUsers);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load boards'
        });
      } finally {
        setLoadingBoards(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter boards based on search and filters
  useEffect(() => {
    let filtered = boards;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(board => 
        board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        board.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        board.settings?.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        board.settings?.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(board => board.settings?.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(board => board.settings?.category === categoryFilter);
    }

    setFilteredBoards(filtered);
  }, [boards, searchQuery, statusFilter, categoryFilter]);

  const handleCreateBoard = async () => {
    if (!user || !createFormData.name.trim()) return;

    try {
      const boardId = await boardService.createBoard({
        name: createFormData.name.trim(),
        description: createFormData.description.trim(),
        creatorUid: user.uid,
        sharedWith: [],
        settings: {
          category: createFormData.category.trim(),
          location: createFormData.location.trim(),
          eventDate: createFormData.eventDate,
          status: createFormData.status,
          priority: createFormData.priority,
          tags: createFormData.tags,
          color: createFormData.color,
          allowEditorSharing: true
        }
      });

      // Fetch the newly created board
      const newBoard = await boardService.getBoard(boardId);
      if (newBoard) {
        setBoards(prev => [newBoard, ...prev]);
      }

      // Reset form
      setCreateFormData({
        name: '',
        description: '',
        category: '',
        location: '',
        eventDate: '',
        status: 'Active',
        priority: 'Medium',
        tags: [],
        color: '#3B82F6'
      });
      setShowCreateBoard(false);
      
      toast({
        title: 'Board Created',
        description: `Board "${createFormData.name}" has been created successfully.`
      });
    } catch (error) {
      console.error('Error creating board:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create board'
      });
    }
  };

  const handleBoardClick = (board: Board) => {
    router.push(`/?board=${board.id}`);
  };

  const getBoardCreator = (creatorUid: string) => {
    return users.find(u => u.uid === creatorUid);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-yellow-100 text-yellow-800';
      case 'Archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Urgent': return 'bg-red-200 text-red-900';
      case 'Medium': return 'bg-orange-100 text-orange-800';
      case 'Low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin': return <Crown className="h-3 w-3" />;
      case 'Editor': return <Edit3 className="h-3 w-3" />;
      case 'Viewer': return <Eye className="h-3 w-3" />;
      default: return null;
    }
  };

  const uniqueCategories = Array.from(new Set(boards.map(b => b.settings?.category).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(boards.map(b => b.settings?.status).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Please sign in to access boards.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Event Boards</h1>
              <p className="text-muted-foreground">
                Manage different events and question workflows
              </p>
            </div>
            <Dialog open={showCreateBoard} onOpenChange={setShowCreateBoard}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Board
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Board</DialogTitle>
                  <DialogDescription>
                    Create a new board for an event or question category.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="board-name">Board Name *</Label>
                    <Input
                      id="board-name"
                      value={createFormData.name}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Satsang Mumbai 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="board-description">Description</Label>
                    <Textarea
                      id="board-description"
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the event"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="board-category">Category</Label>
                      <Input
                        id="board-category"
                        value={createFormData.category}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., Satsang"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="board-location">Location</Label>
                      <Input
                        id="board-location"
                        value={createFormData.location}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="e.g., Mumbai"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="board-date">Event Date</Label>
                      <Input
                        id="board-date"
                        type="date"
                        value={createFormData.eventDate}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="board-priority">Priority</Label>
                      <Select
                        value={createFormData.priority}
                        onValueChange={(value: any) => setCreateFormData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateBoard(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateBoard}
                    disabled={!createFormData.name.trim()}
                  >
                    Create Board
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search boards by name, description, category, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map(status => status && (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(category => category && (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Boards Grid */}
          {loadingBoards ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' 
                  ? 'No boards match your search criteria.' 
                  : 'No boards found. Create your first board to get started.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBoards.map((board) => {
                const creator = getBoardCreator(board.creatorUid);
                return (
                  <Card 
                    key={board.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    onClick={() => handleBoardClick(board)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold line-clamp-1">
                            {board.name}
                          </CardTitle>
                          {board.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {board.description}
                            </CardDescription>
                          )}
                        </div>
                        {board.isDefault && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            Default
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Status and Priority */}
                      <div className="flex items-center gap-2">
                        {board.settings?.status && (
                          <Badge className={`text-xs ${getStatusColor(board.settings.status)}`}>
                            {board.settings.status}
                          </Badge>
                        )}
                        {board.settings?.priority && (
                          <Badge className={`text-xs ${getPriorityColor(board.settings.priority)}`}>
                            <Star className="h-3 w-3 mr-1" />
                            {board.settings.priority}
                          </Badge>
                        )}
                      </div>

                      {/* Category and Location */}
                      {(board.settings?.category || board.settings?.location) && (
                        <div className="space-y-1">
                          {board.settings?.category && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Tag className="h-4 w-4" />
                              {board.settings.category}
                            </div>
                          )}
                          {board.settings?.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {board.settings.location}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Event Date */}
                      {board.settings?.eventDate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(board.settings.eventDate).toLocaleDateString()}
                        </div>
                      )}

                      {/* Creator and Shared Count */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          {creator && (
                            <>
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                                <AvatarFallback className="text-xs">{getInitials(creator.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">{creator.name}</span>
                                {getRoleIcon(creator.role)}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{board.sharedWith.length + 1}</span>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Created {new Date(board.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 