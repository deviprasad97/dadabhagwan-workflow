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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Search,
  Plus,
  FileText,
  Users,
  Crown,
  Edit3,
  Eye,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Settings,
  Trash2,
  Clock,
  BarChart3,
  Calendar
} from 'lucide-react';
import { formService, boardService, userService, templateService } from '@/lib/firestore';
import type { Form, Board, User, FormTemplate, FormField } from '@/lib/types';

export default function FormsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [filteredForms, setFilteredForms] = useState<Form[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [boardFilter, setBoardFilter] = useState<string>('all');
  const [loadingForms, setLoadingForms] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
    boardId: undefined as string | undefined,
    templateId: undefined as string | undefined,
    useTemplate: false
  });

  // Fetch forms, boards, and users
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoadingForms(true);
        const [userForms, userBoards, allUsers] = await Promise.all([
          formService.getUserForms(user.uid, user.role),
          boardService.getUserBoards(user.uid, user.role),
          userService.getAllUsers()
        ]);
        
        // Get or create Q&A templates
        console.log('Fetching Q&A templates...');
        let qaTemplates = await templateService.getQATemplates();
        console.log('Initial Q&A templates found:', qaTemplates.length);
        
        if (qaTemplates.length === 0) {
          console.log('No Q&A templates found, creating default templates...');
          try {
            await templateService.createDefaultTemplates(user.uid);
            console.log('Default templates created successfully');
            qaTemplates = await templateService.getQATemplates();
            console.log('After creation - Q&A templates found:', qaTemplates.length);
          } catch (templateError) {
            console.error('Error creating default templates:', templateError);
            // Continue with empty templates array
          }
        } else {
          // Check if templates have the new DadaBhagwan naming structure
          const hasDadaBhagwanTemplates = qaTemplates.some(t => t.name.includes('DadaBhagwan'));
          if (!hasDadaBhagwanTemplates) {
            console.log('Old template structure detected, resetting to DadaBhagwan templates...');
            try {
              await templateService.resetDefaultTemplates(user.uid);
              console.log('Templates reset successfully');
              qaTemplates = await templateService.getQATemplates();
              console.log('After reset - Q&A templates found:', qaTemplates.length);
            } catch (templateError) {
              console.error('Error resetting templates:', templateError);
              // Continue with existing templates
            }
          }
        }
        
        setForms(userForms);
        setBoards(userBoards);
        setUsers(allUsers);
        setTemplates(qaTemplates);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load forms'
        });
      } finally {
        setLoadingForms(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter forms based on search and filters
  useEffect(() => {
    let filtered = forms;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(form => 
        form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(form => form.status === statusFilter);
    }

    // Board filter
    if (boardFilter !== 'all') {
      if (boardFilter === 'unassigned') {
        filtered = filtered.filter(form => !form.boardId);
      } else {
        filtered = filtered.filter(form => form.boardId === boardFilter);
      }
    }

    setFilteredForms(filtered);
  }, [forms, searchQuery, statusFilter, boardFilter]);

  const handleCreateForm = async () => {
    if (!user || !createFormData.title.trim()) return;

    console.log('Creating form with data:', createFormData);
    console.log('Available templates:', templates.length);

    try {
      let formFields: FormField[] = [];
      let templateId: string | undefined = undefined;

      // If using a template, load template fields
      if (createFormData.useTemplate && createFormData.templateId) {
        console.log('Using template:', createFormData.templateId);
        const template = templates.find(t => t.id === createFormData.templateId);
        if (template) {
          console.log('Template found:', template.name, 'with', template.fields.length, 'fields');
          formFields = template.fields;
          templateId = template.id;
        } else {
          console.log('Template not found!');
        }
      } else {
        console.log('Not using template or no template selected');
      }

      const formData = {
        title: createFormData.title.trim(),
        description: createFormData.description.trim(),
        templateId,
        boardId: createFormData.boardId,
        fields: formFields,
        settings: {
          allowMultipleSubmissions: false,
          requireSignIn: false,
          showProgressBar: true,
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
        },
        status: 'draft' as const,
        creatorUid: user.uid,
        sharedWith: [],
      };

      console.log('Final form data to be sent:', formData);
      const formId = await formService.createForm(formData);
      console.log('Form created with ID:', formId);

      // Navigate to form builder
      router.push(`/forms/${formId}/build`);
      
      toast({
        title: 'Form Created',
        description: `Form "${createFormData.title}" has been created successfully.`
      });
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create form'
      });
    }
  };

  const handleDuplicateForm = async (form: Form) => {
    if (!user) return;

    try {
      const newFormId = await formService.duplicateForm(
        form.id, 
        `${form.title} (Copy)`, 
        user.uid
      );

      // Refresh forms list
      const updatedForms = await formService.getUserForms(user.uid, user.role);
      setForms(updatedForms);

      toast({
        title: 'Form Duplicated',
        description: 'Form has been duplicated successfully.'
      });
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to duplicate form'
      });
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!user) return;

    try {
      await formService.deleteForm(formId);
      setForms(prev => prev.filter(f => f.id !== formId));
      
      toast({
        title: 'Form Deleted',
        description: 'Form has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete form'
      });
    }
  };

  const getFormCreator = (creatorUid: string) => {
    return users.find(u => u.uid === creatorUid);
  };

  const getBoardName = (boardId?: string) => {
    if (!boardId) return 'Unassigned';
    const board = boards.find(b => b.id === boardId);
    return board?.name || 'Unknown Board';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
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

  const canEditForm = (form: Form) => {
    return user?.role === 'Admin' || form.creatorUid === user?.uid || form.sharedWith.includes(user?.uid || '');
  };

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
        <p>Please sign in to access forms.</p>
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
              <h1 className="text-3xl font-bold text-foreground">Forms</h1>
              <p className="text-muted-foreground">
                Create and manage custom forms for your events
              </p>
            </div>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => setCreateFormData({ title: '', description: '', boardId: undefined, templateId: undefined, useTemplate: false })}
                >
                  <Plus className="h-4 w-4" />
                  Create Form
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Form</DialogTitle>
                  <DialogDescription>
                    Create a new form to collect submissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-title">Form Title *</Label>
                    <Input
                      id="form-title"
                      value={createFormData.title}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Event Registration Form"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-description">Description</Label>
                    <Textarea
                      id="form-description"
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the form"
                      rows={2}
                    />
                  </div>
                  {/* Template Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        id="use-template"
                        type="checkbox"
                        checked={createFormData.useTemplate}
                        onChange={(e) => setCreateFormData(prev => ({ 
                          ...prev, 
                          useTemplate: e.target.checked,
                          templateId: e.target.checked ? prev.templateId : undefined,
                          boardId: e.target.checked ? prev.boardId : undefined // Clear board selection when unchecking template
                        }))}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <Label htmlFor="use-template" className="text-sm font-medium">
                        Start with Q&A Template
                      </Label>
                    </div>
                    {createFormData.useTemplate && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="form-template">Choose Template</Label>
                          <Select
                            value={createFormData.templateId || ""}
                            onValueChange={(value) => setCreateFormData(prev => ({ ...prev, templateId: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a Q&A template" />
                            </SelectTrigger>
                            <SelectContent>
                               {templates.length === 0 ? (
                                 <SelectItem value="no-templates" disabled>
                                   No templates available
                                 </SelectItem>
                               ) : (
                                 templates.map((template) => (
                                   <SelectItem key={template.id} value={template.id}>
                                     <div className="flex flex-col">
                                       <span className="font-medium">{template.name}</span>
                                       {template.description && (
                                         <span className="text-xs text-muted-foreground">{template.description}</span>
                                       )}
                                     </div>
                                   </SelectItem>
                                 ))
                               )}
                             </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Board Assignment - Only visible when using template */}
                        <div className="space-y-2">
                          <Label htmlFor="form-board">Assign to Board (Optional)</Label>
                          <Select
                            value={createFormData.boardId || ""}
                            onValueChange={(value) => setCreateFormData(prev => ({ ...prev, boardId: value === "no-board" ? undefined : value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a board" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no-board">No Board</SelectItem>
                              {boards.map((board) => (
                                <SelectItem key={board.id} value={board.id}>
                                  {board.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Q&A templates can be integrated with boards to automatically create cards from form responses.
                          </p>
                        </div>
                        
                        {createFormData.templateId && (
                          <p className="text-xs text-muted-foreground">
                            This template includes pre-configured fields that work with board integration.
                            {createFormData.boardId && " Form responses will automatically create cards in your selected board."}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateFormData({ title: '', description: '', boardId: undefined, templateId: undefined, useTemplate: false });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateForm}
                    disabled={!createFormData.title.trim()}
                  >
                    Create & Build Form
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
                placeholder="Search forms by title or description..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={boardFilter} onValueChange={setBoardFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boards</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {boards.map(board => board.id && (
                    <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Forms Grid */}
          {loadingForms ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || boardFilter !== 'all' 
                  ? 'No forms match your search criteria.' 
                  : 'No forms found. Create your first form to get started.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredForms.map((form) => {
                const creator = getFormCreator(form.creatorUid);
                return (
                  <Card 
                    key={form.id} 
                    className="hover:shadow-lg transition-shadow duration-200"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold line-clamp-1 cursor-pointer hover:text-primary"
                            onClick={() => router.push(`/forms/${form.id}/build`)}
                          >
                            {form.title}
                          </CardTitle>
                          {form.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {form.description}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/forms/${form.id}/build`)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit Form
                            </DropdownMenuItem>
                            {form.status === 'published' && (
                              <DropdownMenuItem onClick={() => window.open(`/forms/${form.id}`, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Public Form
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => router.push(`/forms/${form.id}/responses`)}>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Responses ({form.submissionCount || 0})
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateForm(form)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {canEditForm(form) && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteForm(form.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Status and Board */}
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getStatusColor(form.status)}`}>
                          {form.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getBoardName(form.boardId)}
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Fields</div>
                          <div className="font-medium">{form.fields.length}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Responses</div>
                          <div className="font-medium">{form.submissionCount || 0}</div>
                        </div>
                      </div>

                      {/* Creator and Updated */}
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
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(form.updatedAt).toLocaleDateString()}</span>
                        </div>
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