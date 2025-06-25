'use client';

import React, { useState, useEffect } from 'react';
import type { Card, User, Board } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  MessageSquare,
  Edit3,
  Save,
  X,
  Clock,
  Flag,
  Tag,
  FileText,
  Heart,
  Wand2,
  Check,
  Copy,
  Printer,
  UserPlus,
  UserMinus,
  Lock,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useEditLock } from '@/hooks/use-edit-lock';
import { cn } from '@/lib/utils';
import { suggestGujaratiTranslation } from '@/ai/flows/suggest-gujarati-translation';
import { ReactTransliterate } from 'react-transliterate';
import 'react-transliterate/dist/index.css';
import { OpenAI } from 'openai';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { CustomFieldsEditor } from './custom-field-renderer';

type TranslationProvider = 'genkit' | 'openai' | 'sutra';

interface TranslationStatus {
  provider: TranslationProvider;
  status: 'queued' | 'in_progress' | 'completed' | 'error';
  translation?: string;
  error?: string;
}

interface AdminFields {
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | undefined;
  topic: string;
  gujaratiTranslation: string;
  approvedTranslation: string;
  assigneeUid: string | undefined;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Initialize Sutra client
const sutra = new OpenAI({
  baseURL: 'https://api.two.ai/v2',
  apiKey: process.env.NEXT_PUBLIC_SUTRA_API_KEY,
  dangerouslyAllowBrowser: true
});

// Translation functions for each provider
const translateWithOpenAI = async (text: string): Promise<string> => {
  const response = await openai.chat.completions.create({
    model: "o4-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional English to Gujarati translator. Translate the following text to Gujarati. Provide only the translated text without any explanations."
      },
      {
        role: "user",
        content: text
      }
    ],
  });

  return response.choices[0].message.content || '';
};

const translateWithSutra = async (text: string): Promise<string> => {
  const response = await sutra.chat.completions.create({
    model: 'sutra-v2',
    messages: [
      {
        role: "system",
        content: "You are a professional English to Gujarati translator. Translate the following text to Gujarati. Provide only the translated text without any explanations."
      },
      {
        role: "user",
        content: text
      }
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.choices[0].message.content || '';
};

interface CardDetailsModalProps {
  card: Card | null;
  user?: User;
  assignee?: User;
  board?: Board;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCard: Card) => void;
}

export function CardDetailsModal({ 
  card, 
  user, 
  assignee,
  board, 
  isOpen, 
  onClose, 
  onSave 
}: CardDetailsModalProps) {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [translationStatuses, setTranslationStatuses] = useState<TranslationStatus[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [adminFields, setAdminFields] = useState<AdminFields>({
    priority: undefined,
    topic: '',
    gujaratiTranslation: '',
    approvedTranslation: '',
    assigneeUid: undefined
  });

  // Use edit lock hook
  const editLock = useEditLock(card || {} as Card, board?.id || '');

  const isAdmin = currentUser?.role === 'Admin';
  const isEditor = currentUser?.role === 'Editor';
  const baseCanEdit = isAdmin || (isEditor && card?.assigneeUid === currentUser.uid);
  const canEdit = baseCanEdit && editLock.canEdit();
  const canAssign = isAdmin || isEditor; // Both Admin and Editor can assign
  const showApprovedTranslation = card?.column === 'translate_gujarati' || card?.column === 'checking_gujarati';
  const canEditTranslation = showApprovedTranslation && card?.column !== 'print';

  const isPrintColumn = card?.column === 'print';

  // Fetch eligible users (Admin and Editor only) for assignment
  useEffect(() => {
    const fetchEligibleUsers = async () => {
      if (!canAssign) return;
      
      setLoadingUsers(true);
      try {
        const usersQuery = query(
          collection(firestore, 'users'),
          where('role', 'in', ['Admin', 'Editor'])
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        
        setAvailableUsers(usersData);
      } catch (error) {
        console.error('Error fetching eligible users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOpen) {
      fetchEligibleUsers();
    }
  }, [isOpen, canAssign]);

  // Initialize admin fields and custom fields when card changes
  useEffect(() => {
    if (card) {
      setAdminFields({
        priority: (card.metadata?.priority as AdminFields['priority']) || undefined,
        topic: String(card.metadata?.topic || ''),
        gujaratiTranslation: String(card.metadata?.gujaratiTranslation || ''),
        approvedTranslation: String(card.metadata?.approvedTranslation || ''),
        assigneeUid: card.assigneeUid || undefined
      });
      
      // Initialize custom field values
      setCustomFieldValues(card.customFields || {});
    }
  }, [card]);

  if (!card) return null;

  const formData = card.metadata?.formData || {};

  const handleSave = async () => {
    if (!card) return;

    // Create a clean metadata object, removing undefined values
    const metadata: Record<string, any> = {
      ...card.metadata,
      topic: adminFields.topic || '',  // Convert undefined to empty string
      gujaratiTranslation: adminFields.gujaratiTranslation || '',  // Convert undefined to empty string
      approvedTranslation: adminFields.approvedTranslation || '',  // Convert undefined to empty string
      formData: card.metadata?.formData || {}  // Preserve existing formData
    };

    // Only add priority if it's set
    if (adminFields.priority) {
      metadata.priority = adminFields.priority;
    } else {
      // Remove priority field if it exists and is not set
      delete metadata.priority;
    }

    // Create base card object with custom fields
    const updatedCard: Card = {
      ...card,
      metadata,
      customFields: customFieldValues,
      updatedAt: new Date().toISOString()
    };

    // Only add assigneeUid if it has a value, otherwise remove it entirely
    if (adminFields.assigneeUid) {
      updatedCard.assigneeUid = adminFields.assigneeUid;
    } else {
      // Remove assigneeUid field entirely if it's undefined/null
      delete updatedCard.assigneeUid;
    }

    onSave(updatedCard);
    setIsEditing(false);
    
    // Release the edit lock
    await editLock.releaseLock();
  };

  const handleTranslate = async () => {
    if (!card?.metadata?.formData?.english_question) return;
    
    const providers: TranslationProvider[] = ['genkit', 'openai', 'sutra'];
    
    // Initialize all providers as queued
    setTranslationStatuses(providers.map(provider => ({
      provider,
      status: 'queued'
    })));

    // Process each provider
    for (const provider of providers) {
      setTranslationStatuses(prev => 
        prev.map(status => 
          status.provider === provider 
            ? { ...status, status: 'in_progress' }
            : status
        )
      );

      try {
        let translation: string;
        const englishText = card.metadata.formData.english_question;

        switch (provider) {
          case 'genkit':
            const genkitResult = await suggestGujaratiTranslation({ englishText });
            translation = genkitResult.gujaratiText;
            break;
          case 'openai':
            translation = await translateWithOpenAI(englishText);
            break;
          case 'sutra':
            translation = await translateWithSutra(englishText);
            break;
          default:
            throw new Error('Invalid translation provider');
        }

        setTranslationStatuses(prev => 
          prev.map(status => 
            status.provider === provider 
              ? { ...status, status: 'completed', translation }
              : status
          )
        );
      } catch (error) {
        console.error(`Translation failed for ${provider}:`, error);
        setTranslationStatuses(prev => 
          prev.map(status => 
            status.provider === provider 
              ? { 
                  ...status, 
                  status: 'error', 
                  error: error instanceof Error ? error.message : 'Translation failed'
                }
              : status
          )
        );
      }
    }
  };

  const handleUseTranslation = (translation: string) => {
    setAdminFields(prev => ({ 
      ...prev, 
      gujaratiTranslation: translation 
    }));
  };

  const handleApproveTranslation = () => {
    setAdminFields(prev => ({ 
      ...prev, 
      approvedTranslation: prev.gujaratiTranslation 
    }));
  };

  const handleCancel = async () => {
    // Reset to original values
    setAdminFields({
      priority: (card?.metadata?.priority as AdminFields['priority']) || undefined,
      topic: String(card?.metadata?.topic || ''),
      gujaratiTranslation: String(card?.metadata?.gujaratiTranslation || ''),
      approvedTranslation: String(card?.metadata?.approvedTranslation || ''),
      assigneeUid: card?.assigneeUid || undefined
    });
    
    // Reset custom fields to original values
    setCustomFieldValues(card?.customFields || {});
    
    setIsEditing(false);
    
    // Release the edit lock
    await editLock.releaseLock();
  };

  const handleStartEditing = async () => {
    if (!baseCanEdit) return;
    
    // Try to acquire edit lock
    const lockAcquired = await editLock.acquireLock();
    
    if (lockAcquired) {
      setIsEditing(true);
    }
    // If lock acquisition fails, the hook will update the lock state
    // and the UI will show the appropriate message
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-500 text-white';
      case 'High': return 'bg-orange-500 text-white';
      case 'Medium': return 'bg-yellow-500 text-white';
      case 'Low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getColumnColor = (column: string) => {
    switch (column) {
      case 'translate_gujarati': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checking_gujarati': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'print': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getColumnTitle = (column: string) => {
    switch (column) {
      case 'online_submitted': return 'Online Submitted';
      case 'translate_gujarati': return 'Translate Gujarati';
      case 'checking_gujarati': return 'Checking Gujarati';
      case 'print': return 'Print';
      case 'done': return 'Done';
      default: return column;
    }
  };

  // Find the currently assigned user
  const currentAssignee = adminFields.assigneeUid 
    ? availableUsers.find(u => u.uid === adminFields.assigneeUid) || assignee
    : assignee;

  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={false}>
      <SheetContent className="w-[800px] sm:w-[900px] p-0 overflow-hidden border-l shadow-lg" style={{ position: 'fixed', right: 0, height: '100vh' }}>
        <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl font-headline font-bold text-foreground mb-2">
                {card.title}
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn('border', getColumnColor(card.column))}>
                  {getColumnTitle(card.column)}
                </Badge>
                {adminFields.priority && (
                  <Badge className={getPriorityColor(adminFields.priority)}>
                    <Flag className="h-3 w-3 mr-1" />
                    {adminFields.priority}
                  </Badge>
                )}
                {adminFields.topic && String(adminFields.topic).trim() && (
                  <Badge variant="outline">
                    <Tag className="h-3 w-3 mr-1" />
                    {String(adminFields.topic)}
                  </Badge>
                )}
              </div>
            </div>
            {isPrintColumn && card && (
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => window.open(`/print/${card.id}`, '_blank')}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Print View
                </Button>
              </div>
            )}
            {baseCanEdit && (
              <div className="flex items-center gap-2 ml-4">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave} className="h-8">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleStartEditing} 
                    disabled={editLock.isAcquiring || !editLock.canEdit()}
                    className="h-8"
                  >
                    {editLock.isAcquiring ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Edit3 className="h-4 w-4 mr-1" />
                    )}
                    {editLock.isAcquiring ? 'Acquiring...' : 'Edit'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Edit Lock Status */}
            {editLock.isLocked && editLock.lockedByUser && (
              <Alert className="border-orange-200 bg-orange-50">
                <Lock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={editLock.lockedByUser.avatarUrl} alt={editLock.lockedByUser.name} />
                      <AvatarFallback className="text-xs">
                        {editLock.lockedByUser.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      <strong>{editLock.lockedByUser.name}</strong> is currently editing this card
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 gap-4 pl-7">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  {formData.email && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formData.email || 'Not provided'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Telephone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.telephone || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 gap-4 pl-7">
                <div className="col-span-2 space-y-2">
                  
                  <Label className="text-sm font-medium text-muted-foreground">First Name</Label>
                  {formData.firstname && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formData.firstname || 'Not provided'}</span>
                    
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Last Name</Label>
                  {formData.lastname && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  <div className="flex items-center gap-2">
                    <span>{formData.lastname || 'Not provided'}</span>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Age</Label>
                  <div className="flex items-center gap-2">
                    <span>{formData.age || 'Not provided'}</span>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Gender</Label>
                  <div className="flex items-center gap-2">
                    <span>{formData.gender || 'Not provided'}</span>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    <span>{formData.status || 'Not provided'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">City</Label>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.city || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Spiritual Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Spiritual Information
              </h3>
              <div className="pl-7">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Gnan Vidhi Year</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.gnan_vidhi_year || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Question and Translation Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Question & Translation
              </h3>
              <div className="pl-7">
                {/* English Question */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">English Question</Label>
                  <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {card?.metadata?.formData?.english_question || 'No question provided'}
                    </p>
                  </div>
                </div>

                {/* Working Translation */}
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-muted-foreground">Gujarati Translation (Working)</Label>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleTranslate}
                            disabled={translationStatuses.some(s => s.status === 'in_progress')}
                            className="h-8"
                          >
                            <Wand2 className="h-3 w-3 mr-1" />
                            {translationStatuses.some(s => s.status === 'in_progress') 
                              ? 'Translating...' 
                              : 'Suggest with AI'}
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Translation Providers Status */}
                  {translationStatuses.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {translationStatuses.map((status) => (
                        <div 
                          key={status.provider} 
                          className={cn(
                            "p-4 rounded-lg border",
                            status.status === 'completed' ? "bg-green-50 border-green-200" :
                            status.status === 'error' ? "bg-red-50 border-red-200" :
                            status.status === 'in_progress' ? "bg-blue-50 border-blue-200" :
                            "bg-gray-50 border-gray-200"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{status.provider}</span>
                              <Badge variant="secondary" className="text-xs">
                                {status.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {status.translation && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUseTranslation(status.translation!)}
                                className="h-7"
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Use this
                              </Button>
                            )}
                          </div>
                          {status.translation && (
                            <p className="text-sm whitespace-pre-wrap">{status.translation}</p>
                          )}
                          {status.error && (
                            <p className="text-sm text-red-600">{status.error}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Working Translation Input/Display */}
                  {isEditing && canEdit ? (
                    <Textarea
                      value={adminFields.gujaratiTranslation}
                      onChange={(e) => setAdminFields(prev => ({ ...prev, gujaratiTranslation: e.target.value }))}
                      placeholder="Enter Gujarati translation here..."
                      className="min-h-[100px]"
                    />
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {adminFields.gujaratiTranslation || 'No translation provided'}
                      </p>
                    </div>
                  )}

                  {/* Approve Translation Button */}
                  {showApprovedTranslation && isEditing && (
                    <Button
                      size="sm"
                      onClick={handleApproveTranslation}
                      className="mt-2"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve Translation
                    </Button>
                  )}
                </div>

                {/* Approved Translation */}
                {showApprovedTranslation && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Approved Translation
                      {card?.column === 'print' && (
                        <Badge variant="secondary" className="ml-2">Locked</Badge>
                      )}
                      {card?.column === 'checking_gujarati' && isEditing && canEditTranslation && (
                        <Badge variant="outline" className="ml-2">
                          <span className="mr-1">🔤</span>
                          Gujarati Transliteration Enabled
                        </Badge>
                      )}
                    </Label>
                    {isEditing && canEditTranslation ? (
                      card?.column === 'checking_gujarati' ? (
                        // Use ReactTransliterate for Checking Gujarati column
                        <div className="min-h-[100px] relative">
                          <ReactTransliterate
                            value={adminFields.approvedTranslation}
                            onChangeText={(text) => setAdminFields(prev => ({ ...prev, approvedTranslation: text }))}
                            lang="gu"
                            renderComponent={(props) => (
                              <Textarea
                                {...props}
                                placeholder="Type in English to get Gujarati transliteration suggestions, or type directly in Gujarati..."
                                className="min-h-[100px]"
                              />
                            )}
                            maxOptions={5}
                            showCurrentWordAsLastSuggestion={true}
                            containerClassName="relative"
                            activeItemStyles={{
                              backgroundColor: 'hsl(var(--accent))',
                              color: 'hsl(var(--accent-foreground))'
                            }}
                          />
                          <div className="absolute top-2 right-2 text-xs text-muted-foreground">
                            Type in English for Gujarati suggestions
                          </div>
                        </div>
                      ) : (
                        // Regular textarea for other columns
                        <Textarea
                          value={adminFields.approvedTranslation}
                          onChange={(e) => setAdminFields(prev => ({ ...prev, approvedTranslation: e.target.value }))}
                          placeholder="Enter approved Gujarati translation here..."
                          className="min-h-[100px]"
                        />
                      )
                    ) : (
                      <div className="p-4 bg-muted/50 rounded-lg border">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {adminFields.approvedTranslation || 'No approved translation yet'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Remarks */}
            {formData.remarks && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Additional Remarks
                  </h3>
                  <div className="pl-7">
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {formData.remarks}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Admin Fields */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                  <Flag className="h-5 w-5 text-primary" />
                  Admin Fields
                </h3>
                {!canEdit && (
                  <Badge variant="outline" className="text-xs">
                    {!canAssign ? 'View Only' : 'Assignment Only'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 pl-7">
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium text-muted-foreground">
                    Priority
                  </Label>
                  {isEditing && isAdmin ? (
                    <Select
                      value={adminFields.priority || undefined}
                      onValueChange={(value) => setAdminFields(prev => ({ ...prev, priority: value as AdminFields['priority'] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md bg-muted/50">
                      {adminFields.priority ? (
                        <Badge className={getPriorityColor(adminFields.priority)}>
                          <Flag className="h-3 w-3 mr-1" />
                          {adminFields.priority}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No priority set</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic" className="text-sm font-medium text-muted-foreground">
                    Topic
                  </Label>
                  {isEditing && isAdmin ? (
                    <Input
                      id="topic"
                      value={adminFields.topic}
                      onChange={(e) => setAdminFields(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="Enter topic or category"
                    />
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md bg-muted/50">
                      {adminFields.topic ? (
                        <>
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span>{adminFields.topic}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No topic set</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Assignment Field */}
                <div className="space-y-2">
                  <Label htmlFor="assignee" className="text-sm font-medium text-muted-foreground">
                    Assign To
                  </Label>
                  {isEditing && canAssign ? (
                    <Select
                      value={adminFields.assigneeUid || "unassigned"}
                      onValueChange={(value) => setAdminFields(prev => ({ 
                        ...prev, 
                        assigneeUid: value === "unassigned" ? undefined : value 
                      }))}
                      disabled={loadingUsers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select assignee"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <div className="flex items-center gap-2">
                            <UserMinus className="h-4 w-4 text-muted-foreground" />
                            <span>Unassigned</span>
                          </div>
                        </SelectItem>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.uid} value={user.uid}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                                <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                              </Avatar>
                              <span>{user.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {user.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md bg-muted/50">
                      {currentAssignee ? (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={currentAssignee.avatarUrl} alt={currentAssignee.name} />
                            <AvatarFallback className="text-xs">{getInitials(currentAssignee.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{currentAssignee.name}</span>
                          <Badge variant="outline" className="text-xs">{currentAssignee.role}</Badge>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <UserMinus className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Unassigned</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Custom Fields Section */}
            {board?.customFieldDefinitions && board.customFieldDefinitions.length > 0 && (
              <>
                <div className="space-y-4">
                  <CustomFieldsEditor
                    fieldDefinitions={board.customFieldDefinitions}
                    values={customFieldValues}
                    onChange={setCustomFieldValues}
                    disabled={!isEditing || !canEdit}
                  />
                </div>

                <Separator />
              </>
            )}

            {/* Assignment and Metadata */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                Assignment & Metadata
              </h4>
              <div className="grid grid-cols-1 gap-4 pl-7">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                  <div className="flex items-center gap-2">
                    {currentAssignee ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={currentAssignee.avatarUrl} alt={currentAssignee.name} />
                          <AvatarFallback className="text-xs">{getInitials(currentAssignee.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{currentAssignee.name}</span>
                        <Badge variant="outline" className="text-xs">{currentAssignee.role}</Badge>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                  <div className="flex items-center gap-2">
                    {user ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback className="text-xs">{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.name}</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Google Forms</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Timeline
              </h4>
              <div className="grid grid-cols-1 gap-4 pl-7">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDistanceToNow(new Date(card.updatedAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
} 