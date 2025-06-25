'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cardService, boardService, userService } from '@/lib/firestore';
import type { Card, Board, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card as UICard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PrintStatusBadge } from '@/components/ui/print-status-badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Printer, 
  FileText, 
  Users, 
  Calendar,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Download,
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface BulkActionData {
  action: 'approve' | 'reject';
  cardIds: string[];
  comment?: string;
}

export default function PrintManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // State management
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [pendingCards, setPendingCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkActionData | null>(null);

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/boards');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only admins can access the print management page.',
      });
    }
  }, [user, router, toast]);

  // Load boards
  useEffect(() => {
    const loadBoards = async () => {
      if (!user || user.role !== 'Admin') return;
      
      try {
        const boardsList = await boardService.getUserBoards(user.uid, user.role);
        setBoards(boardsList);
        
        // Auto-select first board if available
        if (boardsList.length > 0 && !selectedBoardId) {
          setSelectedBoardId(boardsList[0].id);
        }
      } catch (error) {
        console.error('Error loading boards:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load boards.',
        });
      }
    };

    loadBoards();
  }, [user, selectedBoardId, toast]);

  // Load pending cards when board changes
  useEffect(() => {
    const loadPendingCards = async () => {
      if (!selectedBoardId) {
        setPendingCards([]);
        return;
      }

      setIsLoading(true);
      try {
        const cards = await cardService.getPendingPrintCards(selectedBoardId);
        setPendingCards(cards);
        setSelectedCards(new Set()); // Clear selection when board changes
      } catch (error) {
        console.error('Error loading pending cards:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load pending cards.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingCards();
  }, [selectedBoardId, toast]);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      if (pendingCards.length === 0) return;

      try {
        const userIds = [...new Set(pendingCards.map(card => card.creatorUid))];
        const usersData: Record<string, User> = {};
        
        await Promise.all(
          userIds.map(async (uid) => {
            try {
              const userData = await userService.getUser(uid);
              if (userData) {
                usersData[uid] = userData;
              }
            } catch (error) {
              console.error(`Error loading user ${uid}:`, error);
            }
          })
        );
        
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, [pendingCards]);

  const selectedBoard = boards.find(board => board.id === selectedBoardId);

  const getCardName = (card: Card) => {
    if (card.metadata?.formData?.firstname && card.metadata?.formData?.lastname) {
      return `${card.metadata.formData.firstname} ${card.metadata.formData.lastname}`;
    }
    return card.title;
  };

  const getContentPreview = (card: Card) => {
    const content = card.metadata?.formData?.english_question || card.content;
    return content;
  };

  const getTranslation = (card: Card) => {
    return card.metadata?.approvedTranslation || card.metadata?.gujaratiTranslation;
  };

  const handleCardSelection = (cardId: string, isSelected: boolean) => {
    const newSelection = new Set(selectedCards);
    if (isSelected) {
      newSelection.add(cardId);
    } else {
      newSelection.delete(cardId);
    }
    setSelectedCards(newSelection);
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedCards(new Set(pendingCards.map(card => card.id)));
    } else {
      setSelectedCards(new Set());
    }
  };

  const handleSingleApprove = async (cardId: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await cardService.updateCardPrintStatus(cardId, {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString(),
      });
      
      // Remove from pending list
      setPendingCards(prev => prev.filter(card => card.id !== cardId));
      setSelectedCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(cardId);
        return newSet;
      });
      
      toast({
        title: "Card Approved",
        description: "The card has been approved for printing.",
      });
    } catch (error) {
      console.error('Error approving card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve card.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleReject = (cardId: string) => {
    const card = pendingCards.find(c => c.id === cardId);
    if (card) {
      setBulkAction({
        action: 'reject',
        cardIds: [cardId],
        comment: '',
      });
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedCards.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No Cards Selected',
        description: 'Please select cards to perform bulk actions.',
      });
      return;
    }

    setBulkAction({
      action,
      cardIds: Array.from(selectedCards),
      comment: '',
    });
  };

  const executeBulkAction = async () => {
    if (!bulkAction || !user) return;

    setIsLoading(true);
    try {
      if (bulkAction.action === 'approve') {
        await cardService.bulkUpdatePrintStatus(bulkAction.cardIds, {
          status: 'approved',
          reviewedBy: user.uid,
        });
      } else {
        await cardService.bulkUpdatePrintStatus(bulkAction.cardIds, {
          status: 'rejected',
          reviewedBy: user.uid,
          comment: bulkAction.comment,
        });
      }

      // Remove processed cards from pending list
      setPendingCards(prev => prev.filter(card => !bulkAction.cardIds.includes(card.id)));
      setSelectedCards(new Set());
      setBulkAction(null);

      toast({
        title: `Cards ${bulkAction.action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `${bulkAction.cardIds.length} card(s) have been ${bulkAction.action}d.`,
      });
    } catch (error) {
      console.error('Error executing bulk action:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to execute bulk action.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPendingCards = async () => {
    if (!selectedBoardId) return;
    
    setIsLoading(true);
    try {
      const cards = await cardService.getPendingPrintCards(selectedBoardId);
      setPendingCards(cards);
      setSelectedCards(new Set());
    } catch (error) {
      console.error('Error refreshing cards:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh cards.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user && user.role !== 'Admin') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/boards')}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Boards
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Printer className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold">Print Management</h1>
              <p className="text-muted-foreground">Review and approve cards for printing</p>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshPendingCards}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Board Selector */}
      <UICard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Board Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="board-select">Select Board to Review</Label>
              <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a board..." />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      <div className="flex items-center gap-2">
                        <span>{board.name}</span>
                        {board.isDefault && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBoard && (
              <div className="text-sm text-muted-foreground">
                <div>{selectedBoard.description}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created {formatDistanceToNow(new Date(selectedBoard.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </UICard>

      {/* Pending Cards */}
      {selectedBoardId && (
        <UICard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Review ({pendingCards.length})
              </CardTitle>
              {pendingCards.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                    {selectedCards.size} of {pendingCards.length} selected
                  </Badge>
                  {selectedCards.size > 0 && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleBulkAction('approve')}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        variant="outline"
                        disabled={isLoading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve Selected
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleBulkAction('reject')}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        variant="outline"
                        disabled={isLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject Selected
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading pending cards...</span>
              </div>
            ) : pendingCards.length === 0 ? (
              <div className="text-center py-8">
                <CheckCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  {selectedBoard ? 
                    `No pending cards to review in "${selectedBoard.name}"` : 
                    'No pending cards to review'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedCards.size === pendingCards.length}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label className="text-sm font-medium">
                    Select All ({pendingCards.length} cards)
                  </Label>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-4">
                  {pendingCards.map((card) => {
                    const creator = users[card.creatorUid];
                    const isSelected = selectedCards.has(card.id);
                    
                    return (
                      <div
                        key={card.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleCardSelection(card.id, !!checked)}
                          />
                          
                          <div className="flex-1 space-y-3">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  #{card.cardNumber}
                                </Badge>
                                <PrintStatusBadge 
                                  printStatus={card.printStatus} 
                                  assigneeUid={card.assigneeUid}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSingleApprove(card.id)}
                                  disabled={isLoading}
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSingleReject(card.id)}
                                  disabled={isLoading}
                                  className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>

                            {/* Name */}
                            <div>
                              <h3 className="font-semibold text-lg">{getCardName(card)}</h3>
                              {creator && (
                                <p className="text-sm text-muted-foreground">
                                  Created by {creator.name} • {formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}
                                </p>
                              )}
                            </div>

                            {/* Content */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">English Question</Label>
                                <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                  <p className="text-sm">{getContentPreview(card)}</p>
                                </div>
                              </div>
                              
                              {getTranslation(card) && (
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">Gujarati Translation</Label>
                                  <div className="mt-1 p-3 bg-blue-50 rounded-md">
                                    <p className="text-sm text-blue-700 font-gujarati">{getTranslation(card)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </UICard>
      )}

      {/* Bulk Action Modal */}
      {bulkAction && (
        <Dialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {bulkAction.action === 'approve' ? 'Approve Cards' : 'Reject Cards'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {bulkAction.action === 'approve' ? 'Approve' : 'Reject'} {bulkAction.cardIds.length} card(s) for printing?
                </p>
              </div>
              
              {bulkAction.action === 'reject' && (
                <div>
                  <Label htmlFor="bulk-comment">Rejection Comment (Optional)</Label>
                  <Textarea
                    id="bulk-comment"
                    value={bulkAction.comment}
                    onChange={(e) => setBulkAction({ ...bulkAction, comment: e.target.value })}
                    placeholder="Provide a reason for rejection..."
                    className="mt-1"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkAction(null)}>
                Cancel
              </Button>
              <Button 
                onClick={executeBulkAction}
                disabled={isLoading}
                variant={bulkAction.action === 'approve' ? 'default' : 'destructive'}
              >
                {bulkAction.action === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Cards
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Cards
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 