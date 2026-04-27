import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB-I-q7SwLHjIlakl2iRadGePH9el9UwFs",
    authDomain: "site-escolar-ca10.firebaseapp.com",
    projectId: "site-escolar-ca10",
    storageBucket: "site-escolar-ca10.firebasestorage.app",
    messagingSenderId: "805563351674",
    appId: "1:805563351674:web:f55d9d801f66149e6af1c3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDB = db;

// Expõe funções de salvar e carregar para o index.js usar
window.salvarNoFirebase = async function(dados) {
    const user = auth.currentUser;
    if (!user) { console.warn("[Firebase] Sem utilizador — não salvou."); return; }
    try {
        await setDoc(doc(db, "users", user.uid), dados);
        console.log("[Firebase] Guardado com sucesso:", user.uid);
    } catch (e) {
        console.error("[Firebase] Erro ao guardar:", e);
    }
};

window.carregarDoFirebase = async function() {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            console.log("[Firebase] Dados carregados:", user.uid);
            return snap.data();
        }
    } catch (e) {
        console.error("[Firebase] Erro ao carregar:", e);
    }
    return null;
};

// Quando o utilizador autentica, carrega os dados dele
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("[Firebase] Auth: utilizador ativo →", user.email);
        window.__firebaseUserReady = true;
    } else {
        window.__firebaseUserReady = false;
    }
});
