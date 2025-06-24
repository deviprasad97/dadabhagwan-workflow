'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Loader2,
  Star,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { formService } from '@/lib/firestore';
import type { Form, FormField, FormSubmission } from '@/lib/types';

interface FormResponse {
  [fieldId: string]: any;
}

interface ValidationError {
  fieldId: string;
  message: string;
}

export default function PublicFormPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [responses, setResponses] = useState<FormResponse>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const formId = params.formId as string;

  // Load public form
  useEffect(() => {
    const loadForm = async () => {
      try {
        setLoading(true);
        const formData = await formService.getPublicForm(formId);
        
        if (!formData) {
          toast({
            variant: 'destructive',
            title: 'Form Not Available',
            description: 'This form is not published or no longer accepting responses.'
          });
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
      } finally {
        setLoading(false);
      }
    };

    if (formId) {
      loadForm();
    }
  }, [formId]);

  // Validate field response
  const validateField = (field: FormField, value: any): string | null => {
    const validation = field.validation;
    if (!validation) return null;

    // Required field check
    if (validation.required) {
      if (value === undefined || value === null || value === '') {
        return `${field.label} is required`;
      }
      
      // Special case for checkbox arrays
      if (field.type === 'checkbox' && Array.isArray(value) && value.length === 0) {
        return `Please select at least one option for ${field.label}`;
      }
    }

    // Skip other validations if field is empty and not required
    if (!value || value === '') return null;

    // String length validations
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `${field.label} must be no more than ${validation.maxLength} characters`;
      }
    }

    // Number validations
    if (field.type === 'number' && typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `${field.label} must be no more than ${validation.max}`;
      }
    }

    // Email validation
    if (field.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `Please enter a valid email address for ${field.label}`;
      }
    }

    // URL validation
    if (field.type === 'url' && typeof value === 'string') {
      try {
        new URL(value);
      } catch {
        return `Please enter a valid URL for ${field.label}`;
      }
    }

    return null;
  };

  // Validate all responses
  const validateForm = (): ValidationError[] => {
    if (!form) return [];

    const newErrors: ValidationError[] = [];
    
    form.fields.forEach(field => {
      if (field.type === 'section_header') return; // Skip section headers
      
      const error = validateField(field, responses[field.id]);
      if (error) {
        newErrors.push({ fieldId: field.id, message: error });
      }
    });

    return newErrors;
  };

  // Handle field value change
  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear field error if it exists
    setErrors(prev => prev.filter(error => error.fieldId !== fieldId));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fix the errors and try again.'
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Get submitter info from browser
      const submitterInfo = {
        userAgent: navigator.userAgent,
        ip: '', // This would be set server-side
      };

      // Submit form
      await formService.submitForm({
        formId: form.id,
        boardId: form.boardId,
        responses,
        submitterInfo,
      });

      setSubmitted(true);
      
      toast({
        title: 'Submission Successful',
        description: form.settings.successMessage || 'Thank you for your submission!'
      });

      // Redirect if specified
      if (form.settings.redirectUrl) {
        setTimeout(() => {
          window.location.href = form.settings.redirectUrl!;
        }, 2000);
      }

    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'There was an error submitting your response. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Render form field based on type
  const renderField = (field: FormField) => {
    const value = responses[field.id];
    const error = errors.find(e => e.fieldId === field.id);

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
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
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
              min={field.validation?.min}
              max={field.validation?.max}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
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
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={field.id}
                type="date"
                value={value || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className={`pl-10 ${error ? 'border-destructive' : ''}`}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
          </div>
        );

      case 'time':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.validation?.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={field.id}
                type="time"
                value={value || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                className={`pl-10 ${error ? 'border-destructive' : ''}`}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
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
              <SelectTrigger className={error ? 'border-destructive' : ''}>
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
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
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
              className={error ? 'border border-destructive rounded p-2' : ''}
            >
              {field.options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.value} id={`${field.id}-${option.id}`} />
                  <Label htmlFor={`${field.id}-${option.id}`}>{option.label}</Label>
                </div>
              ))}
            </RadioGroup>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
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
            <div className={`space-y-2 ${error ? 'border border-destructive rounded p-2' : ''}`}>
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
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
            )}
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
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error.message}
              </p>
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
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading form...</span>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Form Not Available</h2>
            <p className="text-muted-foreground">
              This form is not published or no longer accepting responses.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              {form.settings.successMessage || 'Your response has been submitted successfully.'}
            </p>
            {form.settings.redirectUrl && (
              <p className="text-sm text-muted-foreground mt-4">
                Redirecting you in a moment...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <CardTitle className="text-2xl font-bold">{form.title}</CardTitle>
            {form.description && (
              <p className="text-muted-foreground mt-2">{form.description}</p>
            )}
            {form.settings.showProgressBar && form.fields.length > 1 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>Progress</span>
                  <span>{Math.round(((Object.keys(responses).length) / form.fields.filter(f => f.type !== 'section_header').length) * 100)}%</span>
                </div>
                <Progress 
                  value={(Object.keys(responses).length / form.fields.filter(f => f.type !== 'section_header').length) * 100} 
                  className="h-2"
                />
              </div>
            )}
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 py-6">
              {form.fields.map((field, index) => (
                <div key={field.id}>
                  {renderField(field)}
                </div>
              ))}
            </CardContent>
            
            <div className="border-t px-6 py-4">
              <Button 
                type="submit" 
                disabled={submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  form.settings.submitButtonText || 'Submit'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
} 