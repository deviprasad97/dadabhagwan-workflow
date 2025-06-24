'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus,
  Trash2,
  GripVertical,
  Type,
  Settings,
  CheckCircle,
  X
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FormField, FormFieldOption } from '@/lib/types';

interface FormFieldEditorProps {
  field: FormField | null;
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

interface SortableOptionItemProps {
  option: FormFieldOption;
  onUpdate: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

function SortableOptionItem({ option, onUpdate, onDelete }: SortableOptionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border rounded bg-background"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        value={option.label}
        onChange={(e) => onUpdate(option.id, e.target.value)}
        placeholder="Option label"
        className="flex-1"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(option.id)}
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FormFieldEditor({ field, onUpdate, onClose }: FormFieldEditorProps) {
  const [localField, setLocalField] = useState<FormField | null>(field);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  if (!field || !localField) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Settings className="h-8 w-8 mx-auto mb-2" />
            <p>Select a field to edit its properties</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const updateLocalField = (updates: Partial<FormField>) => {
    const updatedField = { ...localField, ...updates };
    setLocalField(updatedField);
    onUpdate(updates);
  };

  const handleValidationChange = (key: string, value: any) => {
    updateLocalField({
      validation: {
        ...localField.validation,
        [key]: value,
      },
    });
  };

  const handleSettingsChange = (key: string, value: any) => {
    updateLocalField({
      settings: {
        ...localField.settings,
        [key]: value,
      },
    });
  };

  const handleScaleChange = (key: string, value: any) => {
    const currentScale = localField.settings?.scale || { min: 1, max: 5 };
    updateLocalField({
      settings: {
        ...localField.settings,
        scale: {
          ...currentScale,
          [key]: value,
        },
      },
    });
  };

  const handleScaleLabelsChange = (key: string, value: string) => {
    const currentScale = localField.settings?.scale || { min: 1, max: 5 };
    const currentLabels = currentScale.labels || { min: '', max: '' };
    updateLocalField({
      settings: {
        ...localField.settings,
        scale: {
          ...currentScale,
          labels: {
            ...currentLabels,
            [key]: value,
          },
        },
      },
    });
  };

  const addOption = () => {
    const newOption: FormFieldOption = {
      id: Date.now().toString(),
      label: `Option ${(localField.options?.length || 0) + 1}`,
      value: `option_${(localField.options?.length || 0) + 1}`,
    };
    updateLocalField({
      options: [...(localField.options || []), newOption],
    });
  };

  const updateOption = (id: string, label: string) => {
    const updatedOptions = localField.options?.map(option =>
      option.id === id
        ? { ...option, label, value: label.toLowerCase().replace(/\s+/g, '_') }
        : option
    ) || [];
    updateLocalField({ options: updatedOptions });
  };

  const deleteOption = (id: string) => {
    const filteredOptions = localField.options?.filter(option => option.id !== id) || [];
    updateLocalField({ options: filteredOptions });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = localField.options?.findIndex(option => option.id === active.id) || 0;
      const newIndex = localField.options?.findIndex(option => option.id === over.id) || 0;
      
      const reorderedOptions = arrayMove(localField.options || [], oldIndex, newIndex);
      updateLocalField({ options: reorderedOptions });
    }
  };

  const needsOptions = ['select', 'radio', 'checkbox'].includes(localField.type);
  const needsScale = localField.type === 'rating';

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Field Settings</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 overflow-y-auto">
        {/* Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <h3 className="font-medium">Basic Information</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="field-label">Field Label *</Label>
              <Input
                id="field-label"
                value={localField.label}
                onChange={(e) => updateLocalField({ label: e.target.value })}
                placeholder="Enter field label"
              />
            </div>
            
            <div>
              <Label htmlFor="field-description">Description</Label>
              <Textarea
                id="field-description"
                value={localField.description || ''}
                onChange={(e) => updateLocalField({ description: e.target.value })}
                placeholder="Optional description or help text"
                rows={2}
              />
            </div>
            
            {localField.type !== 'section_header' && (
              <div>
                <Label htmlFor="field-placeholder">Placeholder</Label>
                <Input
                  id="field-placeholder"
                  value={localField.placeholder || ''}
                  onChange={(e) => updateLocalField({ placeholder: e.target.value })}
                  placeholder="Placeholder text for the field"
                />
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Validation Rules */}
        {localField.type !== 'section_header' && (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <h3 className="font-medium">Validation</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="required">Required field</Label>
                  <Switch
                    id="required"
                    checked={localField.validation?.required || false}
                    onCheckedChange={(checked) => handleValidationChange('required', checked)}
                  />
                </div>
                
                {['text', 'textarea', 'email', 'phone', 'url'].includes(localField.type) && (
                  <>
                    <div>
                      <Label htmlFor="min-length">Minimum length</Label>
                      <Input
                        id="min-length"
                        type="number"
                        value={localField.validation?.minLength || ''}
                        onChange={(e) => handleValidationChange('minLength', parseInt(e.target.value) || undefined)}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="max-length">Maximum length</Label>
                      <Input
                        id="max-length"
                        type="number"
                        value={localField.validation?.maxLength || ''}
                        onChange={(e) => handleValidationChange('maxLength', parseInt(e.target.value) || undefined)}
                        placeholder="No limit"
                        min="1"
                      />
                    </div>
                  </>
                )}
                
                {localField.type === 'number' && (
                  <>
                    <div>
                      <Label htmlFor="min-value">Minimum value</Label>
                      <Input
                        id="min-value"
                        type="number"
                        value={localField.validation?.min || ''}
                        onChange={(e) => handleValidationChange('min', parseFloat(e.target.value) || undefined)}
                        placeholder="No minimum"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="max-value">Maximum value</Label>
                      <Input
                        id="max-value"
                        type="number"
                        value={localField.validation?.max || ''}
                        onChange={(e) => handleValidationChange('max', parseFloat(e.target.value) || undefined)}
                        placeholder="No maximum"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <Separator />
          </>
        )}

        {/* Options for select, radio, checkbox */}
        {needsOptions && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Options</h3>
                <Button onClick={addOption} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localField.options?.map(o => o.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {localField.options?.map((option) => (
                      <SortableOptionItem
                        key={option.id}
                        option={option}
                        onUpdate={updateOption}
                        onDelete={deleteOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              
              {!localField.options?.length && (
                <div className="text-center text-muted-foreground py-4 border-2 border-dashed rounded">
                  No options yet. Add some options above.
                </div>
              )}
              
              {localField.type === 'checkbox' && (
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow-other">Allow "Other" option</Label>
                    <Switch
                      id="allow-other"
                      checked={localField.settings?.allowOther || false}
                      onCheckedChange={(checked) => handleSettingsChange('allowOther', checked)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
          </>
        )}

        {/* Rating Scale Settings */}
        {needsScale && (
          <>
            <div className="space-y-4">
              <h3 className="font-medium">Rating Scale</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="scale-min">Minimum</Label>
                  <Input
                    id="scale-min"
                    type="number"
                    value={localField.settings?.scale?.min || 1}
                    onChange={(e) => handleScaleChange('min', parseInt(e.target.value) || 1)}
                    min="0"
                    max="10"
                  />
                </div>
                
                <div>
                  <Label htmlFor="scale-max">Maximum</Label>
                  <Input
                    id="scale-max"
                    type="number"
                    value={localField.settings?.scale?.max || 5}
                    onChange={(e) => handleScaleChange('max', parseInt(e.target.value) || 5)}
                    min="2"
                    max="10"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="scale-min-label">Low end label</Label>
                  <Input
                    id="scale-min-label"
                    value={localField.settings?.scale?.labels?.min || ''}
                    onChange={(e) => handleScaleLabelsChange('min', e.target.value)}
                    placeholder="e.g., Poor"
                  />
                </div>
                
                <div>
                  <Label htmlFor="scale-max-label">High end label</Label>
                  <Input
                    id="scale-max-label"
                    value={localField.settings?.scale?.labels?.max || ''}
                    onChange={(e) => handleScaleLabelsChange('max', e.target.value)}
                    placeholder="e.g., Excellent"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
          </>
        )}

        {/* Field Type Badge */}
        <div className="flex items-center justify-center pt-4">
          <Badge variant="secondary" className="capitalize">
            {localField.type.replace('_', ' ')} Field
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
} 