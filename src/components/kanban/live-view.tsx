'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Eye, Edit, CheckCircle, Clock } from 'lucide-react';
import type { Card } from '@/lib/types';

interface LiveViewProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
}

export function LiveView({ cards, onCardClick }: LiveViewProps) {
  // Filter cards that are in the 'live' column
  const liveCards = useMemo(() => {
    return cards.filter(card => card.column === 'live');
  }, [cards]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Urgent': return 'destructive';
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (isAnswered?: boolean, isLive?: boolean) => {
    if (isAnswered) return 'default';
    if (isLive) return 'destructive';
    return 'secondary';
  };

  const getStatusText = (isAnswered?: boolean, isLive?: boolean) => {
    if (isAnswered) return 'Answered';
    if (isLive) return 'Live';
    return 'Pending';
  };

  const getStatusIcon = (isAnswered?: boolean, isLive?: boolean) => {
    if (isAnswered) return <CheckCircle className="h-3 w-3" />;
    if (isLive) return <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />;
    return <Clock className="h-3 w-3" />;
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const extractPersonName = (card: Card) => {
    // Try to get name from metadata first, then fallback to parsing title or content
    if (card.metadata?.personName) return card.metadata.personName;
    if (card.metadata?.formData?.firstname && card.metadata?.formData?.lastname) {
      return `${card.metadata.formData.firstname} ${card.metadata.formData.lastname}`;
    }
    if (card.metadata?.formData?.name) return card.metadata.formData.name;
    return card.title; // Fallback to card title
  };

  const extractOriginalQuestion = (card: Card) => {
    // Try to get from form data or content
    if (card.metadata?.formData?.english_question) return card.metadata.formData.english_question;
    if (card.metadata?.formData?.question) return card.metadata.formData.question;
    return card.content; // Fallback to card content
  };

  const extractTranslatedQuestion = (card: Card) => {
    // Try to get translated version
    if (card.metadata?.translatedQuestion) return card.metadata.translatedQuestion;
    if (card.metadata?.gujaratiTranslation) return card.metadata.gujaratiTranslation;
    if (card.metadata?.approvedTranslation) return card.metadata.approvedTranslation;
    return ''; // No translation yet
  };

  if (liveCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Live Questions</h3>
        <p className="text-sm text-muted-foreground">
          There are currently no questions in the Live column.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Live Questions</h2>
          <Badge variant="destructive" className="animate-pulse">
            {liveCards.length} Live
          </Badge>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">Nr.</TableHead>
              <TableHead className="w-24">Language</TableHead>
              <TableHead className="w-40">Name</TableHead>
              <TableHead className="min-w-[300px]">English Question</TableHead>
              <TableHead className="min-w-[300px]">German/Gujarati Translation</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liveCards.map((card) => {
              const personName = extractPersonName(card);
              const originalQuestion = extractOriginalQuestion(card);
              const translatedQuestion = extractTranslatedQuestion(card);
              const originalLanguage = card.metadata?.originalLanguage || 'English';
              const isAnswered = card.metadata?.isAnswered || false;
              const isLive = card.metadata?.isLive || true; // Assume live if in live column
              const priority = card.metadata?.priority;

              return (
                <TableRow key={card.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-sm">
                    <Badge variant="outline">#{card.cardNumber}</Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {originalLanguage}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    {personName}
                  </TableCell>
                  
                  <TableCell className="max-w-xs">
                    <div className="space-y-1">
                      <p className="text-sm leading-relaxed">
                        {truncateText(originalQuestion, 150)}
                      </p>
                      {originalQuestion.length > 150 && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => onCardClick?.(card)}
                        >
                          Read more...
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="max-w-xs">
                    {translatedQuestion ? (
                      <div className="space-y-1">
                        <p className="text-sm leading-relaxed">
                          {truncateText(translatedQuestion, 150)}
                        </p>
                        {translatedQuestion.length > 150 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => onCardClick?.(card)}
                          >
                            Read more...
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Not translated yet
                      </Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={getStatusColor(isAnswered, isLive) as any}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getStatusIcon(isAnswered, isLive)}
                      {getStatusText(isAnswered, isLive)}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {priority && (
                      <Badge variant={getPriorityColor(priority) as any} className="text-xs">
                        {priority}
                      </Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCardClick?.(card)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCardClick?.(card)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <div className="text-sm text-muted-foreground">
        Showing {liveCards.length} live question{liveCards.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
} 