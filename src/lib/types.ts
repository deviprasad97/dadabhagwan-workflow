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

// Form Builder Types
export type FormFieldType = 
  | 'text' 
  | 'textarea' 
  | 'email' 
  | 'number' 
  | 'phone'
  | 'select' 
  | 'radio' 
  | 'checkbox' 
  | 'date' 
  | 'time'
  | 'url'
  | 'rating'
  | 'section_header';

export interface FormFieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: FormFieldOption[]; // For select, radio, checkbox
  validation?: FormFieldValidation;
  settings?: {
    columns?: number; // For checkbox groups
    allowOther?: boolean; // For radio/checkbox to add "Other" option
    scale?: { min: number; max: number; labels?: { min: string; max: string } }; // For rating
    [key: string]: any;
  };
  order: number;
}

export interface Form {
  id: string;
  title: string;
  description?: string;
  templateId?: string; // Reference to FormTemplate used
  boardId?: string; // Optional - can be assigned later
  boardIntegration?: BoardIntegration; // Enhanced board integration settings
  fields: FormField[];
  settings: {
    allowMultipleSubmissions?: boolean;
    requireSignIn?: boolean;
    showProgressBar?: boolean;
    submitButtonText?: string;
    successMessage?: string;
    redirectUrl?: string;
    theme?: {
      primaryColor?: string;
      backgroundColor?: string;
      fontFamily?: string;
    };
  };
  access?: FormAccessSettings;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  creatorUid: string;
  sharedWith: string[]; // Users who can edit this form
  submissionCount?: number;
  analytics?: FormAnalytics;
}

export interface FormSubmission {
  id: string;
  formId: string;
  boardId?: string;
  responses: Record<string, any>; // fieldId -> response value
  submittedAt: string;
  submitterInfo?: {
    email?: string;
    name?: string;
    ip?: string;
    userAgent?: string;
  };
  cardId?: string; // If a card was created from this submission
  status: 'pending' | 'processed' | 'archived' | 'error';
  metadata?: {
    processingNotes?: string;
    assignedTo?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    tags?: string[];
    [key: string]: any;
  };
}

// Form Analytics and Stats
export interface FormAnalytics {
  formId: string;
  totalSubmissions: number;
  submissionsToday: number;
  submissionsThisWeek: number;
  submissionsThisMonth: number;
  averageCompletionTime?: number; // in seconds
  dropoffRates?: Record<string, number>; // fieldId -> dropoff percentage
  lastSubmissionAt?: string;
  topReferrers?: Array<{ source: string; count: number }>;
}

// Form Templates for standardized board integration
export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'qa' | 'feedback' | 'registration' | 'survey' | 'contact' | 'custom';
  fields: FormField[];
  boardMapping: {
    titleField: string; // Field ID that maps to card title
    contentField: string; // Field ID that maps to card content
    priorityField?: string; // Field ID that maps to priority
    categoryField?: string; // Field ID that maps to category/topic
    assigneeField?: string; // Field ID for assignment (if applicable)
  };
  requiredForBoard: boolean; // Whether this template is required for board association
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  creatorUid: string;
}

// Enhanced form submission with board integration
export interface BoardIntegration {
  enabled: boolean;
  boardId: string;
  autoCreateCards: boolean;
  defaultColumn: ColumnId;
  fieldMapping: {
    titleField: string;
    contentField: string;
    priorityField?: string;
    categoryField?: string;
    assigneeField?: string;
  };
  cardTemplate?: {
    titlePrefix?: string;
    contentFormat?: string; // Template for formatting card content
    defaultPriority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    defaultAssignee?: string;
  };
}

// Public form access settings
export interface FormAccessSettings {
  isPublic: boolean;
  requireAuth?: boolean;
  allowedDomains?: string[]; // Email domain restrictions
  startDate?: string; // When form becomes available
  endDate?: string; // When form closes
  maxSubmissions?: number; // Submission limit
  oneResponsePerUser?: boolean;
  customUrl?: string; // Custom slug for public URL
}

export type ColumnId = 'online_submitted' | 'translate_gujarati' | 'checking_gujarati' | 'print' | 'done';

export interface Card {
  id: string;
  cardNumber: number; // Sequential number unique to each board
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
    formSubmissionId?: string; // Link to the form submission
    [key: string]: any;
  };
}

export type ColumnData = {
  id: ColumnId;
  title: string;
  cards: Card[];
};

export type BoardAccess = 'owner' | 'shared' | 'admin';

// Satsang Center Types
export interface SatsangCenter {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  contactPerson: string;
  contactInfo: {
    mobile?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string; // User ID who created this center
  status: 'active' | 'inactive';
}
