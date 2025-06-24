'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { 
  ChevronDown, 
  Plus, 
  Share, 
  Settings, 
  Users,
  Crown,
  Edit3,
  Eye,
  Trash2,
  Copy,
  Search
} from 'lucide-react';
import { boardService, userService } from '@/lib/firestore';
import type { Board, User } from '@/lib/types';

// BoardSettingsForm component
interface BoardSettingsFormProps {
  board: Board;
  onUpdate: (board: Board) => void;
  onClose: () => void;
}

function BoardSettingsForm({ board, onUpdate, onClose }: BoardSettingsFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: board.name,
    description: board.description || '',
    category: board.settings?.category || '',
    location: board.settings?.location || '',
    eventDate: board.settings?.eventDate || '',
    status: board.settings?.status || 'Active',
    priority: board.settings?.priority || 'Medium',
    color: board.settings?.color || '#3B82F6',
    allowEditorSharing: board.settings?.allowEditorSharing ?? true,
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const canEdit = user?.role === 'Admin' || board.creatorUid === user?.uid;

  const handleUpdate = async () => {
    if (!canEdit) return;

    try {
      setIsUpdating(true);
      await boardService.updateBoard(board.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        settings: {
          ...board.settings,
          category: formData.category.trim(),
          location: formData.location.trim(),
          eventDate: formData.eventDate,
          status: formData.status as any,
          priority: formData.priority as any,
          color: formData.color,
          allowEditorSharing: formData.allowEditorSharing,
        }
      });

      // Get updated board
      const updatedBoard = await boardService.getBoard(board.id);
      if (updatedBoard) {
        onUpdate(updatedBoard);
      }

      toast({
        title: 'Board Updated',
        description: 'Board settings have been updated successfully.'
      });
      onClose();
    } catch (error) {
      console.error('Error updating board:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update board settings'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Basic Information</Label>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-description">Description</Label>
            <Textarea
              id="board-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!canEdit}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Event Details */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Event Details</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="board-category">Category</Label>
            <Input
              id="board-category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              disabled={!canEdit}
              placeholder="e.g., Satsang"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-location">Location</Label>
            <Input
              id="board-location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              disabled={!canEdit}
              placeholder="e.g., Mumbai"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="board-date">Event Date</Label>
          <Input
            id="board-date"
            type="date"
            value={formData.eventDate}
            onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* Status & Priority */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Status & Priority</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="board-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'Active' | 'Inactive' | 'Archived') => setFormData(prev => ({ ...prev, status: value }))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: 'Low' | 'Medium' | 'High' | 'Urgent') => setFormData(prev => ({ ...prev, priority: value }))}
              disabled={!canEdit}
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

      {/* Board Information */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Board Information</Label>
        <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Created:</span>
            <span className="text-sm">{new Date(board.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Last Updated:</span>
            <span className="text-sm">{new Date(board.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Shared with:</span>
            <span className="text-sm">{board.sharedWith.length} user(s)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Access Level:</span>
            <span className="text-sm">
              {user?.role === 'Admin' ? 'Admin' : board.creatorUid === user?.uid ? 'Owner' : 'Shared'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Board'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface BoardSelectorProps {
  currentBoard: Board | null;
  onBoardChange: (board: Board) => void;
}

export function BoardSelector({ currentBoard, onBoardChange }: BoardSelectorProps) {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showShareBoard, setShowShareBoard] = useState(false);
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [createFormData, setCreateFormData] = useState({
    name: '',
    description: ''
  });
  const [shareFormData, setShareFormData] = useState({
    selectedUsers: [] as string[]
  });

  // Fetch boards accessible to current user
  useEffect(() => {
    if (!user) return;

    const fetchBoards = async () => {
      try {
        setLoading(true);
        const userBoards = await boardService.getUserBoards(user.uid, user.role);
        setBoards(userBoards);
        
        // If no current board selected, select the first available or default
        if (!currentBoard && userBoards.length > 0) {
          const defaultBoard = userBoards.find(b => b.isDefault) || userBoards[0];
          onBoardChange(defaultBoard);
        }
      } catch (error) {
        console.error('Error fetching boards:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load boards'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [user, currentBoard, onBoardChange]);

  // Fetch users for sharing
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await userService.getAllUsers();
        // Filter out current user and system users
        const eligibleUsers = users.filter(u => 
          u.uid !== user?.uid && 
          u.uid !== 'google-forms' && 
          (u.role === 'Admin' || u.role === 'Editor')
        );
        setAvailableUsers(eligibleUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (user) {
      fetchUsers();
    }
  }, [user]);

  const handleCreateBoard = async () => {
    if (!user || !createFormData.name.trim()) return;

    try {
      const boardId = await boardService.createBoard({
        name: createFormData.name.trim(),
        description: createFormData.description.trim(),
        creatorUid: user.uid,
        sharedWith: [],
        settings: {}
      });

      // Fetch the newly created board
      const newBoard = await boardService.getBoard(boardId);
      if (newBoard) {
        setBoards(prev => [newBoard, ...prev]);
        onBoardChange(newBoard);
      }

      setCreateFormData({ name: '', description: '' });
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

  const handleShareBoard = async () => {
    if (!currentBoard || shareFormData.selectedUsers.length === 0) return;

    try {
      await boardService.shareBoard(currentBoard.id, shareFormData.selectedUsers);
      
      // Update local board state
      setBoards(prev => prev.map(board => 
        board.id === currentBoard.id 
          ? { ...board, sharedWith: [...board.sharedWith, ...shareFormData.selectedUsers] }
          : board
      ));

      setShareFormData({ selectedUsers: [] });
      setShowShareBoard(false);
      
      toast({
        title: 'Board Shared',
        description: `Board has been shared with ${shareFormData.selectedUsers.length} user(s).`
      });
    } catch (error) {
      console.error('Error sharing board:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to share board'
      });
    }
  };

  const handleUnshareUser = async (userId: string) => {
    if (!currentBoard) return;

    try {
      await boardService.unshareBoard(currentBoard.id, [userId]);
      
      // Update local board state
      setBoards(prev => prev.map(board => 
        board.id === currentBoard.id 
          ? { ...board, sharedWith: board.sharedWith.filter(uid => uid !== userId) }
          : board
      ));
      
      toast({
        title: 'Access Removed',
        description: 'User access has been removed from this board.'
      });
    } catch (error) {
      console.error('Error unsharing board:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove user access'
      });
    }
  };

  const getBoardAccessLevel = (board: Board): 'owner' | 'shared' | 'admin' => {
    if (user?.role === 'Admin') return 'admin';
    if (board.creatorUid === user?.uid) return 'owner';
    return 'shared';
  };

  const canManageBoard = (board: Board): boolean => {
    const access = getBoardAccessLevel(board);
    return access === 'owner' || access === 'admin';
  };

  // Filter boards based on search query
  const filteredBoards = boards.filter(board => {
    if (!boardSearchQuery.trim()) return true;
    const query = boardSearchQuery.toLowerCase();
    return (
      board.name.toLowerCase().includes(query) ||
      board.description?.toLowerCase().includes(query) ||
      board.settings?.category?.toLowerCase().includes(query)
    );
  });

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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading boards...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Board Selector Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 min-w-[200px] justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="font-medium">
                {currentBoard?.name || 'Select Board'}
              </span>
              {currentBoard?.isDefault && (
                <Badge variant="secondary" className="text-xs">Default</Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[350px]">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search boards..."
                value={boardSearchQuery}
                onChange={(e) => setBoardSearchQuery(e.target.value)}
                className="pl-10 h-8"
              />
            </div>
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-60 overflow-y-auto">
            {filteredBoards.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {boardSearchQuery ? 'No boards match your search.' : 'No boards available.'}
              </div>
            ) : (
              filteredBoards.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => onBoardChange(board)}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <div className="font-medium">{board.name}</div>
                      {board.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{board.description}</div>
                      )}
                      {board.settings?.category && (
                        <div className="text-xs text-muted-foreground">📂 {board.settings.category}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {board.settings?.status && (
                      <Badge 
                        variant={board.settings.status === 'Active' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {board.settings.status}
                      </Badge>
                    )}
                    {board.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                    {getBoardAccessLevel(board) === 'owner' && (
                      <Badge variant="outline" className="text-xs">Owner</Badge>
                    )}
                    {currentBoard?.id === board.id && (
                      <Badge className="text-xs">Current</Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowCreateBoard(true)}
            className="flex items-center gap-2 text-primary"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Board</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Board Actions */}
      {currentBoard && canManageBoard(currentBoard) && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShareBoard(true)}
            className="h-8"
          >
            <Share className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBoardSettings(true)}
            className="h-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create Board Dialog */}
      <Dialog open={showCreateBoard} onOpenChange={setShowCreateBoard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
            <DialogDescription>
              Create a new board to organize your questions and workflows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name</Label>
              <Input
                id="board-name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter board name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-description">Description (Optional)</Label>
              <Textarea
                id="board-description"
                value={createFormData.description}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter board description"
                rows={3}
              />
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

      {/* Share Board Sheet */}
      <Sheet open={showShareBoard} onOpenChange={setShowShareBoard}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Share Board</SheetTitle>
            <SheetDescription>
              Share "{currentBoard?.name}" with other users to collaborate.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            {/* Add Users */}
            <div className="space-y-4">
              <Label>Add Users</Label>
              <Select
                value=""
                onValueChange={(userId) => {
                  if (userId && !shareFormData.selectedUsers.includes(userId)) {
                    setShareFormData(prev => ({
                      selectedUsers: [...prev.selectedUsers, userId]
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user to share with" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers
                    .filter(u => !currentBoard?.sharedWith.includes(u.uid) && !shareFormData.selectedUsers.includes(u.uid))
                    .map((user) => (
                    <SelectItem key={user.uid} value={user.uid}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          <span className="text-xs text-muted-foreground">{user.role}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Pending Users to Add */}
              {shareFormData.selectedUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Users to Add:</Label>
                  {shareFormData.selectedUsers.map((userId) => {
                    const user = availableUsers.find(u => u.uid === userId);
                    if (!user) return null;
                    return (
                      <div key={userId} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getRoleIcon(user.role)}
                            {user.role}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShareFormData(prev => ({
                            selectedUsers: prev.selectedUsers.filter(id => id !== userId)
                          }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button onClick={handleShareBoard} className="w-full">
                    Share with {shareFormData.selectedUsers.length} user(s)
                  </Button>
                </div>
              )}
            </div>

            {/* Current Shared Users */}
            {currentBoard && currentBoard.sharedWith.length > 0 && (
              <div className="space-y-4">
                <Label>Currently Shared With:</Label>
                <div className="space-y-2">
                  {currentBoard.sharedWith.map((userId) => {
                    const user = availableUsers.find(u => u.uid === userId);
                    if (!user) return null;
                    return (
                      <div key={userId} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {getRoleIcon(user.role)}
                            {user.role}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnshareUser(userId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Board Settings Sheet */}
      <Sheet open={showBoardSettings} onOpenChange={setShowBoardSettings}>
        <SheetContent className="w-[400px] sm:w-[500px]">
          <SheetHeader>
            <SheetTitle>Board Settings</SheetTitle>
            <SheetDescription>
              Manage settings and details for "{currentBoard?.name}".
            </SheetDescription>
          </SheetHeader>
          {currentBoard && (
            <BoardSettingsForm 
              board={currentBoard}
              onUpdate={(updatedBoard) => {
                setBoards(prev => prev.map(b => b.id === updatedBoard.id ? updatedBoard : b));
                onBoardChange(updatedBoard);
              }}
              onClose={() => setShowBoardSettings(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
} 