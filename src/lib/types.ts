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
  content: string; // The English text from the form
  gujaratiTranslation?: string; // The translated text
  creatorUid: string;
  assigneeUid?: string;
  column: ColumnId;
  createdAt: string;
};

export type ColumnData = {
  id: ColumnId;
  title: string;
  cards: Card[];
};
