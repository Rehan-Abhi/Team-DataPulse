import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7Ap2635FQCVTRGy-CjNaQvLpp2pCdtBA",
  authDomain: "s4s-app-709e8.firebaseapp.com",
  projectId: "s4s-app-709e8",
  storageBucket: "s4s-app-709e8.firebasestorage.app",
  messagingSenderId: "671053529576",
  appId: "1:671053529576:web:ffaed94040adab3300a45d",
  measurementId: "G-YH1Z9L7Y03"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();