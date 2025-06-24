'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/header';
import { FormBuilder } from '@/components/forms/form-builder';
import { BoardIntegrationSettings } from '@/components/forms/board-integration-settings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Save,
  Eye,
  Share2,
  Settings,
  Loader2
} from 'lucide-react';
import { formService } from '@/lib/firestore';
import type { Form } from '@/lib/types';

export default function FormBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const formId = params.formId as string;

  // Load form data
  useEffect(() => {
    if (!user || !formId) return;

    const loadForm = async () => {
      try {
        setLoading(true);
        const formData = await formService.getForm(formId);
        
        if (!formData) {
          toast({
            variant: 'destructive',
            title: 'Form Not Found',
            description: 'The requested form could not be found.'
          });
          router.push('/forms');
          return;
        }

        // Check if user has access
        const hasAccess = await formService.hasFormAccess(formId, user.uid, user.role);
        if (!hasAccess) {
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to edit this form.'
          });
          router.push('/forms');
          return;
        }

        setForm(formData);
      } catch (error) {
        console.error('Error loading form:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load form'
        });
        router.push('/forms');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [user, formId, router]);

  const handleSaveForm = async (updatedForm: Form) => {
    if (!form) return;

    try {
      setSaving(true);
      await formService.updateForm(form.id, {
        title: updatedForm.title,
        description: updatedForm.description,
        templateId: updatedForm.templateId,
        boardId: updatedForm.boardId,
        boardIntegration: updatedForm.boardIntegration,
        fields: updatedForm.fields,
        settings: updatedForm.settings,
      });

      setForm(updatedForm);
      setHasUnsavedChanges(false);
      
      toast({
        title: 'Form Saved',
        description: 'Your changes have been saved successfully.'
      });
    } catch (error) {
      console.error('Error saving form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save form'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFormUpdate = (updates: Partial<Form>) => {
    if (!form) return;
    
    const updatedForm = { ...form, ...updates };
    setForm(updatedForm);
    setHasUnsavedChanges(true);
  };

  const handlePublishForm = async () => {
    if (!form) return;

    try {
      if (form.status === 'published') {
        await formService.unpublishForm(form.id);
        setForm(prev => prev ? { ...prev, status: 'draft' } : null);
        
        toast({
          title: 'Form Unpublished',
          description: 'Your form is no longer accepting submissions.'
        });
      } else {
        await formService.publishForm(form.id);
        setForm(prev => prev ? { ...prev, status: 'published' } : null);
        
        toast({
          title: 'Form Published',
          description: 'Your form is now live and accepting submissions.'
        });
      }
    } catch (error) {
      console.error('Error publishing/unpublishing form:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update form status'
      });
    }
  };

  const handleViewPublicForm = () => {
    if (form) {
      window.open(`/forms/${form.id}`, '_blank');
    }
  };

  const handlePreviewForm = () => {
    if (form) {
      window.open(`/forms/${form.id}/preview`, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading form builder...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Please sign in to access the form builder.</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Form not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Form Builder Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/forms')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Forms
              </Button>
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="text-xl font-semibold">{form.title}</h1>
                  {form.description && (
                    <p className="text-sm text-muted-foreground">{form.description}</p>
                  )}
                </div>
                <Badge className={`text-xs ${getStatusColor(form.status)}`}>
                  {form.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviewForm}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              
              {form.status === 'published' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewPublicForm}
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  View Public
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/forms/${form.id}/responses`)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Responses ({form.submissionCount || 0})
              </Button>
              
              <Button
                size="sm"
                onClick={handlePublishForm}
                className={`flex items-center gap-2 ${
                  form.status === 'published' 
                    ? 'bg-amber-600 hover:bg-amber-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <Share2 className="h-4 w-4" />
                {form.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>
              
              <Button
                size="sm"
                onClick={() => handleSaveForm(form)}
                disabled={saving || !hasUnsavedChanges}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Builder */}
      <main className="flex-1 overflow-hidden">
        <FormBuilder
          form={form}
          onFormUpdate={(updatedForm) => {
            setForm(updatedForm);
            setHasUnsavedChanges(true);
          }}
          onSave={handleSaveForm}
        />
      </main>
    </div>
  );
} 