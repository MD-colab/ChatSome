// firebase-config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// TODO: Add other Firebase services if needed, e.g., getFirestore, getStorage

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBa-pFNITxksJzz4kvDFXvYHfIzQZyjy_w",
  authDomain: "chatsome-a2c06.firebaseapp.com",
  projectId: "chatsome-a2c06",
  storageBucket: "chatsome-a2c06.firebasestorage.app",
  messagingSenderId: "704669977989",
  appId: "1:704669977989:web:ffe60426166c88bc8e08ec",
  measurementId: "G-SZ7P0CF4ZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// You can export other initialized services here if you add them
// export const db = getFirestore(app);
// export const storage = getStorage(app);