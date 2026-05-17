import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, Persistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCwfyi3BAia9uaRJghgc8GJ1xG2x-n7mRg',
  authDomain: 'casa-da-crianca-estoque.firebaseapp.com',
  projectId: 'casa-da-crianca-estoque',
  storageBucket: 'casa-da-crianca-estoque.firebasestorage.app',
  messagingSenderId: '248660348216',
  appId: '1:248660348216:web:beb4b7585d30051b0d85cd',
};

const app = initializeApp(firebaseConfig);

// Web: browserLocalPersistence (localStorage)
// Native: getReactNativePersistence via AsyncStorage
// eslint-disable-next-line @typescript-eslint/no-require-imports
const persistence: Persistence = Platform.OS === 'web'
  ? browserLocalPersistence
  : (require('@firebase/auth').getReactNativePersistence(AsyncStorage) as Persistence);

export const auth = initializeAuth(app, { persistence });

export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

export default app;
