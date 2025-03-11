import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc",
  authDomain: "urbindex-d69e1.firebaseapp.com",
  projectId: "urbindex-d69e1",
  storageBucket: "urbindex-d69e1.firebasestorage.app",
  messagingSenderId: "889914696327",
  appId: "1:889914696327:web:351daa656a4d12fa828e22"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
