export type User = {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'Admin' | 'Editor' | 'Viewer';
};

export type ColumnId = 'online_submitted' | 'translate_gujarati' | 'checking_gujarati' | 'print' | 'done';

export type Card = {
  id: string;
  title: string;
  column: ColumnId;
  assigneeUid: string | null;
  creatorUid: string;
  metadata?: {
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    topic?: string;
    gujaratiTranslation?: string;
    approvedTranslation?: string;
    formData?: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
};

export type ColumnData = {
  id: ColumnId;
  title: string;
  cards: Card[];
};
