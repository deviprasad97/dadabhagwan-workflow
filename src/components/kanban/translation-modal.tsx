'use client';

import { useState, useTransition } from 'react';
import type { Card } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { suggestGujaratiTranslation } from '@/ai/flows/suggest-gujarati-translation';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Languages } from 'lucide-react';

interface TranslationModalProps {
  card: Card;
  onClose: () => void;
  onSave: (updatedCard: Card) => void;
}

export function TranslationModal({ card, onClose, onSave }: TranslationModalProps) {
  const [translation, setTranslation] = useState(card.gujaratiTranslation || '');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSuggestTranslation = () => {
    startTransition(async () => {
      try {
        const result = await suggestGujaratiTranslation({ englishText: card.content });
        setTranslation(result.gujaratiText);
        toast({
            title: "Translation Suggested",
            description: "The AI has provided a translation suggestion."
        })
      } catch (error) {
        console.error('Translation failed', error);
        toast({
          variant: 'destructive',
          title: 'Translation Failed',
          description: 'Could not get a translation from the AI.',
        });
      }
    });
  };

  const handleSave = () => {
    onSave({ ...card, gujaratiTranslation: translation });
    toast({
        title: "Translation Saved",
        description: `The translation for "${card.title}" has been updated.`
    })
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Translate Card</DialogTitle>
          <DialogDescription>
            Translate the content for "{card.title}" to Gujarati. Use the AI suggestion as a starting point.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="english-text">English Content</Label>
            <Textarea id="english-text" value={card.content} readOnly rows={5} className="bg-muted" />
          </div>
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
                <Label htmlFor="gujarati-text">Gujarati Translation</Label>
                <Button variant="ghost" size="sm" onClick={handleSuggestTranslation} disabled={isPending}>
                    {isPending ? (
                        <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                        <Languages className="mr-2 h-4 w-4" />
                    )}
                    Suggest with AI
                </Button>
            </div>
            <Textarea
              id="gujarati-text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Enter Gujarati translation here or use AI suggestion..."
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Translation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
