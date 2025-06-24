'use client';

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { 
  Languages, 
  ArrowRight, 
  Play, 
  Check, 
  X, 
  Edit, 
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import type { Card, Board, TranslationStep, TranslationProvider } from '@/lib/types';
import { 
  LANGUAGE_NAMES, 
  executeTranslationStep, 
  updateCardTranslationStep,
  getCurrentTranslation,
  isTranslationComplete,
  getNextTranslationStep
} from '@/lib/translation-service';
import { useAuth } from '@/hooks/use-auth';

interface EnhancedTranslationPanelProps {
  card: Card;
  board: Board;
  onCardUpdate: (updatedCard: Card) => void;
}

export function EnhancedTranslationPanel({ card, board, onCardUpdate }: EnhancedTranslationPanelProps) {
  const { user } = useAuth();
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const translationSettings = board.translationSettings;
  const translationFlow = card.metadata?.translationFlow || [];
  
  // If no translation settings, show legacy translation or setup message
  if (!translationSettings) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Translation workflow is not configured for this board. Please contact an admin to set up translation settings.
          </AlertDescription>
        </Alert>
        
        {/* Show legacy translation if available */}
        {(card.metadata?.gujaratiTranslation || card.metadata?.approvedTranslation) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Legacy Translation</Label>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm">
                {card.metadata?.approvedTranslation || card.metadata?.gujaratiTranslation}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleExecuteStep = useCallback(async (step: TranslationStep, provider: TranslationProvider) => {
    setProcessingStep(step.id);
    
    try {
      const executedStep = await executeTranslationStep(step, provider, user?.uid);
      const updatedCard = updateCardTranslationStep(card, step.id, executedStep);
      onCardUpdate(updatedCard);
      
      toast({
        title: 'Translation Completed',
        description: `Step translated from ${LANGUAGE_NAMES[step.fromLanguage as keyof typeof LANGUAGE_NAMES]} to ${LANGUAGE_NAMES[step.toLanguage as keyof typeof LANGUAGE_NAMES]}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setProcessingStep(null);
    }
  }, [card, onCardUpdate, user?.uid]);

  const handleManualEdit = useCallback((step: TranslationStep) => {
    setEditingStep(step.id);
    setEditText(step.translatedText || step.originalText);
  }, []);

  const handleSaveEdit = useCallback((step: TranslationStep) => {
    const updatedStep: TranslationStep = {
      ...step,
      translatedText: editText,
      status: 'completed',
      isManuallyEdited: true,
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid,
    };

    const updatedCard = updateCardTranslationStep(card, step.id, updatedStep);
    onCardUpdate(updatedCard);
    
    setEditingStep(null);
    setEditText('');
    
    toast({
      title: 'Translation Updated',
      description: 'Manual translation has been saved',
    });
  }, [card, editText, onCardUpdate, user?.uid]);

  const handleApproveStep = useCallback((step: TranslationStep) => {
    const updatedStep: TranslationStep = {
      ...step,
      status: 'approved',
      updatedAt: new Date().toISOString(),
      createdBy: user?.uid,
    };

    const updatedCard = updateCardTranslationStep(card, step.id, updatedStep);
    onCardUpdate(updatedCard);
    
    toast({
      title: 'Translation Approved',
      description: 'Translation step has been approved',
    });
  }, [card, onCardUpdate, user?.uid]);

  const getStepIcon = (step: TranslationStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'approved':
        return <Check className="h-4 w-4 text-blue-600" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'error':
        return <X className="h-4 w-4 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepStatusColor = (status: TranslationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const nextStep = getNextTranslationStep(card);
  const isComplete = isTranslationComplete(card);

  return (
    <div className="space-y-6">
      {/* Translation Workflow Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Translation Workflow
          </Label>
          <Badge 
            variant="outline" 
            className={isComplete ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}
          >
            {isComplete ? 'Complete' : 'In Progress'}
          </Badge>
        </div>
        
        {/* Translation Flow Visualization */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Badge variant="outline">
              {LANGUAGE_NAMES[translationSettings.defaultLanguage as keyof typeof LANGUAGE_NAMES]}
            </Badge>
            <ArrowRight className="h-4 w-4" />
            {translationSettings.requiresIntermediateTranslation && translationSettings.defaultLanguage !== 'en' && (
              <>
                <Badge variant="outline">English</Badge>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
            <Badge variant="outline">
              {LANGUAGE_NAMES[translationSettings.targetLanguage as keyof typeof LANGUAGE_NAMES]}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Translation Steps */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Translation Steps</Label>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            {translationFlow.map((step, index) => (
              <div key={step.id} className="border rounded-lg p-4 space-y-3">
                {/* Step Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStepIcon(step)}
                    <span className="text-sm font-medium">
                      Step {index + 1}: {LANGUAGE_NAMES[step.fromLanguage as keyof typeof LANGUAGE_NAMES]} → {LANGUAGE_NAMES[step.toLanguage as keyof typeof LANGUAGE_NAMES]}
                    </span>
                  </div>
                  <Badge variant="outline" className={getStepStatusColor(step.status)}>
                    {step.status.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Source Text */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Source ({LANGUAGE_NAMES[step.fromLanguage as keyof typeof LANGUAGE_NAMES]})
                  </Label>
                  <div className="p-2 bg-muted/30 rounded text-sm">
                    {step.originalText}
                  </div>
                </div>

                {/* Translation Result */}
                {step.translatedText && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Translation ({LANGUAGE_NAMES[step.toLanguage as keyof typeof LANGUAGE_NAMES]})
                        {step.isManuallyEdited && (
                          <Badge variant="secondary" className="ml-2 text-xs">Manual</Badge>
                        )}
                      </Label>
                      {step.status === 'completed' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManualEdit(step)}
                            className="h-6 px-2 text-xs"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApproveStep(step)}
                            className="h-6 px-2 text-xs text-blue-600"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {editingStep === step.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(step)}
                            className="h-7 text-xs"
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingStep(null)}
                            className="h-7 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                        {step.translatedText}
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {step.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {step.error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                {step.status === 'pending' && step.originalText && (
                  <div className="flex gap-2">
                    {translationSettings.enabledProviders.map((provider) => (
                      <Button
                        key={provider}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExecuteStep(step, provider)}
                        disabled={processingStep === step.id}
                        className="flex items-center gap-2"
                      >
                        {processingStep === step.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Translate with {provider}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Final Translation */}
      {isComplete && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-medium text-green-700">
              Final Translation ({LANGUAGE_NAMES[translationSettings.targetLanguage as keyof typeof LANGUAGE_NAMES]})
            </Label>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm leading-relaxed">
                {getCurrentTranslation(card)}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 