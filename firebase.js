// Firebase config paste pannunga.
// IMPORTANT: Indha file GitHub Pages-la import error varaama compat method use pannuthu.

const firebaseConfig = {
  apiKey: "AIzaSyBqhhRRjQGMdr57Ti67xcYp5oeV2CJJ364",
  authDomain: "madha-attendance-v2.firebaseapp.com",
  projectId: "madha-attendance-v2",
  storageBucket: "madha-attendance-v2.firebasestorage.app",
  messagingSenderId: "362252012687",
  appId: "1:362252012687:web:fcb04b7484e0eaf816f4fa",
  measurementId: "G-8ZMSCW78Y9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
