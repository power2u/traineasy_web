import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBhMVDLD_jtcdVvk7xjqlzFQnnchBD7DR8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "new-trainer-project.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://new-trainer-project-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "new-trainer-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "new-trainer-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "371334856577",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:371334856577:web:e36db919fc455f500b3280",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-6B0X83G6CC"
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Enhanced initialization with error handling
const initializeFirebase = async () => {
  try {
    // Only initialize on client side
    if (typeof window === 'undefined') {
      console.log('[Firebase] Server-side environment detected, skipping client initialization');
      return;
    }

    // Initialize Firebase app
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    console.log('[Firebase] App initialized successfully');
    
    // Initialize messaging only if supported and in secure context
    try {
      const supported = await isSupported();
      if (supported && window.isSecureContext) {
        messaging = getMessaging(app);
        console.log('[Firebase] Messaging initialized successfully');
      } else {
        console.warn('[Firebase] Messaging not supported or not in secure context');
      }
    } catch (messagingError) {
      console.warn('[Firebase] Failed to initialize messaging:', messagingError);
      // Don't throw error, just log warning
    }
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error);
    // Don't throw error in production to prevent app crash
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }
};

// Initialize Firebase when module loads (client-side only)
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// Helper function to get messaging safely
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  try {
    if (typeof window === 'undefined') {
      console.warn('[Firebase] getFirebaseMessaging called on server-side');
      return null;
    }

    if (!messaging) {
      const supported = await isSupported();
      if (supported && window.isSecureContext && app) {
        messaging = getMessaging(app);
      }
    }
    
    return messaging;
  } catch (error) {
    console.warn('[Firebase] Failed to get messaging:', error);
    return null;
  }
};

// Helper function to check if Firebase is available
export const isFirebaseAvailable = (): boolean => {
  return typeof window !== 'undefined' && app !== null;
};

export { app, messaging, firebaseConfig };
