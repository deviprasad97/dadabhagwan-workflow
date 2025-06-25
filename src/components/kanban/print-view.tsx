'use client';

import React, { useState, useMemo } from 'react';
import type { Card, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PrintStatusBadge } from '@/components/ui/print-status-badge';
import { CheckCircle, XCircle, Clock, MessageSquare, User as UserIcon, Calendar, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { cardService } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface PrintViewProps {
  cards: Card[];
  users: Record<string, User>;
  onCardUpdate?: () => void;
}

interface RejectModalData {
  card: Card;
  comment: string;
}

export function PrintView({ cards, users, onCardUpdate }: PrintViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<RejectModalData | null>(null);

  // Filter cards to only show those in print column
  const printCards = useMemo(() => {
    return cards.filter(card => card.column === 'print');
  }, [cards]);

  const isAdmin = user?.role === 'Admin';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  const getPrintStatusBadge = (card: Card) => {
    const status = card.printStatus?.status;
    
    if (!status || status === 'pending') {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      );
    }
    
    if (status === 'approved') {
      return (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    }
    
    if (status === 'rejected') {
      return (
        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
  };

  const handleApprove = async (cardId: string) => {
    if (!user) return;
    
    setIsLoading(cardId);
    try {
      await cardService.updateCardPrintStatus(cardId, {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString(),
      });
      
      toast({
        title: "Card Approved",
        description: "The card has been approved for printing.",
      });
      
      onCardUpdate?.();
    } catch (error) {
      console.error('Error approving card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to approve card. Please try again.',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleReject = async () => {
    if (!user || !rejectModal) return;
    
    setIsLoading(rejectModal.card.id);
    try {
      await cardService.updateCardPrintStatus(rejectModal.card.id, {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewedAt: new Date().toISOString(),
        comment: rejectModal.comment.trim() || undefined,
      });
      
      toast({
        title: "Card Rejected",
        description: "The card has been rejected for printing.",
      });
      
      setRejectModal(null);
      onCardUpdate?.();
    } catch (error) {
      console.error('Error rejecting card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reject card. Please try again.',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleReset = async (cardId: string) => {
    if (!user) return;
    
    setIsLoading(cardId);
    try {
      await cardService.updateCardPrintStatus(cardId, {
        status: 'pending',
        reviewedBy: undefined,
        reviewedAt: undefined,
        comment: undefined,
      });
      
      toast({
        title: "Status Reset",
        description: "The card status has been reset to pending review.",
      });
      
      onCardUpdate?.();
    } catch (error) {
      console.error('Error resetting card status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reset card status. Please try again.',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const getCardName = (card: Card) => {
    if (card.metadata?.formData?.firstname && card.metadata?.formData?.lastname) {
      return `${card.metadata.formData.firstname} ${card.metadata.formData.lastname}`;
    }
    return card.title;
  };

  const getContentPreview = (card: Card) => {
    const content = card.metadata?.formData?.english_question || card.content;
    return content.length > 100 ? `${content.substring(0, 100)}...` : content;
  };

  const getTranslationPreview = (card: Card) => {
    const translation = card.metadata?.approvedTranslation || card.metadata?.gujaratiTranslation;
    if (!translation) return null;
    return translation.length > 100 ? `${translation.substring(0, 100)}...` : translation;
  };

  if (printCards.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-muted-foreground mb-2">
            No cards in print column
          </div>
          <div className="text-sm text-muted-foreground">
            Cards will appear here when they reach the print stage.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Print Queue</h2>
          <p className="text-sm text-muted-foreground">
            {printCards.length} card{printCards.length !== 1 ? 's' : ''} ready for review and printing
          </p>
        </div>
        {isAdmin && (
          <div className="text-sm text-muted-foreground">
            Admin controls available
          </div>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Content</TableHead>
              <TableHead>Translation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Created</TableHead>
              {isAdmin && <TableHead className="text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {printCards.map((card) => {
              const creator = users[card.creatorUid];
              const reviewer = card.printStatus?.reviewedBy ? users[card.printStatus.reviewedBy] : null;
              
              return (
                <TableRow key={card.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      #{card.cardNumber}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    {getCardName(card)}
                  </TableCell>
                  
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-muted-foreground">
                      {getContentPreview(card)}
                    </div>
                  </TableCell>
                  
                  <TableCell className="max-w-xs">
                    {getTranslationPreview(card) && (
                      <div className="text-sm text-blue-700 font-gujarati">
                        {getTranslationPreview(card)}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <PrintStatusBadge 
                        printStatus={card.printStatus} 
                        assigneeUid={card.assigneeUid}
                        reviewerName={reviewer?.name} 
                      />
                      {card.printStatus?.reviewedBy && reviewer && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {reviewer.name}
                        </div>
                      )}
                      {card.printStatus?.reviewedAt && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(card.printStatus.reviewedAt), { addSuffix: true })}
                        </div>
                      )}
                      {card.printStatus?.comment && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {card.printStatus.comment}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {creator && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={creator.avatarUrl} alt={creator.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(creator.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{creator.name}</span>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}
                  </TableCell>
                  
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(!card.printStatus || card.printStatus.status === 'pending') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(card.id)}
                              disabled={isLoading === card.id}
                              className="text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectModal({ card, comment: '' })}
                              disabled={isLoading === card.id}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {card.printStatus && card.printStatus.status !== 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading === card.id}
                              >
                                Reset
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Print Status</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will reset the card status to "Pending Review" and clear the current approval/rejection.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleReset(card.id)}>
                                  Reset
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <Dialog open={!!rejectModal} onOpenChange={() => setRejectModal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Card for Printing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Card</Label>
                <div className="text-sm text-muted-foreground">
                  #{rejectModal.card.cardNumber} - {getCardName(rejectModal.card)}
                </div>
              </div>
              <div>
                <Label htmlFor="reject-comment">Rejection Comment (Optional)</Label>
                <Textarea
                  id="reject-comment"
                  value={rejectModal.comment}
                  onChange={(e) => setRejectModal({ ...rejectModal, comment: e.target.value })}
                  placeholder="Provide a reason for rejection..."
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectModal(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={isLoading === rejectModal.card.id}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 