'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import type { CustomFieldDefinition, CustomFieldType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CustomFieldRendererProps {
  field: CustomFieldDefinition;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  className?: string;
}

interface CustomFieldsEditorProps {
  fieldDefinitions: CustomFieldDefinition[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  disabled?: boolean;
}

// Individual field renderer
export const CustomFieldRenderer = React.memo(({ 
  field, 
  value, 
  onChange, 
  disabled = false,
  className 
}: CustomFieldRendererProps) => {
  const [dateOpen, setDateOpen] = useState(false);

  const handleChange = useCallback((newValue: any) => {
    onChange(newValue);
  }, [onChange]);

  const validateValue = useCallback((val: any): boolean => {
    if (field.required && (!val || val === '')) {
      return false;
    }

    if (field.validation) {
      const { min, max, pattern } = field.validation;
      
      if (field.type === 'number') {
        const num = Number(val);
        if (min !== undefined && num < min) return false;
        if (max !== undefined && num > max) return false;
      } else if (field.type === 'text' || field.type === 'textarea') {
        const str = String(val || '');
        if (min !== undefined && str.length < min) return false;
        if (max !== undefined && str.length > max) return false;
        if (pattern && !new RegExp(pattern).test(str)) return false;
      }
    }

    return true;
  }, [field]);

  const isValid = useMemo(() => validateValue(value), [validateValue, value]);

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            className={cn(!isValid && 'border-destructive', className)}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            className={cn('resize-none', !isValid && 'border-destructive', className)}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : '')}
            disabled={disabled}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            className={cn(!isValid && 'border-destructive', className)}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            placeholder={field.description || 'Enter email address'}
            className={cn(!isValid && 'border-destructive', className)}
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            placeholder={field.description || 'Enter phone number'}
            className={cn(!isValid && 'border-destructive', className)}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            placeholder={field.description || 'Enter URL'}
            className={cn(!isValid && 'border-destructive', className)}
          />
        );

      case 'date':
        return (
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !value && 'text-muted-foreground',
                  !isValid && 'border-destructive',
                  className
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => {
                  handleChange(date ? date.toISOString().split('T')[0] : '');
                  setDateOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={handleChange}
            disabled={disabled}
          >
            <SelectTrigger className={cn(!isValid && 'border-destructive', className)}>
              <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        const selectedOptions = Array.isArray(value) ? value : [];
        return (
          <div className={cn('space-y-2', className)}>
            <Select
              onValueChange={(selectedOption) => {
                if (!selectedOptions.includes(selectedOption)) {
                  handleChange([...selectedOptions, selectedOption]);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className={cn(!isValid && 'border-destructive')}>
                <SelectValue placeholder={`Add ${field.name.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.filter(option => !selectedOptions.includes(option)).map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedOptions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedOptions.map((option) => (
                  <Badge key={option} variant="secondary" className="flex items-center gap-1">
                    {option}
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 w-3 h-3"
                        onClick={() => handleChange(selectedOptions.filter(o => o !== option))}
                      >
                        <X className="h-2 w-2" />
                      </Button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`field-${field.id}`}
              checked={!!value}
              onCheckedChange={handleChange}
              disabled={disabled}
              className={cn(!isValid && 'border-destructive')}
            />
            <Label htmlFor={`field-${field.id}`} className="text-sm">
              {field.description || field.name}
            </Label>
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={disabled}
            placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
            className={cn(!isValid && 'border-destructive', className)}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {field.type !== 'checkbox' && (
        <Label htmlFor={`field-${field.id}`} className="text-sm font-medium">
          {field.name}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {renderField()}
      {!isValid && field.validation?.message && (
        <p className="text-sm text-destructive">{field.validation.message}</p>
      )}
      {field.description && field.type !== 'checkbox' && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
    </div>
  );
});

CustomFieldRenderer.displayName = 'CustomFieldRenderer';

// Editor for multiple custom fields
export const CustomFieldsEditor = React.memo(({ 
  fieldDefinitions, 
  values, 
  onChange, 
  disabled = false 
}: CustomFieldsEditorProps) => {
  const sortedFields = useMemo(() => {
    return [...fieldDefinitions].sort((a, b) => a.order - b.order);
  }, [fieldDefinitions]);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    onChange({
      ...values,
      [fieldId]: value,
    });
  }, [values, onChange]);

  if (sortedFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Custom Fields</h4>
        <p className="text-xs text-muted-foreground">
          Additional information for this card
        </p>
      </div>
      
      <div className="space-y-4">
        {sortedFields.map((field) => (
          <CustomFieldRenderer
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(value) => handleFieldChange(field.id, value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
});

CustomFieldsEditor.displayName = 'CustomFieldsEditor'; 