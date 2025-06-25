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
  customFieldDefinitions?: CustomFieldDefinition[]; // Dynamic field definitions for this board
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
  columnDefinitions?: ColumnDefinition[];
  translationSettings?: {
    defaultLanguage: string; // Default language for new cards (e.g., 'de', 'hi', 'en')
    targetLanguage: string; // Final target language (e.g., 'gu' for Gujarati)
    requiresIntermediateTranslation: boolean; // Whether to go through English first
    intermediateLanguage?: string; // Usually 'en' for English
    enabledProviders: TranslationProvider[]; // Which AI providers to use
    autoTranslate: boolean; // Whether to automatically trigger translations
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

export type ColumnId = string;

// Custom field types for dynamic card fields
export type CustomFieldType = 
  | 'text' 
  | 'textarea' 
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  description?: string;
  required?: boolean;
  options?: string[]; // For select/multiselect
  defaultValue?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  order: number;
  createdAt: string;
  createdBy: string;
}

export interface ColumnDefinition {
  id: string;
  title: string;
  description?: string;
  color?: string; // Hex color for column header
  order: number;
  isDefault?: boolean; // Cannot be deleted if true
  maxCards?: number; // WIP limit
  createdAt: string;
  createdBy: string;
}

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
  customFields?: Record<string, any>; // Dynamic custom field values
  // Edit locking fields
  editingStatus?: {
    isLocked: boolean;
    lockedBy?: string; // User UID who is currently editing
    lockedAt?: string; // When the lock was acquired
    lockExpiry?: string; // When the lock expires (auto-release)
  };
  // Print management fields
  printStatus?: PrintStatus;
  metadata?: {
    source?: string;
    formData?: Record<string, any>;
    submissionTimestamp?: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    topic?: string;
    
    // Enhanced translation workflow
    sourceLanguage?: string; // Original language of the content (e.g., 'de', 'hi')
    targetLanguage?: string; // Final target language (e.g., 'gu')
    translationFlow?: TranslationStep[]; // Array of translation steps
    currentTranslationStep?: number; // Index of current step in the flow
    translationStatus?: 'not_started' | 'in_progress' | 'needs_review' | 'completed';
    
    // Legacy fields (kept for backward compatibility)
    gujaratiTranslation?: string;
    approvedTranslation?: string;
    originalLanguage?: string; // Deprecated in favor of sourceLanguage
    translatedQuestion?: string; // Deprecated in favor of translationFlow
    
    formSubmissionId?: string; // Link to the form submission
    // Live view specific fields
    isAnswered?: boolean; // Whether the question has been answered
    isLive?: boolean; // Whether the question is currently live
    personName?: string; // Name of the person who asked the question
    [key: string]: any;
  };
}

export type ColumnData = {
  id: ColumnId;
  title: string;
  cards: Card[];
  color?: string;
  maxCards?: number;
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

// Enhanced translation types
export type SupportedLanguage = 'en' | 'gu' | 'de' | 'hi' | 'fr' | 'es' | 'it' | 'pt' | 'ru' | 'ja' | 'ko' | 'zh' | 'ar';

export type TranslationProvider = 'genkit' | 'openai' | 'sutra' | 'google-translate';

// Print Management Types
export interface PrintStatus {
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // Admin UID who approved/rejected
  reviewedAt?: string; // ISO timestamp
  comment?: string; // Optional approval/rejection comment
}

export interface TranslationStep {
  id: string;
  fromLanguage: string;
  toLanguage: string;
  originalText: string;
  translatedText?: string;
  provider?: TranslationProvider;
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'approved';
  error?: string;
  confidence?: number; // 0-1 score from translation API
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User who initiated/approved this step
  isManuallyEdited?: boolean; // Whether user manually edited the translation
}
