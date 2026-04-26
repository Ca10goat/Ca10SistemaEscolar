import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

// CONFIG DO SEU PROJETO
const firebaseConfig = {
  apiKey: "AIzaSyB-I-q7SwLHjIlakl2iRadGePH9el9UwFs",
  authDomain: "site-escolar-ca10.firebaseapp.com",
  projectId: "site-escolar-ca10",
  storageBucket: "site-escolar-ca10.firebasestorage.app",
  messagingSenderId: "805563351674",
  appId: "1:805563351674:web:f55d9d801f66149e6af1c3"
};

// INICIALIZA
const app = initializeApp(firebaseConfig);

// DEIXA GLOBAL
window.firebaseApp = app;