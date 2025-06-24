export type User = {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'Admin' | 'Editor' | 'Viewer';
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
  metadata?: {
    source?: string;
    formData?: Record<string, any>;
    submissionTimestamp?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    topic?: string;
    [key: string]: any;
  };
}

export type ColumnData = {
  id: ColumnId;
  title: string;
  cards: Card[];
};
