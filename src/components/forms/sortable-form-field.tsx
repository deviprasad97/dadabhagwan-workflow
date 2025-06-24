'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  GripVertical,
  Edit3,
  Copy,
  Trash2,
  Star,
  Calendar,
  Clock,
  Phone,
  Mail,
  Hash,
  Type,
  AlignLeft,
  Link,
  ChevronDown,
  CheckSquare,
  Circle,
  Heading1
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { FormField } from '@/lib/types';

interface SortableFormFieldProps {
  field: FormField;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<FormField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStopEditing: () => void;
}

export function SortableFormField({
  field,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onStopEditing,
}: SortableFormFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Render field preview based on type
  const renderFieldPreview = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Input
            placeholder={field.placeholder || `Enter ${field.type === 'email' ? 'email' : field.type === 'phone' ? 'phone number' : field.type === 'url' ? 'URL' : 'text'}`}
            disabled
            className="bg-muted"
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder || "Enter number"}
            disabled
            className="bg-muted"
          />
        );
      
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder || "Enter your response"}
            disabled
            className="bg-muted resize-none"
            rows={3}
          />
        );
      
      case 'date':
        return (
          <div className="flex items-center gap-2 p-2 border rounded bg-muted">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Select date</span>
          </div>
        );
      
      case 'time':
        return (
          <div className="flex items-center gap-2 p-2 border rounded bg-muted">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Select time</span>
          </div>
        );
      
      case 'select':
        return (
          <div className="flex items-center justify-between p-2 border rounded bg-muted">
            <span className="text-muted-foreground">Choose an option</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.slice(0, 3).map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{option.label}</span>
              </div>
            ))}
            {(field.options?.length || 0) > 3 && (
              <div className="text-xs text-muted-foreground">
                +{(field.options?.length || 0) - 3} more options
              </div>
            )}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.slice(0, 3).map((option, index) => (
              <div key={option.id} className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{option.label}</span>
              </div>
            ))}
            {(field.options?.length || 0) > 3 && (
              <div className="text-xs text-muted-foreground">
                +{(field.options?.length || 0) - 3} more options
              </div>
            )}
          </div>
        );
      
      case 'rating':
        return (
          <div className="flex items-center gap-1">
            {Array.from({ length: field.settings?.scale?.max || 5 }).map((_, index) => (
              <Star key={index} className="h-5 w-5 text-muted-foreground" />
            ))}
            {field.settings?.scale?.labels && (
              <div className="ml-4 text-xs text-muted-foreground">
                {field.settings.scale.labels.min} - {field.settings.scale.labels.max}
              </div>
            )}
          </div>
        );
      
      case 'section_header':
        return (
          <div className="space-y-2">
            <div className="text-lg font-semibold text-muted-foreground">
              {field.label}
            </div>
            {field.description && (
              <div className="text-sm text-muted-foreground">
                {field.description}
              </div>
            )}
            <hr className="border-t border-muted-foreground/20" />
          </div>
        );
      
      default:
        return (
          <div className="text-muted-foreground text-sm">
            Unknown field type: {field.type}
          </div>
        );
    }
  };

  // Get field type icon
  const getFieldIcon = () => {
    switch (field.type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'textarea': return <AlignLeft className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'number': return <Hash className="h-4 w-4" />;
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'date': return <Calendar className="h-4 w-4" />;
      case 'time': return <Clock className="h-4 w-4" />;
      case 'url': return <Link className="h-4 w-4" />;
      case 'rating': return <Star className="h-4 w-4" />;
      case 'select': return <ChevronDown className="h-4 w-4" />;
      case 'radio': return <Circle className="h-4 w-4" />;
      case 'checkbox': return <CheckSquare className="h-4 w-4" />;
      case 'section_header': return <Heading1 className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`
        transition-all duration-200
        ${isDragging ? 'opacity-50 scale-105 rotate-1 shadow-lg' : ''}
        ${isEditing ? 'ring-2 ring-primary' : ''}
        hover:shadow-md
      `}
    >
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Field Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {/* Drag Handle */}
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing mt-1 p-1 rounded hover:bg-muted transition-colors"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              
              {/* Field Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getFieldIcon()}
                  <h4 className="font-medium">{field.label}</h4>
                  {field.validation?.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </div>
                
                {field.description && (
                  <p className="text-sm text-muted-foreground">{field.description}</p>
                )}
              </div>
            </div>
            
            {/* Field Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Edit3 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Field
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Field Preview */}
          <div className="pl-7">
            {renderFieldPreview()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 