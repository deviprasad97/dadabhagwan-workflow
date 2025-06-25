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
  {
    uid: 'for-review',
    name: 'For Review',
    email: 'review@system.com',
    avatarUrl: 'https://placehold.co/40x40/fbbf24/000000?text=FR',
    role: 'Admin',
  },
];

export const mockCards: Card[] = [
  {
    id: 'card-1',
    cardNumber: 1,
    title: 'Priya Patel',
    content: 'How can I develop true devotion while living in a materialistic world?',
    creatorUid: 'google-forms',
    column: 'online_submitted',
    boardId: 'default-board',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      source: 'google-forms',
      formData: {
        email: 'priya.patel@example.com',
        firstname: 'Priya',
        lastname: 'Patel',
        age: '28',
        gender: 'Female',
        city: 'Mumbai',
        status: 'Single',
        gnan_vidhi_year: '2020',
        english_question: 'How can I develop true devotion while living in a materialistic world?'
      }
    }
  },
  {
    id: 'card-2',
    cardNumber: 2,
    title: 'Rajesh Shah',
    content: 'What is the difference between ego and self-respect?',
    creatorUid: 'google-forms',
    assigneeUid: 'user-editor-01',
    column: 'translate_gujarati',
    boardId: 'default-board',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      source: 'google-forms',
      formData: {
        email: 'rajesh.shah@example.com',
        firstname: 'Rajesh',
        lastname: 'Shah',
        age: '35',
        gender: 'Male',
        city: 'Ahmedabad',
        status: 'Married',
        gnan_vidhi_year: '2018',
        english_question: 'What is the difference between ego and self-respect?'
      }
    }
  },
  {
    id: 'card-3',
    cardNumber: 3,
    title: 'Neha Desai',
    content: 'How can I practice true forgiveness from the heart?',
    creatorUid: 'google-forms',
    assigneeUid: 'user-admin-01',
    column: 'checking_gujarati',
    boardId: 'default-board',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      source: 'google-forms',
      gujaratiTranslation: 'હું હૃદયથી સાચી ક્ષમા કેવી રીતે કરી શકું?',
      formData: {
        email: 'neha.desai@example.com',
        firstname: 'Neha',
        lastname: 'Desai',
        age: '31',
        gender: 'Female',
        city: 'Pune',
        status: 'Married',
        gnan_vidhi_year: '2019',
        english_question: 'How can I practice true forgiveness from the heart?'
      }
    }
  },
  {
    id: 'card-4',
    cardNumber: 4,
    title: 'Amit Joshi',
    content: 'What is the role of karma in our daily life experiences?',
    creatorUid: 'google-forms',
    column: 'print',
    boardId: 'default-board',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    // No printStatus = pending by default
    metadata: {
      source: 'google-forms',
      gujaratiTranslation: 'આપણા દૈનિક જીવનના અનુભવોમાં કર્મની ભૂમિકા શું છે?',
      approvedTranslation: 'આપણા દૈનિક જીવનના અનુભવોમાં કર્મની ભૂમિકા શું છે?',
      formData: {
        email: 'amit.joshi@example.com',
        firstname: 'Amit',
        lastname: 'Joshi',
        age: '42',
        gender: 'Male',
        city: 'Surat',
        status: 'Married',
        gnan_vidhi_year: '2015',
        english_question: 'What is the role of karma in our daily life experiences?'
      }
    }
  },
  {
    id: 'card-5',
    cardNumber: 5,
    title: 'Kavya Mehta',
    content: 'How can I maintain equanimity during family conflicts?',
    creatorUid: 'google-forms',
    assigneeUid: 'for-review',
    column: 'print',
    boardId: 'default-board',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    printStatus: {
      status: 'pending',
    },
    metadata: {
      source: 'google-forms',
      gujaratiTranslation: 'કૌટુંબિક સંઘર્ષો દરમિયાન હું કેવી રીતે સમતા જાળવી શકું?',
      approvedTranslation: 'કૌટુંબિક સંઘર્ષો દરમિયાન હું કેવી રીતે સમતા જાળવી શકું?',
      formData: {
        email: 'kavya.mehta@example.com',
        firstname: 'Kavya',
        lastname: 'Mehta',
        age: '29',
        gender: 'Female',
        city: 'Rajkot',
        status: 'Single',
        gnan_vidhi_year: '2021',
        english_question: 'How can I maintain equanimity during family conflicts?'
      }
    }
  },
  {
    id: 'card-6',
    cardNumber: 6,
    title: 'Deepak Kumar',
    content: 'What is the meaning of true happiness according to Akram Vignan?',
    creatorUid: 'google-forms',
    column: 'print',
    boardId: 'default-board',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    printStatus: {
      status: 'approved',
      reviewedBy: 'user-admin-01',
      reviewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    metadata: {
      source: 'google-forms',
      gujaratiTranslation: 'અક્રમ વિજ્ઞાન અનુસાર સાચી ખુશીનો અર્થ શું છે?',
      approvedTranslation: 'અક્રમ વિજ્ઞાન અનુસાર સાચી ખુશીનો અર્થ શું છે?',
      formData: {
        email: 'deepak.kumar@example.com',
        firstname: 'Deepak',
        lastname: 'Kumar',
        age: '38',
        gender: 'Male',
        city: 'Delhi',
        status: 'Married',
        gnan_vidhi_year: '2017',
        english_question: 'What is the meaning of true happiness according to Akram Vignan?'
      }
    }
  },
];
