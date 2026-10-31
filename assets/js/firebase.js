// Firebase Configuration for Jisnu Hazra Photography Portfolio
// Project: portfolio-95cdb

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBv97veTXEP56ZLfcIs4ZTyS35LCJkjbjY",
  authDomain: "portfolio-95cdb.firebaseapp.com",
  projectId: "portfolio-95cdb",
  storageBucket: "portfolio-95cdb.firebasestorage.app",
  messagingSenderId: "26723287715",
  appId: "1:26723287715:web:25b4fd7150d72c05e6f516"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log("Firebase initialized for portfolio-95cdb");
