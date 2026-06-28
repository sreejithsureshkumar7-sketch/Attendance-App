import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// IMPORTANT: Firebase console la irundhu unga config paste pannunga.
const firebaseConfig = {
  apiKey: "AIzaSyBqhhRRjQGMdr57Ti67xcYp5oeV2CJJ364",
  authDomain: "madha-attendance-v2.firebaseapp.com",
  projectId: "madha-attendance-v2",
  storageBucket: "madha-attendance-v2.firebasestorage.app",
  messagingSenderId: "362252012687",
  appId: "1:362252012687:web:fcb04b7484e0eaf816f4fa",
  measurementId: "G-8ZMSCW78Y9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
