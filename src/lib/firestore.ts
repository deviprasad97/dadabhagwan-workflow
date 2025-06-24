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
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { Card, User, ColumnId } from './types';
import { mockCards, mockUsers } from './mock-data';

// Collections
const CARDS_COLLECTION = 'cards';
const USERS_COLLECTION = 'users';
const AUDIT_COLLECTION = 'audit_logs';

// Seed database with mock data if empty
export const seedMockData = async (): Promise<void> => {
  try {
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
      
      // Add mock cards (filter out undefined values)
      for (const card of mockCards) {
        const cardData: any = {
          title: card.title,
          content: card.content,
          creatorUid: card.creatorUid,
          column: card.column,
          createdAt: serverTimestamp(),
        };
        
        // Only add fields that are not undefined
        if (card.gujaratiTranslation !== undefined) {
          cardData.gujaratiTranslation = card.gujaratiTranslation;
        }
        
        if (card.assigneeUid !== undefined) {
          cardData.assigneeUid = card.assigneeUid;
        }
        
        await addDoc(collection(firestore, CARDS_COLLECTION), cardData);
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
  // Get all cards with real-time updates
  subscribeToCards: (callback: (cards: Card[]) => void): Unsubscribe => {
    const q = query(
      collection(firestore, CARDS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const cards: Card[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        cards.push({
          id: doc.id,
          title: data.title,
          content: data.content,
          gujaratiTranslation: data.gujaratiTranslation,
          creatorUid: data.creatorUid,
          assigneeUid: data.assigneeUid,
          column: data.column,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        });
      });
      callback(cards);
    }, (error) => {
      console.error('Error in cards subscription:', error);
      // Return empty array on error to prevent UI crashes
      callback([]);
    });
  },

  // Add a new card
  addCard: async (card: Omit<Card, 'id' | 'createdAt'>): Promise<string> => {
    const docRef = await addDoc(collection(firestore, CARDS_COLLECTION), {
      ...card,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Update a card
  updateCard: async (cardId: string, updates: Partial<Card>): Promise<void> => {
    const cardRef = doc(firestore, CARDS_COLLECTION, cardId);
    await updateDoc(cardRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
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

  // Get cards by column
  getCardsByColumn: async (column: ColumnId): Promise<Card[]> => {
    const q = query(
      collection(firestore, CARDS_COLLECTION),
      where('column', '==', column),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const cards: Card[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      cards.push({
        id: doc.id,
        title: data.title,
        content: data.content,
        gujaratiTranslation: data.gujaratiTranslation,
        creatorUid: data.creatorUid,
        assigneeUid: data.assigneeUid,
        column: data.column,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
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