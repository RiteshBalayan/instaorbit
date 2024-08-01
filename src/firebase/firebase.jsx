import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import store from '../Store/store'; // import the store
import { setUser, clearUser } from '../Store/authSlice';
import 'firebase/firestore';
import 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCudNeubH3iECgWrQm5HqQyaeWcczT4NCQ",
    authDomain: "instaorbit-111bc.firebaseapp.com",
    projectId: "instaorbit-111bc",
    storageBucket: "instaorbit-111bc.appspot.com",
    messagingSenderId: "760654101767", 
    appId: "1:760654101767:web:8783a6ff95cb13f93019a2",
    measurementId: "G-XQZ5F22ELJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// Listen to auth state changes and dispatch appropriate actions
onAuthStateChanged(auth, (user) => {
    if (user) {
      store.dispatch(setUser(user));
    } else {
      store.dispatch(clearUser());
    }
  });

export { db, auth, googleProvider };


