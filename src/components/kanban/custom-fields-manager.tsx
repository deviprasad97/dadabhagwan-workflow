'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Settings,
  Edit3,
  Trash2,
  Save,
  X,
  GripVertical,
  Type,
  Hash,
  Calendar,
  Link,
  Mail,
  Phone,
  List,
  CheckSquare,
  FileText,
  Layers
} from 'lucide-react';
import type { CustomFieldDefinition, CustomFieldType, Board } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CustomFieldsManagerProps {
  board: Board;
  onUpdateBoard: (updatedBoard: Board) => void;
}

interface FieldFormData {
  name: string;
  type: CustomFieldType;
  description: string;
  required: boolean;
  options: string[];
  defaultValue: string;
  validation: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

const fieldTypeIcons: Record<CustomFieldType, any> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  date: Calendar,
  select: List,
  multiselect: Layers,
  checkbox: CheckSquare,
  url: Link,
  email: Mail,
  phone: Phone,
};

const fieldTypeLabels: Record<CustomFieldType, string> = {
  text: 'Text',
  textarea: 'Long Text',
  number: 'Number',
  date: 'Date',
  select: 'Dropdown',
  multiselect: 'Multi-Select',
  checkbox: 'Checkbox',
  url: 'URL',
  email: 'Email',
  phone: 'Phone',
};

// Memoized Sortable Field Item
const SortableFieldItem = React.memo(({ 
  field, 
  onEdit, 
  onDelete 
}: { 
  field: CustomFieldDefinition; 
  onEdit: (field: CustomFieldDefinition) => void; 
  onDelete: (id: string) => void; 
}) => {
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
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = fieldTypeIcons[field.type];

  const handleEdit = useCallback(() => {
    onEdit(field);
  }, [field, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(field.id);
  }, [field.id, onDelete]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-background"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Field Icon */}
      <div className="flex-shrink-0">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Field Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{field.name}</span>
          <Badge variant="outline" className="text-xs">
            {fieldTypeLabels[field.type]}
          </Badge>
          {field.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
        </div>
        {field.description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {field.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-8 w-8 p-0"
        >
          <Edit3 className="h-3 w-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Custom Field</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the field "{field.name}"? This will remove all data in this field from existing cards. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
});

SortableFieldItem.displayName = 'SortableFieldItem';

export const CustomFieldsManager = React.memo(({ board, onUpdateBoard }: CustomFieldsManagerProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [formData, setFormData] = useState<FieldFormData>({
    name: '',
    type: 'text',
    description: '',
    required: false,
    options: [],
    defaultValue: '',
    validation: {},
  });

  const canManageFields = user?.role === 'Admin' || user?.role === 'Editor';
  const fields = board.customFieldDefinitions || [];

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 1 } }));

  // Memoized sorted fields
  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.order - b.order);
  }, [fields]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      type: 'text',
      description: '',
      required: false,
      options: [],
      defaultValue: '',
      validation: {},
    });
    setEditingField(null);
  }, []);

  const handleOpenFieldDialog = useCallback((field?: CustomFieldDefinition) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        type: field.type,
        description: field.description || '',
        required: field.required || false,
        options: field.options || [],
        defaultValue: field.defaultValue || '',
        validation: field.validation || {},
      });
    } else {
      resetForm();
    }
    setIsFieldDialogOpen(true);
  }, [resetForm]);

  const handleSaveField = useCallback(() => {
    if (!formData.name.trim()) return;

    const fieldId = editingField?.id || `field_${Date.now()}`;
    const fieldData: CustomFieldDefinition = {
      id: fieldId,
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description.trim() || undefined,
      required: formData.required,
      options: ['select', 'multiselect'].includes(formData.type) ? formData.options.filter(o => o.trim()) : undefined,
      defaultValue: formData.defaultValue || undefined,
      validation: Object.keys(formData.validation).length > 0 ? formData.validation : undefined,
      order: editingField?.order || fields.length,
      createdAt: editingField?.createdAt || new Date().toISOString(),
      createdBy: editingField?.createdBy || user?.uid || '',
    };

    let updatedFields;
    if (editingField) {
      updatedFields = fields.map(f => f.id === fieldId ? fieldData : f);
    } else {
      updatedFields = [...fields, fieldData];
    }

    const updatedBoard: Board = {
      ...board,
      customFieldDefinitions: updatedFields,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBoard(updatedBoard);
    setIsFieldDialogOpen(false);
    resetForm();
  }, [formData, editingField, fields, board, onUpdateBoard, user?.uid, resetForm]);

  const handleDeleteField = useCallback((fieldId: string) => {
    const updatedFields = fields.filter(f => f.id !== fieldId);
    const updatedBoard: Board = {
      ...board,
      customFieldDefinitions: updatedFields,
      updatedAt: new Date().toISOString(),
    };
    onUpdateBoard(updatedBoard);
  }, [fields, board, onUpdateBoard]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = sortedFields.findIndex(f => f.id === active.id);
    const newIndex = sortedFields.findIndex(f => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newFields = [...sortedFields];
    const [movedField] = newFields.splice(oldIndex, 1);
    newFields.splice(newIndex, 0, movedField);

    // Update order values
    const updatedFields = newFields.map((field, index) => ({
      ...field,
      order: index,
    }));

    const updatedBoard: Board = {
      ...board,
      customFieldDefinitions: updatedFields,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBoard(updatedBoard);
  }, [sortedFields, board, onUpdateBoard]);

  const handleAddOption = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  }, []);

  const handleUpdateOption = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt),
    }));
  }, []);

  const handleRemoveOption = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  }, []);

  if (!canManageFields) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Custom Fields ({fields.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Manage Custom Fields</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">
              Add custom fields to capture additional information on cards
            </p>
            <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenFieldDialog()} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Field
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingField ? 'Edit' : 'Add'} Custom Field</DialogTitle>
                  <DialogDescription>
                    {editingField ? 'Update the field configuration' : 'Create a new custom field for cards'}
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 px-1">
                    {/* Field Name */}
                    <div className="space-y-2">
                      <Label htmlFor="field-name">Field Name *</Label>
                      <Input
                        id="field-name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Priority, Category, Due Date"
                      />
                    </div>

                    {/* Field Type */}
                    <div className="space-y-2">
                      <Label htmlFor="field-type">Field Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: CustomFieldType) => setFormData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(fieldTypeLabels).map(([type, label]) => {
                            const Icon = fieldTypeIcons[type as CustomFieldType];
                            return (
                              <SelectItem key={type} value={type}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="field-description">Description</Label>
                      <Textarea
                        id="field-description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Optional description for this field"
                        className="resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Required Toggle */}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="field-required"
                        checked={formData.required}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: checked }))}
                      />
                      <Label htmlFor="field-required">Required field</Label>
                    </div>

                    {/* Options for select/multiselect */}
                    {['select', 'multiselect'].includes(formData.type) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Options</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddOption}
                            className="h-7"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {formData.options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => handleUpdateOption(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOption(index)}
                                className="h-8 w-8 p-0 text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Default Value */}
                    {!['checkbox'].includes(formData.type) && (
                      <div className="space-y-2">
                        <Label htmlFor="field-default">Default Value</Label>
                        <Input
                          id="field-default"
                          value={formData.defaultValue}
                          onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
                          placeholder="Optional default value"
                        />
                      </div>
                    )}

                    {/* Validation */}
                    {['text', 'textarea', 'number'].includes(formData.type) && (
                      <div className="space-y-2">
                        <Label>Validation</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {formData.type === 'number' ? (
                            <>
                              <div>
                                <Label htmlFor="field-min" className="text-xs">Min Value</Label>
                                <Input
                                  id="field-min"
                                  type="number"
                                  value={formData.validation.min || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    validation: { ...prev.validation, min: e.target.value ? Number(e.target.value) : undefined }
                                  }))}
                                  placeholder="Min"
                                />
                              </div>
                              <div>
                                <Label htmlFor="field-max" className="text-xs">Max Value</Label>
                                <Input
                                  id="field-max"
                                  type="number"
                                  value={formData.validation.max || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    validation: { ...prev.validation, max: e.target.value ? Number(e.target.value) : undefined }
                                  }))}
                                  placeholder="Max"
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <Label htmlFor="field-min-length" className="text-xs">Min Length</Label>
                                <Input
                                  id="field-min-length"
                                  type="number"
                                  value={formData.validation.min || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    validation: { ...prev.validation, min: e.target.value ? Number(e.target.value) : undefined }
                                  }))}
                                  placeholder="Min"
                                />
                              </div>
                              <div>
                                <Label htmlFor="field-max-length" className="text-xs">Max Length</Label>
                                <Input
                                  id="field-max-length"
                                  type="number"
                                  value={formData.validation.max || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    validation: { ...prev.validation, max: e.target.value ? Number(e.target.value) : undefined }
                                  }))}
                                  placeholder="Max"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveField} disabled={!formData.name.trim()}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingField ? 'Update' : 'Create'} Field
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Separator />

          <ScrollArea className="flex-1 py-4">
            {sortedFields.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-4">
                  <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No custom fields yet</p>
                  <p className="text-sm">Add your first custom field to get started</p>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedFields.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {sortedFields.map((field) => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        onEdit={handleOpenFieldDialog}
                        onDelete={handleDeleteField}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
});

CustomFieldsManager.displayName = 'CustomFieldsManager'; 