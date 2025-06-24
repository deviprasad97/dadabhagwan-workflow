import {
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
  arrayRemove
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { Card, User, ColumnId, Board } from './types';
import { mockUsers } from './mock-data';

// Collections
const CARDS_COLLECTION = 'cards';
const USERS_COLLECTION = 'users';
const BOARDS_COLLECTION = 'boards';
const AUDIT_COLLECTION = 'audit_logs';

// Default board ID for migration
const DEFAULT_BOARD_ID = 'default-board';

// Seed database with mock data if empty
export const seedMockData = async (): Promise<void> => {
  try {
    // Ensure default board exists first
    const defaultBoard = await boardService.getBoard(DEFAULT_BOARD_ID);
    if (!defaultBoard) {
      await setDoc(doc(firestore, BOARDS_COLLECTION, DEFAULT_BOARD_ID), {
        name: 'Main Board',
        description: 'Default board for all questions',
        creatorUid: 'system',
        isDefault: true,
        sharedWith: [],
        settings: {},
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
    } else {
      console.log('Database already has data, skipping card seed.');
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
          title: data.title,
          content: data.content,
          creatorUid: data.creatorUid,
          assigneeUid: data.assigneeUid,
          column: data.column,
          boardId: data.boardId || DEFAULT_BOARD_ID, // Migration support
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
  addCard: async (card: Omit<Card, 'id' | 'createdAt'>): Promise<string> => {
    const docRef = await addDoc(collection(firestore, CARDS_COLLECTION), {
      ...card,
      boardId: card.boardId || DEFAULT_BOARD_ID,
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
        title: data.title,
        content: data.content,
        creatorUid: data.creatorUid,
        assigneeUid: data.assigneeUid,
        column: data.column,
        boardId: data.boardId || DEFAULT_BOARD_ID, // Migration support
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        metadata: data.metadata,
      });
    });
    return cards;
  },
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
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      };
    }
    return null;
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

  // Update a board
  updateBoard: async (boardId: string, updates: Partial<Board>): Promise<void> => {
    const boardRef = doc(firestore, BOARDS_COLLECTION, boardId);
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(boardRef, updateData);
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
      await setDoc(doc(firestore, BOARDS_COLLECTION, DEFAULT_BOARD_ID), {
        name: 'Main Board',
        description: 'Default board for all questions',
        creatorUid: 'system',
        isDefault: true,
        sharedWith: [],
        settings: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  },
};

// Create mock cards with realistic data
const mockCards: Card[] = [
  {
    id: 'card-1',
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