import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  setPersistence,
  connectAuthEmulator,
  type User,
} from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCJxEIioLgCJyhxAU4MZKJ9wDpifhDFI_I',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'animplay-872d3.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'animplay-872d3',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'animplay-872d3.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '17856885980',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:17856885980:web:c5960e0607b66e27793019',
};

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
export const firebaseApp = initializeApp(useEmulators ? { ...firebaseConfig, projectId: 'demo-animplay', apiKey: 'demo-api-key', authDomain: 'localhost' } : firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

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

  return authReadyPromise.then(() => auth.currentUser);
}

export async function requireUser(): Promise<User> {
  const user = auth.currentUser || await waitForAuth();
  if (!user) throw new Error('Please sign in to continue.');
  return user;
}

export function isPermanentUser(user: User): boolean {
  return !user.isAnonymous;
}

export async function isHostAccount(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (isPermanentUser(user)) return true;

  const profile = await getDoc(doc(db, 'users', user.uid));
  return profile.exists() && profile.data().isHost === true;
}

export async function createUsernameAccount(): Promise<User> {
  return auth.currentUser || (await signInAnonymously(auth)).user;
}
