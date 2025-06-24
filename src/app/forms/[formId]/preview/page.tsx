'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  Eye,
  AlertTriangle,
  Star,
  Calendar,
  Clock,
  Info
} from 'lucide-react';
import { formService } from '@/lib/firestore';
import type { Form, FormField } from '@/lib/types';

interface FormResponse {
  [fieldId: string]: any;
}

export default function FormPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<FormResponse>({});

  const formId = params.formId as string;

  // Load form
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
            description: 'You do not have permission to preview this form.'
          });
          router.push('/forms');
          return;
        }

        setForm(formData);
        
        // Initialize responses with default values
        const initialResponses: FormResponse = {};
        formData.fields.forEach(field => {
          if (field.defaultValue) {
            initialResponses[field.id] = field.defaultValue;
          }
        });
        setResponses(initialResponses);
        
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

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
  };

  // Handle form submission (preview only)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Preview Mode',
      description: 'This is a preview. No data will be submitted.'
    });
  };

  // Render form field based on type - simplified for preview
  const renderField = (field: FormField) => {
    const value = responses[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.id}
              type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Input
              id={field.id}
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value) || '')}
              placeholder={field.placeholder}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Textarea
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <Select
              value={value || ''}
              onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <RadioGroup
              value={value || ''}
              onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
            >
              {field.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.id}`} />
                  <Label htmlFor={`${field.id}-${option.id}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option.id}`}
                    checked={(value || []).includes(option.value)}
                    onCheckedChange={(checked) => {
                      const currentValues = value || [];
                      if (checked) {
                        handleFieldChange(field.id, [...currentValues, option.value]);
                      } else {
                        handleFieldChange(field.id, currentValues.filter((v: string) => v !== option.value));
                      }
                    }}
                  />
                  <Label htmlFor={`${field.id}-${option.id}`}>{option.label}</Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'rating':
        const scale = field.settings?.scale || { min: 1, max: 5 };
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <div className="flex items-center gap-2">
              {Array.from({ length: scale.max - scale.min + 1 }, (_, i) => {
                const rating = scale.min + i;
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => handleFieldChange(field.id, rating)}
                    className={`p-2 rounded transition-colors ${
                      value === rating
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        value >= rating ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            {scale.labels && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{scale.labels.min}</span>
                <span>{scale.labels.max}</span>
              </div>
            )}
          </div>
        );

      case 'section_header':
        return (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{field.label}</h3>
            {field.description && (
              <p className="text-muted-foreground">{field.description}</p>
            )}
            <Separator />
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground">
            Field type "{field.type}" preview not implemented
          </div>
        );
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 animate-pulse" />
          <span>Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!user || !form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Form not found or access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Preview Header */}
        <div className="mb-6">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Preview Mode:</strong> This is how your form will appear to users. No data will be submitted.
            </AlertDescription>
          </Alert>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/forms/${formId}/build`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Editor
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline">Preview Mode</Badge>
            <Badge className={form.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              {form.status}
            </Badge>
          </div>
        </div>

        {/* Form Preview */}
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <CardTitle className="text-2xl font-bold">{form.title}</CardTitle>
            {form.description && (
              <p className="text-muted-foreground mt-2">{form.description}</p>
            )}
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 py-6">
              {form.fields.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Fields Added</h3>
                  <p className="text-muted-foreground">
                    Add some fields to your form to see the preview.
                  </p>
                </div>
              ) : (
                form.fields.map((field, index) => (
                  <div key={field.id}>
                    {renderField(field)}
                  </div>
                ))
              )}
            </CardContent>
            
            {form.fields.length > 0 && (
              <div className="border-t px-6 py-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  size="lg"
                >
                  {form.settings.submitButtonText || 'Submit'}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  This is a preview - no data will be submitted
                </p>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
} 