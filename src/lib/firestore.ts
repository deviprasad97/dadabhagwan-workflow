import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  type DocumentData,
  type QuerySnapshot,
  type Unsubscribe,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment,
  deleteField,
  runTransaction,
  Timestamp,
  enableNetwork,
  disableNetwork,
  limit
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { Card, User, ColumnId, Board, Form, FormSubmission, FormTemplate, BoardIntegration, SatsangCenter, ColumnDefinition, TranslationProvider } from './types';
import { mockUsers } from './mock-data';

import { 
  initializeApp, 
  getApps, 
  cert, 
  type ServiceAccount 
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { 
  initializeCardTranslation,
  LANGUAGE_NAMES 
} from './translation-service';

// Collections
const CARDS_COLLECTION = 'cards';
const USERS_COLLECTION = 'users';
const BOARDS_COLLECTION = 'boards';
const AUDIT_COLLECTION = 'audit_logs';
const COUNTERS_COLLECTION = 'counters';

// Default board ID for migration
const DEFAULT_BOARD_ID = 'default-board';

// Counter service for sequential card numbering
const counterService = {
  // Get next card number for a board
  getNextCardNumber: async (boardId: string): Promise<number> => {
    const counterDocId = `card_counter_${boardId}`;
    const counterRef = doc(firestore, COUNTERS_COLLECTION, counterDocId);
    
    try {
      // Use a transaction to ensure atomic increment
      const nextNumber = await runTransaction(firestore, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        if (!counterDoc.exists()) {
          // First card for this board
          transaction.set(counterRef, {
            boardId,
            lastCardNumber: 1,
            updatedAt: serverTimestamp(),
          });
          return 1;
        } else {
          // Increment existing counter
          const currentNumber = counterDoc.data()?.lastCardNumber || 0;
          const nextNumber = currentNumber + 1;
          transaction.update(counterRef, {
            lastCardNumber: nextNumber,
            updatedAt: serverTimestamp(),
          });
          return nextNumber;
        }
      });
      
      return nextNumber;
    } catch (error) {
      console.error('Error getting next card number:', error);
      // Fallback to timestamp-based number if transaction fails
      return Date.now() % 100000;
    }
  },

  // Initialize counter for existing cards (migration helper)
  initializeCounterForBoard: async (boardId: string): Promise<void> => {
    try {
      // Get all cards for this board
      const cardsQuery = query(
        collection(firestore, CARDS_COLLECTION),
        where('boardId', '==', boardId),
        orderBy('createdAt', 'asc')
      );
      
      const cardsSnapshot = await getDocs(cardsQuery);
      let cardNumber = 1;
      
      // Update each card with a sequential number
      const batch = writeBatch(firestore);
      
      cardsSnapshot.forEach((cardDoc) => {
        const cardRef = doc(firestore, CARDS_COLLECTION, cardDoc.id);
        batch.update(cardRef, {
          cardNumber: cardNumber++,
          updatedAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      
      // Set the counter to the next number
      const counterDocId = `card_counter_${boardId}`;
      const counterRef = doc(firestore, COUNTERS_COLLECTION, counterDocId);
      await setDoc(counterRef, {
        boardId,
        lastCardNumber: cardNumber - 1,
        updatedAt: serverTimestamp(),
      });
      
      console.log(`Initialized counter for board ${boardId} with ${cardNumber - 1} cards`);
    } catch (error) {
      console.error('Error initializing counter for board:', boardId, error);
    }
  }
};

// Seed database with mock data if empty
export const seedMockData = async (): Promise<void> => {
  try {
    // Ensure default board exists first
    const defaultBoard = await boardService.getBoard(DEFAULT_BOARD_ID);
    if (!defaultBoard) {
      // Default column definitions
      const defaultColumnDefinitions = [
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

      await setDoc(doc(firestore, BOARDS_COLLECTION, DEFAULT_BOARD_ID), {
        name: 'Main Board',
        description: 'Default board for all questions',
        creatorUid: 'system',
        isDefault: true,
        sharedWith: [],
        settings: {},
        columnDefinitions: defaultColumnDefinitions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    
    // Always ensure the system user exists
    const systemUser = mockUsers.find(u => u.uid === 'google-forms');
    if (systemUser) {
      await setDoc(doc(firestore, USERS_COLLECTION, systemUser.uid), {
        ...systemUser,
        createdAt: serverTimestamp(),
      }, { merge: true });
      console.log('System user (google-forms) ensured to exist');
    }
    
    // Check if cards collection is empty
    const cardsSnapshot = await getDocs(collection(firestore, CARDS_COLLECTION));
    
    if (cardsSnapshot.empty) {
      console.log('Database is empty, seeding with mock data...');
      
      // Add mock users
      for (const user of mockUsers) {
        await setDoc(doc(firestore, USERS_COLLECTION, user.uid), {
          ...user,
          createdAt: serverTimestamp(),
        });
      }
      
      // Add mock cards
      for (const card of mockCards) {
        const cardData: any = {
          title: card.title,
          content: card.content,
          creatorUid: card.creatorUid,
          column: card.column,
          boardId: card.boardId || DEFAULT_BOARD_ID,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        };
        
        // Only add fields that are not undefined
        if (card.assigneeUid !== undefined) {
          cardData.assigneeUid = card.assigneeUid;
        }
        
        if (card.metadata !== undefined) {
          cardData.metadata = card.metadata;
        }
        
        await setDoc(doc(firestore, CARDS_COLLECTION, card.id), cardData);
      }
      
      console.log('Mock data seeded successfully!');
      
      // Initialize counter for the default board
      await counterService.initializeCounterForBoard(DEFAULT_BOARD_ID);
    } else {
      console.log('Database already has data, skipping card seed.');
      
      // Check if cards need cardNumber migration
      const cardsSnapshot = await getDocs(collection(firestore, CARDS_COLLECTION));
      const needsMigration = cardsSnapshot.docs.some(doc => !doc.data().cardNumber);
      
      if (needsMigration) {
        console.log('Migrating existing cards to add card numbers...');
        await counterService.initializeCounterForBoard(DEFAULT_BOARD_ID);
      }
    }
  } catch (error) {
    console.error('Error seeding mock data:', error);
  }
};

// Card operations
export const cardService = {
  // Get all cards with real-time updates (filtered by board)
  subscribeToCards: (boardId?: string, callback?: (cards: Card[]) => void): Unsubscribe => {
    let q;
    
    if (boardId) {
      q = query(
        collection(firestore, CARDS_COLLECTION),
        where('boardId', '==', boardId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(firestore, CARDS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
    }
    
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const cards: Card[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          id: doc.id,
          cardNumber: data.cardNumber || 0, // Migration support - will be updated by counter
          title: data.title,
          content: data.content,
          creatorUid: data.creatorUid,
          assigneeUid: data.assigneeUid,
          column: data.column,
          boardId: data.boardId || DEFAULT_BOARD_ID, // Migration support
          customFields: data.customFields || {}, // Custom field values
          editingStatus: data.editingStatus, // Include edit lock status
          printStatus: data.printStatus, // Include print status
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          metadata: data.metadata,
        });
      });
      callback?.(cards);
    }, (error) => {
      console.error('Error in cards subscription:', error);
      // Return empty array on error to prevent UI crashes
      callback?.([]);
    });
  },

  // Add a new card
  addCard: async (card: Omit<Card, 'id' | 'createdAt' | 'cardNumber'>): Promise<string> => {
    const boardId = card.boardId || DEFAULT_BOARD_ID;
    
    // Get next card number for this board
    const cardNumber = await counterService.getNextCardNumber(boardId);
    
    const docRef = await addDoc(collection(firestore, CARDS_COLLECTION), {
      ...card,
      cardNumber,
      boardId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  /**
   * Update a card
   */
  updateCard: async (cardId: string, updates: Partial<Card>) => {
    try {
      const cardRef = doc(firestore, CARDS_COLLECTION, cardId);
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(cardRef, updateData);
      console.log('Card updated successfully:', cardId);
    } catch (error) {
      console.error('Error updating card:', error);
      throw error;
    }
  },

  // Move a card to a different column
  moveCard: async (cardId: string, newColumn: ColumnId, userId: string): Promise<void> => {
    const cardRef = doc(firestore, CARDS_COLLECTION, cardId);
    await updateDoc(cardRef, {
      column: newColumn,
      updatedAt: serverTimestamp(),
    });

    // Log the movement
    await addDoc(collection(firestore, AUDIT_COLLECTION), {
      cardId,
      action: 'move',
      fromColumn: 'unknown', // We could fetch the previous state if needed
      toColumn: newColumn,
      userId,
      timestamp: serverTimestamp(),
    });
  },

  // Delete a card
  deleteCard: async (cardId: string): Promise<void> => {
    const cardRef = doc(firestore, CARDS_COLLECTION, cardId);
    await deleteDoc(cardRef);
  },

  // Print Status Management
  updateCardPrintStatus: async (cardId: string, printStatus: { status: 'pending' | 'approved' | 'rejected'; reviewedBy?: string; reviewedAt?: string; comment?: string; }): Promise<void> => {
    const cardRef = doc(firestore, CARDS_COLLECTION, cardId);
    
    // Build printStatus object without undefined values
    const printStatusUpdate: any = {
      status: printStatus.status,
      reviewedBy: printStatus.reviewedBy,
      reviewedAt: printStatus.reviewedAt || new Date().toISOString(),
    };
    
    // Only include comment if it has a value
    if (printStatus.comment && printStatus.comment.trim()) {
      printStatusUpdate.comment = printStatus.comment;
    }
    
    await updateDoc(cardRef, {
      printStatus: printStatusUpdate,
      updatedAt: serverTimestamp(),
    });
  },

  // Get pending print cards for admin review
  getPendingPrintCards: async (boardId: string): Promise<Card[]> => {
    if (!boardId) {
      console.warn('getPendingPrintCards called with undefined boardId');
      return [];
    }

    // Get all cards in print column assigned to "for-review" user
    const q = query(
      collection(firestore, CARDS_COLLECTION),
      where('boardId', '==', boardId),
      where('column', '==', 'print'),
      where('assigneeUid', '==', 'for-review'), // Only cards assigned to "For Review"
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const cards: Card[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Only include cards that are actually pending (null/undefined status or explicitly pending)
      const printStatus = data.printStatus;
      const isPending = !printStatus || 
                       printStatus.status === 'pending' || 
                       printStatus.status === undefined || 
                       printStatus.status === null;
      
      if (isPending) {
        cards.push({
          id: doc.id,
          cardNumber: data.cardNumber || 0,
          title: data.title,
          content: data.content,
          creatorUid: data.creatorUid,
          assigneeUid: data.assigneeUid,
          column: data.column,
          boardId: data.boardId || DEFAULT_BOARD_ID,
          customFields: data.customFields || {},
          editingStatus: data.editingStatus,
          printStatus: data.printStatus,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          metadata: data.metadata,
        });
      }
    });
    
    return cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  // Get all cards in print column (for print view)
  getAllPrintCards: async (boardId: string): Promise<Card[]> => {
    const q = query(
      collection(firestore, CARDS_COLLECTION),
      where('boardId', '==', boardId),
      where('column', '==', 'print'),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const cards: Card[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      cards.push({
        id: doc.id,
        cardNumber: data.cardNumber || 0,
        title: data.title,
        content: data.content,
        creatorUid: data.creatorUid,
        assigneeUid: data.assigneeUid,
        column: data.column,
        boardId: data.boardId || DEFAULT_BOARD_ID,
        customFields: data.customFields || {},
        editingStatus: data.editingStatus,
        printStatus: data.printStatus,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        metadata: data.metadata,
      });
    });
    return cards;
  },

  // Bulk update print status
  bulkUpdatePrintStatus: async (cardIds: string[], printStatus: { status: 'approved' | 'rejected'; reviewedBy: string; comment?: string; }): Promise<void> => {
    const batch = writeBatch(firestore);
    
    cardIds.forEach(cardId => {
      const cardRef = doc(firestore, CARDS_COLLECTION, cardId);
      
      // Build printStatus object without undefined values
      const printStatusUpdate: any = {
        status: printStatus.status,
        reviewedBy: printStatus.reviewedBy,
        reviewedAt: new Date().toISOString(),
      };
      
      // Only include comment if it has a value
      if (printStatus.comment && printStatus.comment.trim()) {
        printStatusUpdate.comment = printStatus.comment;
      }
      
      batch.update(cardRef, {
        printStatus: printStatusUpdate,
        updatedAt: serverTimestamp(),
      });
    });
    
    await batch.commit();
  },

  // Get cards by column and board
  getCardsByColumn: async (column: ColumnId, boardId?: string): Promise<Card[]> => {
    let q;
    
    if (boardId) {
      q = query(
        collection(firestore, CARDS_COLLECTION),
        where('column', '==', column),
        where('boardId', '==', boardId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(firestore, CARDS_COLLECTION),
        where('column', '==', column),
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    const cards: Card[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      cards.push({
        id: doc.id,
        cardNumber: data.cardNumber || 0, // Migration support
        title: data.title,
        content: data.content,
        creatorUid: data.creatorUid,
        assigneeUid: data.assigneeUid,
        column: data.column,
        boardId: data.boardId || DEFAULT_BOARD_ID, // Migration support
        customFields: data.customFields || {}, // Custom field values
        editingStatus: data.editingStatus, // Include edit lock status
        printStatus: data.printStatus, // Include print status
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        metadata: data.metadata,
      });
    });
    return cards;
  },
};

// Google Cloud Function Integration
const callGoogleCloudFunction = async (submission: FormSubmission, form: Form): Promise<void> => {
  // Default Cloud Function URL - this should be configured via environment variables
  const cloudFunctionUrl = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_FUNCTION_URL || 'https://your-cloud-function-url/processFormSubmission';
  
  try {
    // Transform form submission data to match your Cloud Function's expected format
    const cloudFunctionData = {
      // Basic required fields
      email: submission.responses['email'] || '',
      firstname: submission.responses['firstname'] || '',
      lastname: submission.responses['lastname'] || '',
      
      // Additional fields from DadaBhagwan form
      age: submission.responses['age'] || '',
      gender: submission.responses['gender'] || '',
      city: submission.responses['city'] || '',
      status: submission.responses['status'] || '',
      gnan_vidhi_year: submission.responses['gnan-vidhi-year'] || submission.responses['gnan_vidhi_year'] || '',
      english_question: submission.responses['english-question'] || submission.responses['english_question'] || '',
      telephone: submission.responses['telephone'] || '',
      remarks: submission.responses['remarks'] || '',
      
      // Metadata
      formId: submission.formId,
      boardId: submission.boardId,
      submissionId: submission.id,
      submittedAt: submission.submittedAt,
      
      // Additional context for better card creation
      formTitle: form.title,
      boardIntegration: form.boardIntegration,
    };

    console.log('Calling Google Cloud Function with data:', cloudFunctionData);

    const response = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cloudFunctionData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloud Function call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Cloud Function response:', result);

    // Update submission status to processed if card was created successfully
    if (result.success && result.cardId) {
      await formService.updateSubmission(submission.id, {
        cardId: result.cardId,
        status: 'processed',
        metadata: {
          ...submission.metadata,
          cloudFunctionResponse: result,
          processedAt: new Date().toISOString(),
        },
      });
    }

  } catch (error) {
    console.error('Error calling Google Cloud Function:', error);
    
    // Update submission with error status
    await formService.updateSubmission(submission.id, {
      status: 'error',
      metadata: {
        ...submission.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorAt: new Date().toISOString(),
      },
    });
    
    throw error; // Re-throw to be caught by the calling function
  }
};

// User operations
export const userService = {
  // Get user by UID
  getUser: async (uid: string): Promise<User | null> => {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid: userSnap.id,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        role: data.role,
      };
    }
    return null;
  },

  // Create or update user
  upsertUser: async (user: User): Promise<void> => {
    const userRef = doc(firestore, USERS_COLLECTION, user.uid);
    await setDoc(userRef, {
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(firestore, USERS_COLLECTION));
    const users: User[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        role: data.role,
      });
    });
    return users;
  },

  // Subscribe to users with real-time updates
  subscribeToUsers: (callback: (users: User[]) => void): Unsubscribe => {
    const q = query(collection(firestore, USERS_COLLECTION));
    
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const users: User[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          name: data.name,
          email: data.email,
          avatarUrl: data.avatarUrl,
          role: data.role,
        });
      });
      callback(users);
    }, (error) => {
      console.error('Error in users subscription:', error);
      // Return empty array on error to prevent UI crashes
      callback([]);
    });
  },
};

// Audit operations
export const auditService = {
  // Log an action
  logAction: async (action: {
    cardId?: string;
    action: string;
    userId: string;
    details?: any;
  }): Promise<void> => {
    await addDoc(collection(firestore, AUDIT_COLLECTION), {
      ...action,
      timestamp: serverTimestamp(),
    });
  },

  // Get audit logs for a card
  getCardAuditLogs: async (cardId: string): Promise<any[]> => {
    const q = query(
      collection(firestore, AUDIT_COLLECTION),
      where('cardId', '==', cardId),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const logs: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp,
      });
    });
    return logs;
  },
};

// Board operations
export const boardService = {
  // Create a new board
  createBoard: async (board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const docRef = await addDoc(collection(firestore, BOARDS_COLLECTION), {
      ...board,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Get board by ID
  getBoard: async (boardId: string): Promise<Board | null> => {
    try {
      const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
      const boardSnap = await getDoc(boardRef);
      
      if (boardSnap.exists()) {
        const data = boardSnap.data();
        return {
          id: boardSnap.id,
          name: data.name,
          description: data.description,
          creatorUid: data.creatorUid,
          isDefault: data.isDefault,
          sharedWith: data.sharedWith || [],
          settings: data.settings || {},
          customFieldDefinitions: data.customFieldDefinitions || [],
          columnDefinitions: data.columnDefinitions || [],
          translationSettings: data.translationSettings,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting board:', error);
      return null;
    }
  },

  // Get boards accessible to a user
  getUserBoards: async (userId: string, userRole: 'Admin' | 'Editor' | 'Viewer'): Promise<Board[]> => {
    let q;
    
    if (userRole === 'Admin') {
      // Admins can see all boards
      q = query(collection(firestore, BOARDS_COLLECTION), orderBy('createdAt', 'desc'));
    } else {
      // Editors and Viewers can only see boards they created or boards shared with them
      q = query(
        collection(firestore, BOARDS_COLLECTION),
        where('creatorUid', '==', userId),
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    const boards: Board[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const board: Board = {
        id: doc.id,
        name: data.name,
        description: data.description,
        creatorUid: data.creatorUid,
        isDefault: data.isDefault,
        sharedWith: data.sharedWith || [],
        settings: data.settings || {},
        customFieldDefinitions: data.customFieldDefinitions || [],
        columnDefinitions: data.columnDefinitions || [],
        translationSettings: data.translationSettings,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
      
      // For non-admins, also check if board is shared with them
      if (userRole !== 'Admin' && data.creatorUid !== userId && !data.sharedWith?.includes(userId)) {
        return; // Skip boards not accessible to this user
      }
      
      boards.push(board);
    });

    // For non-admins, also get boards shared with them
    if (userRole !== 'Admin') {
      const sharedQuery = query(
        collection(firestore, BOARDS_COLLECTION),
        where('sharedWith', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );
      
      const sharedSnapshot = await getDocs(sharedQuery);
      sharedSnapshot.forEach((doc) => {
        const data = doc.data();
        // Avoid duplicates (in case user is both creator and in sharedWith)
        if (!boards.find(b => b.id === doc.id)) {
          boards.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            creatorUid: data.creatorUid,
            isDefault: data.isDefault,
            sharedWith: data.sharedWith || [],
            settings: data.settings || {},
            customFieldDefinitions: data.customFieldDefinitions || [],
            columnDefinitions: data.columnDefinitions || [],
            translationSettings: data.translationSettings,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          });
        }
      });
    }
    
    return boards;
  },

  // Subscribe to boards accessible to a user
  subscribeToBoardsForUser: (userId: string, userRole: 'Admin' | 'Editor' | 'Viewer', callback: (boards: Board[]) => void): Unsubscribe => {
    // For simplicity, we'll use polling approach or you can implement complex real-time queries
    const fetchBoards = async () => {
      try {
        const boards = await boardService.getUserBoards(userId, userRole);
        callback(boards);
      } catch (error) {
        console.error('Error fetching boards:', error);
        callback([]);
      }
    };

    // Initial fetch
    fetchBoards();

    // Set up real-time subscription for boards collection
    const q = query(collection(firestore, BOARDS_COLLECTION));
    return onSnapshot(q, () => {
      fetchBoards(); // Refetch when any board changes
    }, (error) => {
      console.error('Error in boards subscription:', error);
      callback([]);
    });
  },

  // Helper function to recursively remove undefined values
  cleanFirestoreData: (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(boardService.cleanFirestoreData).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          const cleanedValue = boardService.cleanFirestoreData(value);
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  },

  // Update board
  updateBoard: async (boardId: string, updates: Partial<Board>): Promise<void> => {
    const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
    
    // Log what we're trying to update
    console.log('Updating board:', {
      boardId,
      updates,
      hasColumnDefinitions: !!updates.columnDefinitions,
      columnCount: updates.columnDefinitions?.length || 0
    });
    
    const cleanedUpdates = boardService.cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    console.log('Cleaned updates before Firestore save:', cleanedUpdates);
    
    await updateDoc(boardRef, cleanedUpdates);
    console.log('Board updated successfully in Firestore');
  },

  // Share board with users
  shareBoard: async (boardId: string, userIds: string[]): Promise<void> => {
    const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
    await updateDoc(boardRef, {
      sharedWith: arrayUnion(...userIds),
      updatedAt: serverTimestamp(),
    });
  },

  // Unshare board from users
  unshareBoard: async (boardId: string, userIds: string[]): Promise<void> => {
    const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
    await updateDoc(boardRef, {
      sharedWith: arrayRemove(...userIds),
      updatedAt: serverTimestamp(),
    });
  },

  // Delete a board
  deleteBoard: async (boardId: string): Promise<void> => {
    const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
    await deleteDoc(boardRef);
  },

  // Check if user has access to board
  hasAccess: async (boardId: string, userId: string, userRole: 'Admin' | 'Editor' | 'Viewer'): Promise<boolean> => {
    if (userRole === 'Admin') return true;
    
    const board = await boardService.getBoard(boardId);
    if (!board) return false;
    
    return board.creatorUid === userId || board.sharedWith.includes(userId);
  },

  // Get user's access level to board
  getUserAccessLevel: async (boardId: string, userId: string, userRole: 'Admin' | 'Editor' | 'Viewer'): Promise<'owner' | 'shared' | 'admin' | null> => {
    if (userRole === 'Admin') return 'admin';
    
    const board = await boardService.getBoard(boardId);
    if (!board) return null;
    
    if (board.creatorUid === userId) return 'owner';
    if (board.sharedWith.includes(userId)) return 'shared';
    
    return null;
  },

  // Create default board if it doesn't exist
  ensureDefaultBoard: async (): Promise<void> => {
    const defaultBoard = await boardService.getBoard(DEFAULT_BOARD_ID);
    if (!defaultBoard) {
      // Default column definitions
      const defaultColumnDefinitions = [
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

      await setDoc(doc(firestore, BOARDS_COLLECTION, DEFAULT_BOARD_ID), {
        name: 'Main Board',
        description: 'Default board for all questions',
        creatorUid: 'system',
        isDefault: true,
        sharedWith: [],
        settings: {},
        columnDefinitions: defaultColumnDefinitions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (!defaultBoard.columnDefinitions || defaultBoard.columnDefinitions.length === 0) {
      // Only add default columns if no column definitions exist at all
      console.log('Migrating board to add default column definitions');
      const defaultColumnDefinitions = [
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

      await boardService.updateBoard(DEFAULT_BOARD_ID, {
        columnDefinitions: defaultColumnDefinitions,
      });
    } else {
      // Board already has column definitions, don't overwrite them
      console.log('Board already has column definitions, skipping migration');
    }
  },

  // Subscribe to a specific board for real-time updates
  subscribeToBoard: (boardId: string, callback: (board: Board | null) => void): Unsubscribe => {
    const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
    
    return onSnapshot(boardRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const board: Board = {
          id: doc.id,
          name: data.name,
          description: data.description,
          creatorUid: data.creatorUid,
          isDefault: data.isDefault,
          sharedWith: data.sharedWith || [],
          settings: data.settings || {},
          customFieldDefinitions: data.customFieldDefinitions || [],
          columnDefinitions: data.columnDefinitions || [],
          translationSettings: data.translationSettings,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        };
        console.log('Board subscription update:', {
          boardId: board.id,
          hasColumnDefinitions: !!data.columnDefinitions,
          columnCount: data.columnDefinitions?.length || 0,
          columnIds: data.columnDefinitions?.map((c: any) => c.id) || [],
          rawData: data
        });
        callback(board);
      } else {
        console.log('Board document does not exist');
        callback(null);
      }
    }, (error) => {
      console.error('Error in board subscription:', error);
      callback(null);
    });
  },
};

// Create mock cards with realistic data
const mockCards: Card[] = [
  {
    id: 'card-live-1',
    cardNumber: 1,
    title: 'Julia Keim',
    content: `📧 **Contact Information**
Email: julia.keim@example.com

👤 **Personal Details**
Age: 29 • Gender: Female • City: Berlin

🙏 **Spiritual Information**
Status: Single
Gnan Vidhi Year: 2021

❓ **Question**
During the evolvement of living beings, they develop one sense after the other. From one sense to five senses, as in humans. Could you please explain, which senses evolve after that, and in which order, and could you also give examples?`,
    column: 'live',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    creatorUid: 'google-forms',
    assigneeUid: 'user-2',
    boardId: DEFAULT_BOARD_ID,
    metadata: {
      source: 'google-forms',
      priority: 'High',
      topic: 'Evolution of Senses',
      originalLanguage: 'English',
      personName: 'Julia Keim',
      isLive: true,
      isAnswered: false,
      translatedQuestion: 'Während der Entwicklung von Lebewesen entwickeln diese immer mehr Sinne. Von einem Sinn zu fünf Sinnen wie beim Menschen. Könntest Du bitte erläutern, welche Sinne sich danach in welcher Reihenfolge entwickeln, und auch Beispiele geben?',
      formData: {
        email: 'julia.keim@example.com',
        firstname: 'Julia',
        lastname: 'Keim',
        age: '29',
        gender: 'Female',
        city: 'Berlin',
        status: 'Single',
        gnan_vidhi_year: '2021',
        english_question: 'During the evolvement of living beings, they develop one sense after the other. From one sense to five senses, as in humans. Could you please explain, which senses evolve after that, and in which order, and could you also give examples?'
      }
    }
  },
  {
    id: 'card-live-2',
    cardNumber: 2,
    title: 'Barbara Konder',
    content: `📧 **Contact Information**
Email: barbara.konder@example.com

👤 **Personal Details**
Age: 55 • Gender: Female • City: Hamburg

🙏 **Spiritual Information**
Status: Married
Gnan Vidhi Year: 2015

❓ **Question**
Since Barbara has been with Akram Vignan, she has come home and is immensely grateful for it. When Barbara looks at her life since Gnan, she feels she can observe the following: a few files have lost their stickiness with a lot of Pratikraman. But at the same time, challenging files are showing up. Could it be, that with Gnan "there is more to cope with", or does it just seem so?`,
    column: 'live',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    creatorUid: 'google-forms',
    assigneeUid: 'user-1',
    boardId: DEFAULT_BOARD_ID,
    metadata: {
      source: 'google-forms',
      priority: 'Medium',
      topic: 'Spiritual Progress',
      originalLanguage: 'German',
      personName: 'Barbara Konder',
      isLive: true,
      isAnswered: false,
      translatedQuestion: 'Seitdem Barbara bei Akram Vignan ist, ist sie zu Hause angekommen und unendlich dankbar dafür. Wenn Barbara auf ihr Leben seit Gnan schaut, dann glaubt sie Folgendes zu beobachten: Ein paar Akten haben mit viel Pratikraman die Klebrigkeit verloren. Gleichzeitig zeigen sich aber herausfordernde Akten.',
      formData: {
        email: 'barbara.konder@example.com',
        firstname: 'Barbara',
        lastname: 'Konder',
        age: '55',
        gender: 'Female',
        city: 'Hamburg',
        status: 'Married',
        gnan_vidhi_year: '2015',
        english_question: 'Since Barbara has been with Akram Vignan, she has come home and is immensely grateful for it. When Barbara looks at her life since Gnan, she feels she can observe the following: a few files have lost their stickiness with a lot of Pratikraman. But at the same time, challenging files are showing up.'
      }
    }
  },
  {
    id: 'card-1',
    cardNumber: 3,
    title: 'Rajesh Patel',
    content: `📧 **Contact Information**
Email: rajesh.patel@example.com
Phone: +91-9876543210

👤 **Personal Details**
Age: 35 • Gender: Male • City: Ahmedabad

🙏 **Spiritual Information**
Status: Married
Gnan Vidhi Year: 2018

❓ **Question**
What is the difference between ego and pride? How can I identify when I am acting from ego versus genuine confidence?`,
    column: 'online_submitted',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    creatorUid: 'google-forms',
    assigneeUid: 'user-2',
    boardId: DEFAULT_BOARD_ID,
    metadata: {
      source: 'google-forms',
      priority: 'Medium',
      topic: 'Ego and Pride',
      formData: {
        email: 'rajesh.patel@example.com',
        firstname: 'Rajesh',
        lastname: 'Patel',
        age: '35',
        gender: 'Male',
        city: 'Ahmedabad',
        status: 'Married',
        gnan_vidhi_year: '2018',
        english_question: 'What is the difference between ego and pride? How can I identify when I am acting from ego versus genuine confidence?',
        telephone: '+91-9876543210'
      }
    }
  },
  {
    id: 'card-2',
    cardNumber: 4,
    title: 'Priya Shah',
    content: `📧 **Contact Information**
Email: priya.shah@example.com

👤 **Personal Details**
Age: 28 • Gender: Female • City: Mumbai

🙏 **Spiritual Information**
Status: Single
Gnan Vidhi Year: 2020

❓ **Question**
How can I maintain equanimity during difficult family situations? I find myself getting reactive and losing my peace.`,
    column: 'translate_gujarati',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    creatorUid: 'google-forms',
    assigneeUid: 'user-2',
    metadata: {
      source: 'google-forms',
      priority: 'High',
      topic: 'Equanimity',
      formData: {
        email: 'priya.shah@example.com',
        firstname: 'Priya',
        lastname: 'Shah',
        age: '28',
        gender: 'Female',
        city: 'Mumbai',
        status: 'Single',
        gnan_vidhi_year: '2020',
        english_question: 'How can I maintain equanimity during difficult family situations? I find myself getting reactive and losing my peace.'
      }
    }
  },
  {
    id: 'card-3',
    cardNumber: 5,
    title: 'Amit Desai',
    content: `📧 **Contact Information**
Email: amit.desai@example.com
Phone: +91-9123456789

👤 **Personal Details**
Age: 42 • Gender: Male • City: Surat

🙏 **Spiritual Information**
Status: Married
Gnan Vidhi Year: 2015

❓ **Question**
What is the role of karma in daily life? How should I understand when something is happening due to my past karma versus current actions?

📝 **Additional Notes**
This question has been bothering me for a while. I would appreciate a detailed explanation.`,
    column: 'checking_gujarati',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    creatorUid: 'google-forms',
    assigneeUid: 'user-1',
    metadata: {
      source: 'google-forms',
      priority: 'Low',
      topic: 'Karma',
      formData: {
        email: 'amit.desai@example.com',
        firstname: 'Amit',
        lastname: 'Desai',
        age: '42',
        gender: 'Male',
        city: 'Surat',
        status: 'Married',
        gnan_vidhi_year: '2015',
        english_question: 'What is the role of karma in daily life? How should I understand when something is happening due to my past karma versus current actions?',
        telephone: '+91-9123456789',
        remarks: 'This question has been bothering me for a while. I would appreciate a detailed explanation.'
      }
    }
  },
  {
    id: 'card-4',
    cardNumber: 6,
    title: 'Neha Joshi',
    content: `📧 **Contact Information**
Email: neha.joshi@example.com

👤 **Personal Details**
Age: 31 • Gender: Female • City: Pune

🙏 **Spiritual Information**
Status: Married
Gnan Vidhi Year: 2019

❓ **Question**
How can I practice true forgiveness? I understand it intellectually but find it difficult to forgive from the heart.`,
    column: 'print',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    creatorUid: 'google-forms',
    assigneeUid: 'user-3',
    metadata: {
      source: 'google-forms',
      priority: 'Urgent',
      topic: 'Forgiveness',
      formData: {
        email: 'neha.joshi@example.com',
        firstname: 'Neha',
        lastname: 'Joshi',
        age: '31',
        gender: 'Female',
        city: 'Pune',
        status: 'Married',
        gnan_vidhi_year: '2019',
        english_question: 'How can I practice true forgiveness? I understand it intellectually but find it difficult to forgive from the heart.'
      }
    }
  },
  {
    id: 'card-5',
    cardNumber: 7,
    title: 'Kiran Mehta',
    content: `📧 **Contact Information**
Email: kiran.mehta@example.com
Phone: +91-9876123450

👤 **Personal Details**
Age: 55 • Gender: Male • City: Rajkot

🙏 **Spiritual Information**
Status: Married
Gnan Vidhi Year: 2012

❓ **Question**
What is the meaning of true happiness? How is it different from temporary pleasures and satisfaction?`,
    column: 'done',
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    creatorUid: 'google-forms',
    assigneeUid: 'user-1',
    metadata: {
      source: 'google-forms',
      topic: 'Happiness',
      formData: {
        email: 'kiran.mehta@example.com',
        firstname: 'Kiran',
        lastname: 'Mehta',
        age: '55',
        gender: 'Male',
        city: 'Rajkot',
        status: 'Married',
        gnan_vidhi_year: '2012',
        english_question: 'What is the meaning of true happiness? How is it different from temporary pleasures and satisfaction?',
        telephone: '+91-9876123450'
      }
    }
  }
];

// Form operations
export const formService = {
  // Create a new form
  createForm: async (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'submissionCount'>): Promise<string> => {
    // Ensure default templates exist for this user
    try {
      const existingTemplates = await templateService.getQATemplates();
      if (existingTemplates.length === 0) {
        await templateService.createDefaultTemplates(form.creatorUid);
      }
    } catch (error) {
      console.error('Error creating default templates:', error);
      // Continue with form creation even if template creation fails
    }

    // Clean the form data to remove undefined values
    const cleanFormData: any = {
      submissionCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Only include defined values
    Object.keys(form).forEach(key => {
      if (form[key as keyof typeof form] !== undefined) {
        cleanFormData[key] = form[key as keyof typeof form];
      }
    });

    const docRef = await addDoc(collection(firestore, 'forms'), cleanFormData);
    return docRef.id;
  },

  // Get form by ID
  getForm: async (formId: string): Promise<Form | null> => {
    const formRef = doc(firestore, 'forms', formId);
    const formSnap = await getDoc(formRef);
    
    if (formSnap.exists()) {
      const data = formSnap.data();
      return {
        id: formSnap.id,
        title: data.title,
        description: data.description,
        templateId: data.templateId,
        boardId: data.boardId,
        boardIntegration: data.boardIntegration,
        fields: data.fields || [],
        settings: data.settings || {},
        status: data.status,
        creatorUid: data.creatorUid,
        sharedWith: data.sharedWith || [],
        submissionCount: data.submissionCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
    }
    return null;
  },

  // Get forms accessible to a user
  getUserForms: async (userId: string, userRole: 'Admin' | 'Editor' | 'Viewer'): Promise<Form[]> => {
    let queries = [];
    
    if (userRole === 'Admin') {
      // Admins can see all forms
      queries.push(query(collection(firestore, 'forms'), orderBy('updatedAt', 'desc')));
    } else {
      // Users can see forms they created
      queries.push(query(
        collection(firestore, 'forms'),
        where('creatorUid', '==', userId),
        orderBy('updatedAt', 'desc')
      ));
      
      // Users can see forms shared with them
      queries.push(query(
        collection(firestore, 'forms'),
        where('sharedWith', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      ));
    }
    
    const forms: Form[] = [];
    const seenIds = new Set<string>();
    
    for (const q of queries) {
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        if (seenIds.has(doc.id)) return; // Avoid duplicates
        seenIds.add(doc.id);
        
        const data = doc.data();
        forms.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          templateId: data.templateId,
          boardId: data.boardId,
          boardIntegration: data.boardIntegration,
          fields: data.fields || [],
          settings: data.settings || {},
          status: data.status,
          creatorUid: data.creatorUid,
          sharedWith: data.sharedWith || [],
          submissionCount: data.submissionCount || 0,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        });
      });
    }
    
    // Sort by updatedAt desc
    return forms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  // Get forms for a specific board
  getBoardForms: async (boardId: string): Promise<Form[]> => {
    const q = query(
      collection(firestore, 'forms'),
      where('boardId', '==', boardId),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const forms: Form[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      forms.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        templateId: data.templateId,
        boardId: data.boardId,
        boardIntegration: data.boardIntegration,
        fields: data.fields || [],
        settings: data.settings || {},
        status: data.status,
        creatorUid: data.creatorUid,
        sharedWith: data.sharedWith || [],
        submissionCount: data.submissionCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      });
    });
    
    return forms;
  },

  // Update a form
  updateForm: async (formId: string, updates: Partial<Form>): Promise<void> => {
    const formRef = doc(firestore, 'forms', formId);
    
    // Clean the update data to remove undefined values
    const cleanUpdateData: any = {
      updatedAt: serverTimestamp(),
    };

    // Only include defined values
    Object.keys(updates).forEach(key => {
      if (updates[key as keyof typeof updates] !== undefined) {
        cleanUpdateData[key] = updates[key as keyof typeof updates];
      }
    });

    await updateDoc(formRef, cleanUpdateData);
  },

  // Delete a form
  deleteForm: async (formId: string): Promise<void> => {
    const formRef = doc(firestore, 'forms', formId);
    await deleteDoc(formRef);
  },

  // Duplicate a form
  duplicateForm: async (formId: string, newTitle: string, creatorUid: string): Promise<string> => {
    const originalForm = await formService.getForm(formId);
    if (!originalForm) throw new Error('Form not found');
    
    const duplicatedForm = {
      ...originalForm,
      title: newTitle,
      status: 'draft' as const,
      creatorUid,
      sharedWith: [],
      boardId: undefined, // Reset board assignment
    };
    
    delete (duplicatedForm as any).id;
    delete (duplicatedForm as any).createdAt;
    delete (duplicatedForm as any).updatedAt;
    delete (duplicatedForm as any).submissionCount;
    
    return await formService.createForm(duplicatedForm);
  },

  // Share form with users
  shareForm: async (formId: string, userIds: string[]): Promise<void> => {
    const formRef = doc(firestore, 'forms', formId);
    await updateDoc(formRef, {
      sharedWith: arrayUnion(...userIds),
      updatedAt: serverTimestamp(),
    });
  },

  // Unshare form from users
  unshareForm: async (formId: string, userIds: string[]): Promise<void> => {
    const formRef = doc(firestore, 'forms', formId);
    await updateDoc(formRef, {
      sharedWith: arrayRemove(...userIds),
      updatedAt: serverTimestamp(),
    });
  },

  // Check if user has access to form
  hasFormAccess: async (formId: string, userId: string, userRole: 'Admin' | 'Editor' | 'Viewer'): Promise<boolean> => {
    if (userRole === 'Admin') return true;
    
    const form = await formService.getForm(formId);
    if (!form) return false;
    
    return form.creatorUid === userId || form.sharedWith.includes(userId);
  },

  // Publish/Unpublish forms
  publishForm: async (formId: string): Promise<void> => {
    const formRef = doc(firestore, 'forms', formId);
    await updateDoc(formRef, {
      status: 'published',
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  unpublishForm: async (formId: string): Promise<void> => {
    const formRef = doc(firestore, 'forms', formId);
    await updateDoc(formRef, {
      status: 'draft',
      publishedAt: deleteField(),
      updatedAt: serverTimestamp(),
    });
  },

  // Get public form (for public submission)
  getPublicForm: async (formId: string): Promise<Form | null> => {
    const form = await formService.getForm(formId);
    if (!form || form.status !== 'published') return null;
    
    // Check access settings
    if (form.access?.startDate && new Date(form.access.startDate) > new Date()) return null;
    if (form.access?.endDate && new Date(form.access.endDate) < new Date()) return null;
    if (form.access?.maxSubmissions && (form.submissionCount || 0) >= form.access.maxSubmissions) return null;
    
    return form;
  },

  // Submit form response
  submitForm: async (submission: Omit<FormSubmission, 'id' | 'submittedAt'>): Promise<string> => {
    const docRef = await addDoc(collection(firestore, 'form_submissions'), {
      ...submission,
      status: 'pending',
      submittedAt: serverTimestamp(),
    });
    
    // Increment submission count
    const formRef = doc(firestore, 'forms', submission.formId);
    await updateDoc(formRef, {
      submissionCount: increment(1),
    });

    // Auto-create card via Google Cloud Function if board integration is enabled
    try {
      const form = await formService.getForm(submission.formId);
      if (form?.boardIntegration?.enabled && form.boardIntegration.autoCreateCards && form.boardId) {
        const fullSubmission: FormSubmission = {
          id: docRef.id,
          ...submission,
          submittedAt: new Date().toISOString(),
          status: 'pending',
        };
        
        // Call Google Cloud Function to create card
        await callGoogleCloudFunction(fullSubmission, form);
      }
    } catch (error) {
      console.error('Error calling Google Cloud Function for card creation:', error);
      // Don't fail the submission if card creation fails
    }
    
    return docRef.id;
  },

  // Get form submissions
  getFormSubmissions: async (formId: string): Promise<FormSubmission[]> => {
    const q = query(
      collection(firestore, 'form_submissions'),
      where('formId', '==', formId),
      orderBy('submittedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const submissions: FormSubmission[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      submissions.push({
        id: doc.id,
        formId: data.formId,
        boardId: data.boardId,
        responses: data.responses || {},
        submitterInfo: data.submitterInfo,
        cardId: data.cardId,
        status: data.status || 'pending',
        metadata: data.metadata,
        submittedAt: data.submittedAt?.toDate?.()?.toISOString() || data.submittedAt,
      });
    });
    
    return submissions;
  },

  // Update submission
  updateSubmission: async (submissionId: string, updates: Partial<FormSubmission>): Promise<void> => {
    const submissionRef = doc(firestore, 'form_submissions', submissionId);
    await updateDoc(submissionRef, updates);
  },

  // Delete submission
  deleteSubmission: async (submissionId: string): Promise<void> => {
    const submissionRef = doc(firestore, 'form_submissions', submissionId);
    await deleteDoc(submissionRef);
  },
};

// Form Template Service
export const templateService = {
  // Clear all existing templates and recreate defaults
  resetDefaultTemplates: async (creatorUid: string): Promise<void> => {
    try {
      // Clear existing default templates
      const existingTemplatesQuery = query(
        collection(firestore, 'form_templates'),
        where('isDefault', '==', true)
      );
      const existingSnapshot = await getDocs(existingTemplatesQuery);
      
      // Delete existing default templates
      const deletePromises = existingSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('Cleared existing default templates');
      
      // Create new default templates
      await templateService.createDefaultTemplates(creatorUid);
      console.log('Created new default templates');
    } catch (error) {
      console.error('Error resetting templates:', error);
      throw error;
    }
  },

  // Create default Q&A templates
  createDefaultTemplates: async (creatorUid: string): Promise<void> => {
    const defaultTemplates: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'DadaBhagwan Q&A Form - Official',
        description: 'Official form template matching Google Forms structure for Gnani Pujyashree questions',
        category: 'qa',
        fields: [
          {
            id: 'email',
            type: 'email',
            label: 'Email',
            description: 'Your email address',
            placeholder: 'your@email.com',
            validation: { required: true },
            order: 1,
          },
          {
            id: 'firstname',
            type: 'text',
            label: 'Firstname',
            description: 'Your first name',
            placeholder: 'Enter your first name',
            validation: { required: true, maxLength: 50 },
            order: 2,
          },
          {
            id: 'lastname',
            type: 'text',
            label: 'Lastname',
            description: 'Your last name',
            placeholder: 'Enter your last name',
            validation: { required: true, maxLength: 50 },
            order: 3,
          },
          {
            id: 'age',
            type: 'number',
            label: 'Age',
            description: 'Your age',
            placeholder: 'Enter your age',
            validation: { required: true, min: 1, max: 120 },
            order: 4,
          },
          {
            id: 'gender',
            type: 'radio',
            label: 'Gender',
            description: 'Select your gender',
            options: [
              { id: 'male', label: 'Male', value: 'Male' },
              { id: 'female', label: 'Female', value: 'Female' },
            ],
            validation: { required: true },
            order: 5,
          },
          {
            id: 'city',
            type: 'text',
            label: 'City',
            description: 'Your city of residence',
            placeholder: 'Enter your city',
            validation: { required: true, maxLength: 100 },
            order: 6,
          },
          {
            id: 'status',
            type: 'radio',
            label: 'Status',
            description: 'Your participation status',
            options: [
              { id: 'new-participant', label: 'I am a new participant', value: 'I am a new participant' },
              { id: 'mahatma', label: 'I am a Mahatma (Reviewer)', value: 'I am a Mahatma (Reviewer)' },
            ],
            validation: { required: true },
            order: 7,
          },
          {
            id: 'gnan-vidhi-year',
            type: 'text',
            label: 'When did you receive your first Gnan Vidhi? Select the year 2025, when you are a new participant.',
            description: 'Enter the year you received your first Gnan Vidhi (use 2025 if you are a new participant)',
            placeholder: '2025',
            defaultValue: '2025',
            validation: { required: true },
            order: 8,
          },
          {
            id: 'english-question',
            type: 'textarea',
            label: 'ENGLISH - Your question to Gnani Pujyashree. Please keep it short and concise. Thank you.',
            description: 'Write your question in English - keep it short and concise',
            placeholder: 'Enter your question to Gnani Pujyashree...',
            validation: { required: true, maxLength: 1000 },
            order: 9,
          },
          {
            id: 'telephone',
            type: 'phone',
            label: 'Telephone number (in case of queries) i.e. +1-652-765-1234',
            description: 'Your phone number with country code',
            placeholder: '+1-652-765-1234',
            validation: { required: true },
            order: 10,
          },
          {
            id: 'remarks',
            type: 'textarea',
            label: 'Remarks',
            description: 'Any additional remarks (optional)',
            placeholder: 'Enter any additional remarks...',
            validation: { required: false, maxLength: 500 },
            order: 11,
          },
        ],
        boardMapping: {
          titleField: 'english-question',
          contentField: 'english-question',
          priorityField: 'status',
          categoryField: 'status',
        },
        requiredForBoard: true,
        isDefault: true,
        creatorUid,
      },
      {
        name: 'DadaBhagwan Q&A Form - Simplified',
        description: 'Simplified form for quick questions to Gnani Pujyashree',
        category: 'qa',
        fields: [
          {
            id: 'email',
            type: 'email',
            label: 'Email',
            description: 'Your email address',
            placeholder: 'your@email.com',
            validation: { required: true },
            order: 1,
          },
          {
            id: 'name',
            type: 'text',
            label: 'Name',
            description: 'Your full name',
            placeholder: 'Enter your full name',
            validation: { required: true, maxLength: 100 },
            order: 2,
          },
          {
            id: 'city',
            type: 'text',
            label: 'City',
            description: 'Your city of residence',
            placeholder: 'Enter your city',
            validation: { required: true, maxLength: 100 },
            order: 3,
          },
          {
            id: 'status',
            type: 'radio',
            label: 'Status',
            description: 'Your participation status',
            options: [
              { id: 'new-participant', label: 'I am a new participant', value: 'I am a new participant' },
              { id: 'mahatma', label: 'I am a Mahatma (Reviewer)', value: 'I am a Mahatma (Reviewer)' },
            ],
            validation: { required: true },
            order: 4,
          },
          {
            id: 'english-question',
            type: 'textarea',
            label: 'ENGLISH - Your question to Gnani Pujyashree. Please keep it short and concise. Thank you.',
            description: 'Write your question in English - keep it short and concise',
            placeholder: 'Enter your question to Gnani Pujyashree...',
            validation: { required: true, maxLength: 1000 },
            order: 5,
          },
          {
            id: 'telephone',
            type: 'phone',
            label: 'Telephone number (in case of queries)',
            description: 'Your phone number with country code (optional)',
            placeholder: '+1-652-765-1234',
            validation: { required: false },
            order: 6,
          },
        ],
        boardMapping: {
          titleField: 'english-question',
          contentField: 'english-question',
          priorityField: 'status',
          categoryField: 'status',
        },
        requiredForBoard: true,
        isDefault: true,
        creatorUid,
      },
    ];

    for (const template of defaultTemplates) {
      await addDoc(collection(firestore, 'form_templates'), {
        ...template,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  },

  // Get all templates
  getTemplates: async (userUid?: string): Promise<FormTemplate[]> => {
    let q;
    if (userUid) {
      q = query(
        collection(firestore, 'form_templates'),
        where('creatorUid', '==', userUid),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(firestore, 'form_templates'),
        orderBy('isDefault', 'desc'),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const templates: FormTemplate[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        fields: data.fields || [],
        boardMapping: data.boardMapping,
        requiredForBoard: data.requiredForBoard || false,
        isDefault: data.isDefault || false,
        creatorUid: data.creatorUid,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return templates;
  },

  // Get template by ID
  getTemplate: async (templateId: string): Promise<FormTemplate | null> => {
    const templateDoc = await getDoc(doc(firestore, 'form_templates', templateId));
    if (!templateDoc.exists()) return null;

    const data = templateDoc.data();
    return {
      id: templateDoc.id,
      name: data.name,
      description: data.description,
      category: data.category,
      fields: data.fields || [],
      boardMapping: data.boardMapping,
      requiredForBoard: data.requiredForBoard || false,
      isDefault: data.isDefault || false,
      creatorUid: data.creatorUid,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };
  },

  // Create template
  createTemplate: async (template: Omit<FormTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const docRef = await addDoc(collection(firestore, 'form_templates'), {
      ...template,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Get Q&A templates for board integration
  getQATemplates: async (): Promise<FormTemplate[]> => {
    const q = query(
      collection(firestore, 'form_templates'),
      where('category', '==', 'qa'),
      where('requiredForBoard', '==', true),
      orderBy('isDefault', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const templates: FormTemplate[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        fields: data.fields || [],
        boardMapping: data.boardMapping,
        requiredForBoard: data.requiredForBoard || false,
        isDefault: data.isDefault || false,
        creatorUid: data.creatorUid,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return templates;
  },
};

// Board Integration Service
export const boardIntegrationService = {
  // Associate form with board and set up integration
  associateFormWithBoard: async (formId: string, boardId: string, integration: BoardIntegration): Promise<void> => {
    const formRef = doc(firestore, 'forms', formId);
    await updateDoc(formRef, {
      boardId,
      boardIntegration: integration,
      updatedAt: serverTimestamp(),
    });
  },

  // Create card from form submission
  createCardFromSubmission: async (submission: FormSubmission, form: Form): Promise<string | null> => {
    if (!form.boardIntegration?.enabled || !form.boardId) return null;

    const { fieldMapping, cardTemplate, defaultColumn } = form.boardIntegration;
    
    // Extract values from submission
    const titleValue = submission.responses[fieldMapping.titleField] || 'Untitled Question';
    const contentValue = submission.responses[fieldMapping.contentField] || 'No details provided';
    const priorityValue = fieldMapping.priorityField ? (submission.responses[fieldMapping.priorityField] || cardTemplate?.defaultPriority || 'Medium') : (cardTemplate?.defaultPriority || 'Medium');
    const categoryValue = fieldMapping.categoryField ? (submission.responses[fieldMapping.categoryField] || 'General') : 'General';

    // Format card content
    let formattedContent = contentValue;
    if (cardTemplate?.contentFormat) {
      formattedContent = cardTemplate.contentFormat
        .replace('{content}', contentValue)
        .replace('{priority}', priorityValue)
        .replace('{category}', categoryValue);
    }

    // Create enhanced card content for DadaBhagwan forms
    let enhancedContent = formattedContent;
    if (submission.responses['firstname'] && submission.responses['lastname']) {
      const name = `${submission.responses['firstname']} ${submission.responses['lastname']}`;
      const email = submission.responses['email'] || 'No email provided';
      const city = submission.responses['city'] || 'No city provided';
      const age = submission.responses['age'] || 'No age provided';
      const gender = submission.responses['gender'] || 'No gender provided';
      const telephone = submission.responses['telephone'] || 'No phone provided';
      
      enhancedContent = `Question: ${contentValue}

Participant Details:
Name: ${name}
Email: ${email}
City: ${city}
Age: ${age}
Gender: ${gender}
Phone: ${telephone}
Status: ${priorityValue}

Category: ${categoryValue}`;
    }

    // Create the card
    const cardData: Omit<Card, 'id' | 'createdAt' | 'cardNumber'> = {
      title: cardTemplate?.titlePrefix ? `${cardTemplate.titlePrefix} ${titleValue}` : titleValue,
      content: enhancedContent,
      column: defaultColumn,
      creatorUid: 'form-system',
      assigneeUid: cardTemplate?.defaultAssignee,
      boardId: form.boardId,
      updatedAt: new Date().toISOString(),
      metadata: {
        source: 'form_submission',
        formData: submission.responses,
        formSubmissionId: submission.id,
        submissionTimestamp: submission.submittedAt,
        priority: priorityValue,
        topic: categoryValue,
        originalFormId: form.id,
        participantName: submission.responses['firstname'] && submission.responses['lastname'] 
          ? `${submission.responses['firstname']} ${submission.responses['lastname']}` 
          : submission.responses['name'] || 'Unknown',
        participantEmail: submission.responses['email'] || '',
        participantCity: submission.responses['city'] || '',
        participantPhone: submission.responses['telephone'] || '',
      },
    };

    const cardId = await cardService.addCard(cardData);

    // Update submission with card reference
    await formService.updateSubmission(submission.id, {
      cardId,
      status: 'processed',
    });

    return cardId;
  },

  // Process pending submissions for a form
  processPendingSubmissions: async (formId: string): Promise<number> => {
    const form = await formService.getForm(formId);
    if (!form || !form.boardIntegration?.enabled) return 0;

    const submissions = await formService.getFormSubmissions(formId);
    const pendingSubmissions = submissions.filter(s => s.status === 'pending');

    let processedCount = 0;
    for (const submission of pendingSubmissions) {
      try {
        await boardIntegrationService.createCardFromSubmission(submission, form);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process submission ${submission.id}:`, error);
      }
    }

    return processedCount;
  },

  // Get forms associated with a board
  getBoardIntegratedForms: async (boardId: string): Promise<Form[]> => {
    const q = query(
      collection(firestore, 'forms'),
      where('boardId', '==', boardId),
      where('boardIntegration.enabled', '==', true),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const forms: Form[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      forms.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        templateId: data.templateId,
        boardId: data.boardId,
        boardIntegration: data.boardIntegration,
        fields: data.fields || [],
        settings: data.settings || {},
        status: data.status,
        creatorUid: data.creatorUid,
        sharedWith: data.sharedWith || [],
        submissionCount: data.submissionCount || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      });
    });

    return forms;
  },
};

// Satsang Centers Service
export const centersService = {
  // Create a new center
  createCenter: async (center: Omit<SatsangCenter, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const docRef = await addDoc(collection(firestore, 'centers'), {
      ...center,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Get all centers
  getCenters: async (): Promise<SatsangCenter[]> => {
    const q = query(
      collection(firestore, 'centers'),
      where('status', '==', 'active'),
      orderBy('country'),
      orderBy('state'),
      orderBy('city')
    );

    const snapshot = await getDocs(q);
    const centers: SatsangCenter[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      centers.push({
        id: doc.id,
        name: data.name,
        city: data.city,
        state: data.state,
        country: data.country,
        contactPerson: data.contactPerson,
        contactInfo: data.contactInfo || {},
        status: data.status || 'active',
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return centers;
  },

  // Get center by ID
  getCenter: async (centerId: string): Promise<SatsangCenter | null> => {
    const docRef = doc(firestore, 'centers', centerId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        id: snapshot.id,
        name: data.name,
        city: data.city,
        state: data.state,
        country: data.country,
        contactPerson: data.contactPerson,
        contactInfo: data.contactInfo || {},
        status: data.status || 'active',
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    }
    return null;
  },

  // Update center
  updateCenter: async (centerId: string, updates: Partial<Omit<SatsangCenter, 'id' | 'createdAt'>>): Promise<void> => {
    const centerRef = doc(firestore, 'centers', centerId);
    await updateDoc(centerRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete center (soft delete by setting status to inactive)
  deleteCenter: async (centerId: string): Promise<void> => {
    const centerRef = doc(firestore, 'centers', centerId);
    await updateDoc(centerRef, {
      status: 'inactive',
      updatedAt: serverTimestamp(),
    });
  },

  // Search centers by location
  searchCenters: async (searchTerm: string): Promise<SatsangCenter[]> => {
    const centers = await centersService.getCenters();
    
    if (!searchTerm.trim()) return centers;
    
    const searchLower = searchTerm.toLowerCase();
    return centers.filter(center => 
      center.name.toLowerCase().includes(searchLower) ||
      center.city.toLowerCase().includes(searchLower) ||
      center.state.toLowerCase().includes(searchLower) ||
      center.country.toLowerCase().includes(searchLower) ||
      center.contactPerson.toLowerCase().includes(searchLower)
    );
  },

  // Get centers by country
  getCentersByCountry: async (country: string): Promise<SatsangCenter[]> => {
    const q = query(
      collection(firestore, 'centers'),
      where('country', '==', country),
      where('status', '==', 'active'),
      orderBy('state'),
      orderBy('city')
    );

    const snapshot = await getDocs(q);
    const centers: SatsangCenter[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      centers.push({
        id: doc.id,
        name: data.name,
        city: data.city,
        state: data.state,
        country: data.country,
        contactPerson: data.contactPerson,
        contactInfo: data.contactInfo || {},
        status: data.status || 'active',
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      });
    });

    return centers;
  },
}; 

// Edit Lock Service for preventing concurrent card edits
export const editLockService = {
  // Acquire edit lock for a card
  acquireEditLock: async (cardId: string, userId: string, boardId: string): Promise<boolean> => {
    const cardRef = doc(firestore, 'cards', cardId);
    
    try {
      const result = await runTransaction(firestore, async (transaction) => {
        const cardDoc = await transaction.get(cardRef);
        
        if (!cardDoc.exists()) {
          throw new Error('Card not found');
        }
        
        const cardData = cardDoc.data();
        const editingStatus = cardData.editingStatus;
        
        // Check if card is already locked by another user
        if (editingStatus?.isLocked && editingStatus.lockedBy !== userId) {
          // Check if lock has expired (locks auto-expire after 10 minutes)
          const lockExpiry = new Date(editingStatus.lockExpiry || 0);
          const now = new Date();
          
          if (lockExpiry > now) {
            // Lock is still active for another user
            return false;
          }
        }
        
        // Acquire or refresh the lock
        const lockExpiry = new Date();
        lockExpiry.setMinutes(lockExpiry.getMinutes() + 10); // 10-minute lock
        
        transaction.update(cardRef, {
          editingStatus: {
            isLocked: true,
            lockedBy: userId,
            lockedAt: new Date().toISOString(),
            lockExpiry: lockExpiry.toISOString(),
          },
          updatedAt: serverTimestamp(),
        });
        
        return true;
      });
      
      return result;
    } catch (error) {
      console.error('Failed to acquire edit lock:', error);
      return false;
    }
  },

  // Release edit lock for a card
  releaseEditLock: async (cardId: string, userId: string, boardId: string): Promise<void> => {
    const cardRef = doc(firestore, 'cards', cardId);
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const cardDoc = await transaction.get(cardRef);
        
        if (!cardDoc.exists()) {
          return;
        }
        
        const cardData = cardDoc.data();
        const editingStatus = cardData.editingStatus;
        
        // Only release if locked by the current user
        if (editingStatus?.isLocked && editingStatus.lockedBy === userId) {
          transaction.update(cardRef, {
            editingStatus: {
              isLocked: false,
              lockedBy: null,
              lockedAt: null,
              lockExpiry: null,
            },
            updatedAt: serverTimestamp(),
          });
        }
      });
    } catch (error) {
      console.error('Failed to release edit lock:', error);
    }
  },

  // Refresh edit lock (extend expiry time)
  refreshEditLock: async (cardId: string, userId: string, boardId: string): Promise<boolean> => {
    const cardRef = doc(firestore, 'cards', cardId);
    
    try {
      const result = await runTransaction(firestore, async (transaction) => {
        const cardDoc = await transaction.get(cardRef);
        
        if (!cardDoc.exists()) {
          return false;
        }
        
        const cardData = cardDoc.data();
        const editingStatus = cardData.editingStatus;
        
        // Only refresh if locked by the current user
        if (editingStatus?.isLocked && editingStatus.lockedBy === userId) {
          const lockExpiry = new Date();
          lockExpiry.setMinutes(lockExpiry.getMinutes() + 10); // Extend by 10 minutes
          
          transaction.update(cardRef, {
            'editingStatus.lockExpiry': lockExpiry.toISOString(),
            'editingStatus.lockedAt': new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
          
          return true;
        }
        
        return false;
      });
      
      return result;
    } catch (error) {
      console.error('Failed to refresh edit lock:', error);
      return false;
    }
  },

  // Check if card is locked by another user
  isCardLocked: (card: Card, currentUserId: string): { isLocked: boolean; lockedBy?: string; lockedByName?: string } => {
    const editingStatus = card.editingStatus;
    
    if (!editingStatus?.isLocked) {
      return { isLocked: false };
    }
    
    // Check if lock has expired
    const lockExpiry = new Date(editingStatus.lockExpiry || 0);
    const now = new Date();
    
    if (lockExpiry <= now) {
      return { isLocked: false };
    }
    
    // Check if locked by current user
    if (editingStatus.lockedBy === currentUserId) {
      return { isLocked: false };
    }
    
    return {
      isLocked: true,
      lockedBy: editingStatus.lockedBy,
    };
  },

  // Clean up expired locks (utility function to be called periodically)
  cleanupExpiredLocks: async (boardId: string): Promise<void> => {
    const cardsRef = collection(firestore, 'cards');
    const q = query(cardsRef, where('editingStatus.isLocked', '==', true), where('boardId', '==', boardId));
    
    try {
      const snapshot = await getDocs(q);
      const now = new Date();
      const batch = writeBatch(firestore);
      let hasUpdates = false;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const editingStatus = data.editingStatus;
        
        if (editingStatus?.lockExpiry) {
          const lockExpiry = new Date(editingStatus.lockExpiry);
          
          if (lockExpiry <= now) {
            // Lock has expired, release it
            batch.update(doc.ref, {
              editingStatus: {
                isLocked: false,
                lockedBy: null,
                lockedAt: null,
                lockExpiry: null,
              },
              updatedAt: serverTimestamp(),
            });
            hasUpdates = true;
          }
        }
      });
      
      if (hasUpdates) {
        await batch.commit();
        console.log('Cleaned up expired edit locks for board:', boardId);
      }
    } catch (error) {
      console.error('Failed to cleanup expired locks:', error);
    }
  },
}; 