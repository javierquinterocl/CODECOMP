import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, FacebookAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

let db = null;
let auth = null;
let googleProvider = null;
let githubProvider = null;
let facebookProvider = null;

if (hasFirebaseConfig) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  githubProvider = new GithubAuthProvider();
  githubProvider.addScope('user:email');
  githubProvider.setCustomParameters({ 
    allow_signup: 'true',
    prompt: 'login' // Fuerza seleccionar cuenta GitHub
  });

  facebookProvider = new FacebookAuthProvider();
  facebookProvider.addScope('email');
  facebookProvider.setCustomParameters({ 
    prompt: 'login' // Fuerza seleccionar cuenta Facebook
  });

}

export { auth, db, hasFirebaseConfig, googleProvider, githubProvider, facebookProvider };
