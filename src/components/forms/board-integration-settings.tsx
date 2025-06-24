'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Link2,
  Settings,
  CheckCircle,
  AlertCircle,
  Unlink,
  RotateCcw,
  Save
} from 'lucide-react';
import { boardService, boardIntegrationService } from '@/lib/firestore';
import type { Form, Board, BoardIntegration, FormField, ColumnId } from '@/lib/types';

interface BoardIntegrationSettingsProps {
  form: Form;
  onFormUpdate: (updates: Partial<Form>) => void;
}

export function BoardIntegrationSettings({ form, onFormUpdate }: BoardIntegrationSettingsProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsData, setSettingsData] = useState<BoardIntegration>({
    enabled: false,
    boardId: '',
    autoCreateCards: true,
    defaultColumn: 'online_submitted',
    fieldMapping: {
      titleField: '',
      contentField: '',
      priorityField: '',
      categoryField: '',
    },
    cardTemplate: {
      titlePrefix: '',
      contentFormat: '{content}\n\nPriority: {priority}\nCategory: {category}',
      defaultPriority: 'Medium',
      defaultAssignee: '',
    },
  });

  // Load boards and current integration settings
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        // Get all boards - for admin access we'll use a workaround
        const userBoards = await boardService.getUserBoards('admin', 'Admin');
        setBoards(userBoards);
      } catch (error) {
        console.error('Error fetching boards:', error);
        // Set empty array on error to prevent UI issues
        setBoards([]);
      }
    };

    fetchBoards();

    // Initialize settings from form data
    if (form.boardIntegration) {
      setSettingsData(form.boardIntegration);
    } else if (form.boardId) {
      // Migrate from old boardId to new integration
      setSettingsData(prev => ({
        ...prev,
        enabled: true,
        boardId: form.boardId!,
      }));
    }
  }, [form]);

  // Get available fields for mapping
  const getFieldsByType = (types: string[]): FormField[] => {
    return form.fields.filter(field => types.includes(field.type));
  };

  const handleSaveIntegration = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (settingsData.enabled) {
        if (!settingsData.boardId) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please select a board' });
          setLoading(false);
          return;
        }
        if (!settingsData.fieldMapping.titleField || !settingsData.fieldMapping.contentField) {
          toast({ variant: 'destructive', title: 'Error', description: 'Title and content field mapping are required' });
          setLoading(false);
          return;
        }
      }

      // Update form with integration settings
      const updates: Partial<Form> = {
        boardId: settingsData.enabled ? settingsData.boardId : undefined,
        boardIntegration: settingsData.enabled ? settingsData : undefined,
      };

      // Save to Firestore
      if (settingsData.enabled) {
        await boardIntegrationService.associateFormWithBoard(form.id, settingsData.boardId, settingsData);
      }

      onFormUpdate(updates);
      setShowSettings(false);

      toast({
        title: 'Integration Updated',
        description: settingsData.enabled 
          ? 'Board integration has been configured successfully.'
          : 'Board integration has been disabled.'
      });
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save integration settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPendingSubmissions = async () => {
    if (!form.boardIntegration?.enabled) return;

    setLoading(true);
    try {
      const processedCount = await boardIntegrationService.processPendingSubmissions(form.id);
      toast({
        title: 'Submissions Processed',
        description: `${processedCount} pending submissions have been converted to cards.`
      });
    } catch (error) {
      console.error('Error processing submissions:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to process submissions' });
    } finally {
      setLoading(false);
    }
  };

  const selectedBoard = boards.find(b => b.id === (form.boardIntegration?.boardId || form.boardId));
  const isIntegrationEnabled = form.boardIntegration?.enabled || !!form.boardId;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Board Integration
            </CardTitle>
            <CardDescription>
              Connect this form to a Kanban board to automatically create cards from submissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isIntegrationEnabled ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isIntegrationEnabled && selectedBoard && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="font-medium">{selectedBoard.name}</div>
              <div className="text-sm text-muted-foreground">
                {form.boardIntegration?.autoCreateCards ? 'Auto-creating cards from new submissions' : 'Manual card creation only'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleProcessPendingSubmissions}
                disabled={loading}
                title="Convert existing form submissions to board cards"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Process Pending
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button 
                variant={isIntegrationEnabled ? 'outline' : 'default'} 
                className="flex-1"
                title={isIntegrationEnabled ? 'Modify board integration settings' : 'Connect this form to a Kanban board'}
              >
                <Settings className="h-4 w-4 mr-2" />
                {isIntegrationEnabled ? 'Configure Integration' : 'Setup Integration'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Board Integration Settings</DialogTitle>
                <DialogDescription>
                  Configure how form submissions are converted to board cards
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Enable Integration */}
                <div className="flex items-center space-x-2">
                  <input
                    id="enable-integration"
                    type="checkbox"
                    checked={settingsData.enabled}
                    onChange={(e) => setSettingsData(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <Label htmlFor="enable-integration" className="text-sm font-medium">
                    Enable board integration
                  </Label>
                </div>

                {settingsData.enabled && (
                  <>
                    {/* Board Selection */}
                    <div className="space-y-2">
                      <Label>Target Board *</Label>
                      <Select
                        value={settingsData.boardId}
                        onValueChange={(value) => setSettingsData(prev => ({ ...prev, boardId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a board" />
                        </SelectTrigger>
                        <SelectContent>
                          {boards.map((board) => (
                            <SelectItem key={board.id} value={board.id}>
                              {board.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Auto Create Cards */}
                    <div className="flex items-center space-x-2">
                      <input
                        id="auto-create"
                        type="checkbox"
                        checked={settingsData.autoCreateCards}
                        onChange={(e) => setSettingsData(prev => ({ ...prev, autoCreateCards: e.target.checked }))}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <Label htmlFor="auto-create" className="text-sm">
                        Automatically create cards from new submissions
                      </Label>
                    </div>

                    {/* Default Column */}
                    <div className="space-y-2">
                      <Label>Default Column</Label>
                      <Select
                        value={settingsData.defaultColumn}
                        onValueChange={(value) => setSettingsData(prev => ({ ...prev, defaultColumn: value as ColumnId }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online_submitted">Online Submitted</SelectItem>
                          <SelectItem value="translate_gujarati">Translate Gujarati</SelectItem>
                          <SelectItem value="checking_gujarati">Checking Gujarati</SelectItem>
                          <SelectItem value="print">Print</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Field Mapping */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Field Mapping</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Map form fields to card properties
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Card Title Field *</Label>
                          <Select
                            value={settingsData.fieldMapping.titleField}
                            onValueChange={(value) => setSettingsData(prev => ({
                              ...prev,
                              fieldMapping: { ...prev.fieldMapping, titleField: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFieldsByType(['text', 'textarea']).map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Card Content Field *</Label>
                          <Select
                            value={settingsData.fieldMapping.contentField}
                            onValueChange={(value) => setSettingsData(prev => ({
                              ...prev,
                              fieldMapping: { ...prev.fieldMapping, contentField: value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFieldsByType(['text', 'textarea']).map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Priority Field</Label>
                          <Select
                            value={settingsData.fieldMapping.priorityField || 'none'}
                            onValueChange={(value) => setSettingsData(prev => ({
                              ...prev,
                              fieldMapping: { ...prev.fieldMapping, priorityField: value === 'none' ? undefined : value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {getFieldsByType(['select', 'radio', 'rating']).map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Category Field</Label>
                          <Select
                            value={settingsData.fieldMapping.categoryField || 'none'}
                            onValueChange={(value) => setSettingsData(prev => ({
                              ...prev,
                              fieldMapping: { ...prev.fieldMapping, categoryField: value === 'none' ? undefined : value }
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {getFieldsByType(['select', 'radio', 'checkbox']).map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Card Template */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Card Template</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Customize how cards are created from submissions
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title Prefix</Label>
                          <Input
                            value={settingsData.cardTemplate?.titlePrefix || ''}
                            onChange={(e) => setSettingsData(prev => ({
                              ...prev,
                              cardTemplate: { ...prev.cardTemplate, titlePrefix: e.target.value }
                            }))}
                            placeholder="e.g., Q: "
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Default Priority</Label>
                          <Select
                            value={settingsData.cardTemplate?.defaultPriority || 'Medium'}
                            onValueChange={(value) => setSettingsData(prev => ({
                              ...prev,
                              cardTemplate: { ...prev.cardTemplate, defaultPriority: value as any }
                            }))}
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

                      <div className="space-y-2">
                        <Label>Content Format Template</Label>
                        <Textarea
                          value={settingsData.cardTemplate?.contentFormat || ''}
                          onChange={(e) => setSettingsData(prev => ({
                            ...prev,
                            cardTemplate: { ...prev.cardTemplate, contentFormat: e.target.value }
                          }))}
                          placeholder="Use {content}, {priority}, {category} as placeholders"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Available placeholders: {'{content}'}, {'{priority}'}, {'{category}'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveIntegration} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Integration
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isIntegrationEnabled && (
            <Button
              variant="outline"
              onClick={() => {
                onFormUpdate({ boardId: undefined, boardIntegration: undefined });
                setSettingsData(prev => ({ ...prev, enabled: false }));
                toast({ title: 'Integration Disabled', description: 'Board integration has been removed.' });
              }}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {/* Help text */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <div><strong>Setup/Configure Integration:</strong> Connect this form to a board and configure field mapping</div>
          <div><strong>Process Pending:</strong> Convert existing submissions (before integration) to board cards</div>
          <div><strong>Disconnect:</strong> Remove board integration while keeping existing cards</div>
        </div>
      </CardContent>
    </Card>
  );
} 