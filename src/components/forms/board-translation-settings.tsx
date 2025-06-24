'use client';

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Languages, Settings, CheckCircle, ArrowRight } from 'lucide-react';
import type { Board, TranslationProvider, SupportedLanguage } from '@/lib/types';
import { LANGUAGE_NAMES } from '@/lib/translation-service';
import { useAuth } from '@/hooks/use-auth';

interface BoardTranslationSettingsProps {
  board: Board;
  onUpdateBoard: (updatedBoard: Board) => void;
}

export function BoardTranslationSettings({ board, onUpdateBoard }: BoardTranslationSettingsProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const isAdmin = user?.role === 'Admin';
  
  const currentSettings = board.translationSettings || {
    defaultLanguage: 'en',
    targetLanguage: 'gu',
    requiresIntermediateTranslation: false,
    intermediateLanguage: 'en',
    enabledProviders: ['openai'] as TranslationProvider[],
    autoTranslate: false,
  };

  const [settings, setSettings] = useState(currentSettings);

  const supportedLanguages: SupportedLanguage[] = ['en', 'gu', 'de', 'hi', 'fr', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'];
  const availableProviders: TranslationProvider[] = ['genkit', 'openai', 'sutra'];

  const handleSave = useCallback(() => {
    const updatedBoard: Board = {
      ...board,
      translationSettings: settings,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBoard(updatedBoard);
    setIsOpen(false);
    
    toast({
      title: 'Translation Settings Updated',
      description: 'Board translation configuration has been saved.',
    });
  }, [board, settings, onUpdateBoard]);

  const handleProviderToggle = useCallback((provider: TranslationProvider) => {
    setSettings(prev => ({
      ...prev,
      enabledProviders: prev.enabledProviders.includes(provider)
        ? prev.enabledProviders.filter(p => p !== provider)
        : [...prev.enabledProviders, provider],
    }));
  }, []);

  const getTranslationFlow = () => {
    if (!settings.requiresIntermediateTranslation || settings.defaultLanguage === 'en') {
      return `${LANGUAGE_NAMES[settings.defaultLanguage as SupportedLanguage]} → ${LANGUAGE_NAMES[settings.targetLanguage as SupportedLanguage]}`;
    }
    return `${LANGUAGE_NAMES[settings.defaultLanguage as SupportedLanguage]} → English → ${LANGUAGE_NAMES[settings.targetLanguage as SupportedLanguage]}`;
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            Translation Settings
            {board.translationSettings && (
              <Badge variant="secondary" className="ml-1">
                {getTranslationFlow()}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Translation Settings
            </DialogTitle>
            <DialogDescription>
              Configure how translations are handled for cards in this board
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Language Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                <h3 className="text-sm font-medium">Language Configuration</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default-language">Default Language</Label>
                  <Select
                    value={settings.defaultLanguage}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, defaultLanguage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default language" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {LANGUAGE_NAMES[lang]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-language">Target Language</Label>
                  <Select
                    value={settings.targetLanguage}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, targetLanguage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select target language" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {LANGUAGE_NAMES[lang]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Translation Flow */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="intermediate-translation">Intermediate Translation</Label>
                  <p className="text-sm text-muted-foreground">
                    Translate through English for better accuracy
                  </p>
                </div>
                <Switch
                  id="intermediate-translation"
                  checked={settings.requiresIntermediateTranslation}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    requiresIntermediateTranslation: checked 
                  }))}
                />
              </div>

              {/* Translation Flow Visualization */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Badge variant="outline">
                    {LANGUAGE_NAMES[settings.defaultLanguage as SupportedLanguage]}
                  </Badge>
                  <ArrowRight className="h-4 w-4" />
                  {settings.requiresIntermediateTranslation && settings.defaultLanguage !== 'en' && (
                    <>
                      <Badge variant="outline">English</Badge>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                  <Badge variant="outline">
                    {LANGUAGE_NAMES[settings.targetLanguage as SupportedLanguage]}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* AI Providers */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">AI Translation Providers</h3>
                <p className="text-sm text-muted-foreground">
                  Select which AI providers to use for translations
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {availableProviders.map((provider) => (
                  <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={settings.enabledProviders.includes(provider)}
                          onCheckedChange={() => handleProviderToggle(provider)}
                        />
                        <Label className="capitalize font-medium">{provider}</Label>
                      </div>
                      {provider === 'genkit' && (
                        <Badge variant="secondary" className="text-xs">
                          EN → GU only
                        </Badge>
                      )}
                    </div>
                    {settings.enabledProviders.includes(provider) && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Auto-translate */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-translate">Auto-translate new cards</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically start translation when new cards are created
                </p>
              </div>
              <Switch
                id="auto-translate"
                checked={settings.autoTranslate}
                onCheckedChange={(checked) => setSettings(prev => ({ 
                  ...prev, 
                  autoTranslate: checked 
                }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={settings.enabledProviders.length === 0}
            >
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 