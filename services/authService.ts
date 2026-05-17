import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInAnonymously as firebaseAnon,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

export async function loginComGoogle(
  idToken: string | null,
  accessToken: string | null = null
): Promise<User> {
  const credential = GoogleAuthProvider.credential(idToken, accessToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
}

export async function loginComEmail(email: string, senha: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, senha);
  return result.user;
}

export async function loginAnonimo(): Promise<User> {
  const result = await firebaseAnon(auth);
  return result.user;
}

export async function sairDaConta(): Promise<void> {
  await firebaseSignOut(auth);
}
