// ==========================================================================
// Behind The Booth Entertainment LLC - Firebase Initialization
//
// Loaded directly by the browser as an ES module - there is no bundler in the
// serving path (firebase.json deploys public/ as-is), so these must be full
// URLs. Bare specifiers like "firebase/app" cannot be resolved by the browser
// and will throw before any analytics call is made.
//
// Keep the pinned version in step with the firebase devDependency.
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";

// Web API keys are public client identifiers, not secrets. Access is controlled
// by Firebase security rules and the key's HTTP referrer restrictions.
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

// getAnalytics throws in contexts without cookies/IndexedDB (private windows,
// some in-app browsers). Analytics is non-essential, so never let it break the page.
let analytics = null;
try {
  if (await isSupported()) {
    analytics = getAnalytics(app);
  }
} catch (err) {
  console.warn("Analytics unavailable:", err);
}

export { app, analytics };
