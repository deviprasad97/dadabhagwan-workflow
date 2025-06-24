export type User = {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'Admin' | 'Editor' | 'Viewer';
};

export type Board = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  creatorUid: string;
  isDefault?: boolean;
  sharedWith: string[]; // Array of user UIDs who have access
  settings?: {
    allowEditorSharing?: boolean;
    color?: string;
    category?: string;
    location?: string;
    eventDate?: string;
    status?: 'Active' | 'Inactive' | 'Archived';
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    tags?: string[];
    [key: string]: any;
  };
};

export type ColumnId = 'online_submitted' | 'translate_gujarati' | 'checking_gujarati' | 'print' | 'done';

export interface Card {
  id: string;
  title: string;
  content: string;
  column: ColumnId;
  createdAt: string;
  updatedAt: string;
  creatorUid: string;
  assigneeUid?: string;
  boardId?: string; // Made optional for migration
  metadata?: {
    source?: string;
    formData?: Record<string, any>;
    submissionTimestamp?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    topic?: string;
    gujaratiTranslation?: string;
    approvedTranslation?: string;
    [key: string]: any;
  };
}

export type ColumnData = {
  id: ColumnId;
  title: string;
  cards: Card[];
};

export type BoardAccess = 'owner' | 'shared' | 'admin';
