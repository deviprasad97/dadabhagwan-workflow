"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Columns3, Plus, GripVertical, Edit, Trash2, Palette } from 'lucide-react';
import type { Board, ColumnDefinition, User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

interface ColumnManagerProps {
  board: Board;
  onUpdateBoard: (updatedBoard: Board) => void;
}

interface ColumnFormData {
  title: string;
  description: string;
  color: string;
  maxCards: string;
}

interface SortableColumnItemProps {
  column: ColumnDefinition;
  onEdit: (column: ColumnDefinition) => void;
  onDelete: (columnId: string) => void;
  canManage: boolean;
}

const SortableColumnItem = React.memo(({ column, onEdit, onDelete, canManage }: SortableColumnItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-card transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-primary ring-opacity-50 bg-accent' : 'hover:bg-accent/50'
      }`}
    >
      {canManage && (
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </div>
      )}
      
      <div className="flex items-center gap-2 flex-1">
        {column.color && (
          <div 
            className="w-3 h-3 rounded-full border"
            style={{ backgroundColor: column.color }}
          />
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{column.title}</span>
            {column.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
            {column.maxCards && (
              <Badge variant="outline" className="text-xs">
                Limit: {column.maxCards}
              </Badge>
            )}
          </div>
          {column.description && (
            <p className="text-sm text-muted-foreground mt-1">{column.description}</p>
          )}
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(column)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          {!column.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(column.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
SortableColumnItem.displayName = 'SortableColumnItem';

const defaultColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#374151'
];

export function ColumnManager({ board, onUpdateBoard }: ColumnManagerProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnDefinition | null>(null);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ColumnFormData>({
    title: '',
    description: '',
    color: defaultColors[0],
    maxCards: '',
  });

  // Check permissions
  const canManageColumns = useMemo(() => {
    if (!user) return false;
    return user.role === 'Admin' || 
           (user.role === 'Editor' && (board.creatorUid === user.uid || board.sharedWith.includes(user.uid)));
  }, [user, board]);

  // Get column definitions with defaults
  const columns = useMemo(() => {
    const defaultColumns: ColumnDefinition[] = [
      {
        id: 'live',
        title: 'Live',
        description: 'Questions that are currently live and being discussed',
        color: '#ef4444',
        order: 0,
        isDefault: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      },
      {
        id: 'online_submitted',
        title: 'Online Submitted',
        description: 'Questions submitted through online forms',
        color: '#06b6d4',
        order: 1,
        isDefault: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      },
      {
        id: 'translate_gujarati',
        title: 'Translate Gujarati',
        description: 'Questions being translated to Gujarati',
        color: '#eab308',
        order: 2,
        isDefault: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      },
      {
        id: 'checking_gujarati',
        title: 'Checking Gujarati',
        description: 'Gujarati translations being reviewed',
        color: '#f97316',
        order: 3,
        isDefault: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      },
      {
        id: 'print',
        title: 'Print',
        description: 'Questions ready for printing',
        color: '#8b5cf6',
        order: 4,
        isDefault: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      },
      {
        id: 'done',
        title: 'Done',
        description: 'Completed questions',
        color: '#22c55e',
        order: 5,
        isDefault: true,
        createdAt: new Date().toISOString(),
        createdBy: 'system',
      },
    ];

    if (!board.columnDefinitions || board.columnDefinitions.length === 0) {
      return defaultColumns;
    }

    return [...board.columnDefinitions].sort((a, b) => a.order - b.order);
  }, [board.columnDefinitions]);

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      color: defaultColors[0],
      maxCards: '',
    });
    setEditingColumn(null);
  }, []);

  const handleOpenColumnDialog = useCallback((column?: ColumnDefinition) => {
    if (column) {
      setEditingColumn(column);
      setFormData({
        title: column.title,
        description: column.description || '',
        color: column.color || defaultColors[0],
        maxCards: column.maxCards?.toString() || '',
      });
    } else {
      resetForm();
    }
    setIsColumnDialogOpen(true);
  }, [resetForm]);

  const handleSaveColumn = useCallback(() => {
    if (!formData.title.trim()) return;

    const columnId = editingColumn?.id || `column_${Date.now()}`;
    const columnData: ColumnDefinition = {
      id: columnId,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
      maxCards: formData.maxCards ? parseInt(formData.maxCards) : undefined,
      order: editingColumn?.order || columns.length,
      isDefault: editingColumn?.isDefault || false,
      createdAt: editingColumn?.createdAt || new Date().toISOString(),
      createdBy: editingColumn?.createdBy || user?.uid || '',
    };

    let updatedColumns;
    if (editingColumn) {
      updatedColumns = columns.map(c => c.id === columnId ? columnData : c);
    } else {
      updatedColumns = [...columns, columnData];
    }

    const updatedBoard: Board = {
      ...board,
      columnDefinitions: updatedColumns,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBoard(updatedBoard);
    setIsColumnDialogOpen(false);
    resetForm();
  }, [formData, editingColumn, columns, board, onUpdateBoard, user?.uid, resetForm]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column?.isDefault) {
      toast({
        variant: 'destructive',
        title: 'Cannot Delete',
        description: 'Default columns cannot be deleted.',
      });
      return;
    }

    const updatedColumns = columns.filter(c => c.id !== columnId);
    const updatedBoard: Board = {
      ...board,
      columnDefinitions: updatedColumns,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBoard(updatedBoard);
    setDeleteColumnId(null);
    
    toast({
      title: 'Column Deleted',
      description: `Column "${column?.title}" has been deleted.`,
    });
  }, [columns, board, onUpdateBoard]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = columns.findIndex(c => c.id === active.id);
    const newIndex = columns.findIndex(c => c.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newColumns = arrayMove(columns, oldIndex, newIndex);

    // Update order values
    const updatedColumns = newColumns.map((column, index) => ({
      ...column,
      order: index,
    }));

    const updatedBoard: Board = {
      ...board,
      columnDefinitions: updatedColumns,
      updatedAt: new Date().toISOString(),
    };

    onUpdateBoard(updatedBoard);
  }, [columns, board, onUpdateBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!canManageColumns) {
    return null;
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Columns3 className="h-4 w-4" />
            Manage Columns ({columns.length})
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[500px] sm:w-[600px]">
          <SheetHeader>
            <SheetTitle>Manage Board Columns</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Customize workflow columns for this board
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <GripVertical className="h-3 w-3 inline mr-1" />
                  Drag columns to reorder them
                </p>
              </div>
              <Button onClick={() => handleOpenColumnDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Column
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {columns.map((column) => (
                      <SortableColumnItem
                        key={column.id}
                        column={column}
                        onEdit={handleOpenColumnDialog}
                        onDelete={setDeleteColumnId}
                        canManage={canManageColumns}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Column Edit Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingColumn ? 'Edit' : 'Add'} Column</DialogTitle>
            <DialogDescription>
              {editingColumn ? 'Update the column configuration' : 'Create a new workflow column'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 px-1">
              {/* Column Title */}
              <div className="space-y-2">
                <Label htmlFor="column-title">Column Title *</Label>
                <Input
                  id="column-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. In Review, Ready for Testing"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="column-description">Description</Label>
                <Textarea
                  id="column-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this workflow stage"
                  rows={2}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Column Color</Label>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${
                          formData.color === color ? 'border-foreground' : 'border-border'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-8 p-1 border rounded"
                  />
                </div>
              </div>

              {/* Max Cards (WIP Limit) */}
              <div className="space-y-2">
                <Label htmlFor="max-cards">Work in Progress Limit</Label>
                <Input
                  id="max-cards"
                  type="number"
                  value={formData.maxCards}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxCards: e.target.value }))}
                  placeholder="Optional limit on number of cards"
                  min="1"
                />
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveColumn}
              disabled={!formData.title.trim()}
            >
              {editingColumn ? 'Update' : 'Create'} Column
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteColumnId} onOpenChange={() => setDeleteColumnId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this column? This action cannot be undone and any cards in this column will need to be moved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteColumnId && handleDeleteColumn(deleteColumnId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 