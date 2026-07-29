import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Wartości pochodzą z .env.local (patrz .env.example) — NIE commituj prawdziwych
// kluczy do repo. Skopiuj .env.example do .env.local i uzupełnij danymi z konsoli
// Firebase (Project settings -> General -> Your apps -> SDK setup and configuration).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// TODO (faza 3 roadmapy): dodać funkcje saveTransaction() / listTransactions(year)
// korzystające z `db`, wywoływane z App.tsx po udanym obliczeniu ceny.
