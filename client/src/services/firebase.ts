import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  type User,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCJxEIioLgCJyhxAU4MZKJ9wDpifhDFI_I',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'animplay-872d3.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'animplay-872d3',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'animplay-872d3.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '17856885980',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:17856885980:web:c5960e0607b66e27793019',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

void setPersistence(auth, browserLocalPersistence);

let authReadyPromise: Promise<User | null> | null = null;

export function waitForAuth(): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  if (!authReadyPromise) {
    authReadyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  return authReadyPromise;
}

export async function requireUser(): Promise<User> {
  const user = auth.currentUser || await waitForAuth();
  if (!user) throw new Error('Please sign in to continue.');
  return user;
}

export function isPermanentUser(user: User): boolean {
  return !user.isAnonymous;
}
