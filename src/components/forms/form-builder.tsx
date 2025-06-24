'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Type,
  AlignLeft,
  Mail,
  Hash,
  Phone,
  Calendar,
  Clock,
  Link,
  Star,
  CheckSquare,
  Circle,
  ChevronDown,
  Heading1
} from 'lucide-react';
import { FormFieldEditor } from './form-field-editor';
import { SortableFormField } from './sortable-form-field';
import { BoardIntegrationSettings } from './board-integration-settings';
import type { Form, FormField, FormFieldType } from '@/lib/types';
import { generateId } from '@/lib/utils';

interface FormBuilderProps {
  form: Form;
  onFormUpdate: (form: Form) => void;
  onSave: (form: Form) => void;
}

// Field type definitions with icons and labels
const FIELD_TYPES: Array<{
  type: FormFieldType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  { type: 'text', label: 'Short Text', icon: Type, description: 'Single line text input' },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft, description: 'Multi-line text area' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Email address input' },
  { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input' },
  { type: 'phone', label: 'Phone', icon: Phone, description: 'Phone number input' },
  { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { type: 'time', label: 'Time', icon: Clock, description: 'Time picker' },
  { type: 'url', label: 'URL', icon: Link, description: 'Website URL input' },
  { type: 'rating', label: 'Rating', icon: Star, description: 'Star rating scale' },
  { type: 'select', label: 'Dropdown', icon: ChevronDown, description: 'Single choice dropdown' },
  { type: 'radio', label: 'Multiple Choice', icon: Circle, description: 'Radio button options' },
  { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare, description: 'Multiple selection checkboxes' },
  { type: 'section_header', label: 'Section Header', icon: Heading1, description: 'Section divider with title' },
];

export function FormBuilder({ form, onFormUpdate, onSave }: FormBuilderProps) {
  const [activeField, setActiveField] = useState<FormField | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState(form.title);
  const [formDescription, setFormDescription] = useState(form.description || '');

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Create a new field
  const createField = useCallback((type: FormFieldType): FormField => {
    const baseField: FormField = {
      id: generateId(),
      type,
      label: getDefaultLabel(type),
      order: form.fields.length,
      validation: { required: false },
    };

    // Add type-specific defaults
    switch (type) {
      case 'select':
      case 'radio':
      case 'checkbox':
        baseField.options = [
          { id: generateId(), label: 'Option 1', value: 'option1' },
          { id: generateId(), label: 'Option 2', value: 'option2' },
        ];
        break;
      case 'rating':
        baseField.settings = {
          scale: { min: 1, max: 5, labels: { min: 'Poor', max: 'Excellent' } }
        };
        break;
      case 'section_header':
        baseField.label = 'Section Title';
        baseField.description = 'Add a description for this section';
        break;
    }

    return baseField;
  }, [form.fields.length]);

  // Get default label for field type
  const getDefaultLabel = (type: FormFieldType): string => {
    const fieldType = FIELD_TYPES.find(ft => ft.type === type);
    return fieldType ? `Untitled ${fieldType.label}` : 'Untitled Field';
  };

  // Add a new field
  const addField = (type: FormFieldType) => {
    const newField = createField(type);
    const updatedForm = {
      ...form,
      fields: [...form.fields, newField],
    };
    onFormUpdate(updatedForm);
    setEditingField(newField.id);
  };

  // Update form title/description
  const updateFormInfo = () => {
    if (formTitle !== form.title || formDescription !== form.description) {
      onFormUpdate({
        ...form,
        title: formTitle,
        description: formDescription,
      });
    }
  };

  // Update a field
  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const updatedFields = form.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    );
    onFormUpdate({
      ...form,
      fields: updatedFields,
    });
  };

  // Delete a field
  const deleteField = (fieldId: string) => {
    const updatedFields = form.fields
      .filter(field => field.id !== fieldId)
      .map((field, index) => ({ ...field, order: index }));
    
    onFormUpdate({
      ...form,
      fields: updatedFields,
    });
    
    if (editingField === fieldId) {
      setEditingField(null);
    }
  };

  // Duplicate a field
  const duplicateField = (fieldId: string) => {
    const fieldToDuplicate = form.fields.find(f => f.id === fieldId);
    if (!fieldToDuplicate) return;

    const duplicatedField: FormField = {
      ...fieldToDuplicate,
      id: generateId(),
      label: `${fieldToDuplicate.label} (Copy)`,
      order: form.fields.length,
      options: fieldToDuplicate.options?.map(opt => ({
        ...opt,
        id: generateId(),
      })),
    };

    onFormUpdate({
      ...form,
      fields: [...form.fields, duplicatedField],
    });
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const field = form.fields.find(f => f.id === active.id);
    setActiveField(field || null);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveField(null);

    if (!over || active.id === over.id) return;

    const oldIndex = form.fields.findIndex(f => f.id === active.id);
    const newIndex = form.fields.findIndex(f => f.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedFields = arrayMove(form.fields, oldIndex, newIndex)
        .map((field, index) => ({ ...field, order: index }));

      onFormUpdate({
        ...form,
        fields: reorderedFields,
      });
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar - Field Types */}
      <div className="w-80 border-r bg-card p-4 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-3">Add Fields</h3>
            <div className="grid gap-2">
              {FIELD_TYPES.map((fieldType) => {
                const Icon = fieldType.icon;
                return (
                  <Button
                    key={fieldType.type}
                    variant="outline"
                    className="justify-start h-auto p-3"
                    onClick={() => addField(fieldType.type)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <div className="font-medium">{fieldType.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {fieldType.description}
                        </div>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Form Builder */}
      <div className="flex-1 flex">
        {/* Form Preview/Builder */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Form Header */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  onBlur={updateFormInfo}
                  className="text-2xl font-bold border-none p-0 h-auto bg-transparent focus-visible:ring-0"
                  placeholder="Form Title"
                />
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  onBlur={updateFormInfo}
                  placeholder="Form description (optional)"
                  className="border-none p-0 resize-none bg-transparent focus-visible:ring-0"
                  rows={2}
                />
              </CardHeader>
            </Card>

            {/* Board Integration Settings */}
            <BoardIntegrationSettings 
              form={form} 
              onFormUpdate={(updates) => onFormUpdate({ ...form, ...updates })} 
            />

            {/* Form Fields */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={form.fields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                                <div className="space-y-4">
                  {form.fields.map((field) => (
                    <SortableFormField
                      key={field.id}
                      field={field}
                      isEditing={editingField === field.id}
                      onEdit={() => setEditingField(field.id)}
                      onUpdate={(updates) => updateField(field.id, updates)}
                      onDelete={() => deleteField(field.id)}
                      onDuplicate={() => duplicateField(field.id)}
                      onStopEditing={() => setEditingField(null)}
                    />
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeField ? (
                  <Card className="opacity-90 rotate-2 shadow-lg">
                    <CardContent className="p-4">
                      <div className="font-medium">{activeField.label}</div>
                      <Badge variant="secondary" className="mt-2">
                        {FIELD_TYPES.find(ft => ft.type === activeField.type)?.label}
                      </Badge>
                    </CardContent>
                  </Card>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Empty State */}
            {form.fields.length === 0 && (
              <Card className="border-dashed border-2 p-12 text-center">
                <div className="space-y-3">
                  <Plus className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="font-semibold">No fields yet</h3>
                    <p className="text-muted-foreground">
                      Add fields from the sidebar to start building your form
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

                {/* Right Sidebar - Field Editor */}
        {editingField && (
          <div className="w-96 border-l bg-card overflow-hidden">
            <FormFieldEditor
              field={form.fields.find(f => f.id === editingField) || null}
              onUpdate={(updates) => updateField(editingField, updates)}
              onClose={() => setEditingField(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
} 