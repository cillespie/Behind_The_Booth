// ==========================================================================
// Behind The Booth Entertainment LLC - Firebase Initialization
// ==========================================================================
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBUR3Lp8XYuH4oTEScexlwx-KEuyPLl0Nw",
  authDomain: "behind-the-booth-entertainment.firebaseapp.com",
  projectId: "behind-the-booth-entertainment",
  storageBucket: "behind-the-booth-entertainment.firebasestorage.app",
  messagingSenderId: "318425599408",
  appId: "1:318425599408:web:c2b4afbd320a5612b99a75",
  measurementId: "G-E9LNZ5XTRT"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
