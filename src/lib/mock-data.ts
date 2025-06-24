import type { User, Card, ColumnId } from './types';

export const mockUsers: User[] = [
  {
    uid: 'user-admin-01',
    name: 'Admin User',
    email: 'admin@example.com',
    avatarUrl: 'https://placehold.co/40x40.png',
    role: 'Admin',
  },
  {
    uid: 'user-editor-01',
    name: 'Editor User',
    email: 'editor@example.com',
    avatarUrl: 'https://placehold.co/40x40.png',
    role: 'Editor',
  },
  {
    uid: 'user-viewer-01',
    name: 'Viewer User',
    email: 'viewer@example.com',
    avatarUrl: 'https://placehold.co/40x40.png',
    role: 'Viewer',
  },
  {
    uid: 'google-forms',
    name: 'Google Forms',
    email: 'forms@system.com',
    avatarUrl: 'https://placehold.co/40x40/0066cc/ffffff?text=GF',
    role: 'Admin',
  },
];

export const mockCards: Card[] = [
  {
    id: 'card-1',
    title: 'New Feedback Form Submission',
    content: 'The user reported that the login button is not working on the mobile app. They are using an iPhone 13 Pro. Please investigate this issue immediately.',
    creatorUid: 'user-viewer-01',
    column: 'online_submitted',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'card-2',
    title: 'Feature Request: Dark Mode',
    content: 'A user has requested a dark mode feature for the main dashboard to reduce eye strain during night-time use. Consider this for the next development cycle.',
    creatorUid: 'user-viewer-01',
    assigneeUid: 'user-editor-01',
    column: 'translate_gujarati',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'card-3',
    title: 'Update Marketing Copy',
    content: 'The marketing team wants to update the homepage tagline from "Build Faster" to "Build Smarter, Not Harder". This needs to be translated for the regional site.',
    gujaratiTranslation: 'હોમપેજ ટેગલાઇનને "ઝડપી બનાવો" થી "સખત નહીં, સ્માર્ટ બનાવો" માં અપડેટ કરવાની જરૂર છે.',
    creatorUid: 'user-admin-01',
    assigneeUid: 'user-admin-01',
    column: 'checking_gujarati',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'card-4',
    title: 'Quarterly Report Graphics',
    content: 'The graphics for the Q3 quarterly report are ready for printing. Please ensure high-quality paper is used.',
    gujaratiTranslation: 'Q3 ત્રિમાસિક અહેવાલ માટેના ગ્રાફિક્સ છાપવા માટે તૈયાર છે.',
    creatorUid: 'user-editor-01',
    column: 'print',
    createdAt: new Date().toISOString(),
  },
    {
    id: 'card-5',
    title: 'User Onboarding Tutorial',
    content: 'The script for the new user onboarding video tutorial has been finalized. It is now ready for translation.',
    creatorUid: 'user-admin-01',
    assigneeUid: 'user-editor-01',
    column: 'online_submitted',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'card-6',
    title: 'Fix API Endpoint Latency',
    content: 'The `/api/v2/data` endpoint is experiencing high latency. The performance needs to be optimized before the next release.',
    creatorUid: 'user-editor-01',
    column: 'translate_gujarati',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
