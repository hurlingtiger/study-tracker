// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDjz4jW88zorPAgsvFuVHpdBEmNOMAUpPU",
  authDomain: "study-tracker-e44d4.firebaseapp.com",
  databaseURL: "https://study-tracker-e44d4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "study-tracker-e44d4",
  storageBucket: "study-tracker-e44d4.firebasestorage.app",
  messagingSenderId: "708566753387",
  appId: "1:708566753387:web:0dc42396297cff9cb8112e",
  measurementId: "G-YXW8V9VL0V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);