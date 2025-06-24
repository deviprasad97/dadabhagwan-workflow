// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug logging
console.log('Firebase Config Check:', {
  apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
  authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
  projectId: firebaseConfig.projectId ? '✅ Set' : '❌ Missing',
  storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
  appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing',
});

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let googleProvider: GoogleAuthProvider;

// This check prevents Firebase from being initialized more than once.
if (getApps().length === 0) {
    // Check that the config is populated
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        console.log('Initializing Firebase with config:', firebaseConfig);
        app = initializeApp(firebaseConfig);
        firestore = getFirestore(app);
    } else {
        console.error("Firebase config is missing or incomplete. Authentication and database features will be disabled.");
        console.error("Please check your .env.local file and ensure all Firebase configuration values are set.");
        // Create dummy objects if config is missing to avoid crashing the app
        app = {} as FirebaseApp;
        firestore = {} as Firestore;
    }
} else {
    app = getApp();
    firestore = getFirestore(app);
}

// Initialize auth and provider, even if the app object is a dummy
auth = getAuth(app);
googleProvider = new GoogleAuthProvider();

// Configure Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { app, auth, firestore, googleProvider };
