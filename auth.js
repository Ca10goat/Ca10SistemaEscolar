import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const auth = getAuth(window.firebaseApp);

// REGISTRAR
window.registrar = function(email, senha) {
  createUserWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      console.log("Usuário criado:", userCredential.user.email);
    })
    .catch((error) => {
      console.log("Erro:", error.message);
    });
};

// LOGIN
window.login = function(email, senha) {
  signInWithEmailAndPassword(auth, email, senha)
    .then((userCredential) => {
      console.log("Logado:", userCredential.user.email);
    })
    .catch((error) => {
      console.log("Erro:", error.message);
    });
};

// DETECTAR LOGIN
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuário ativo:", user.email);
  } else {
    console.log("Nenhum usuário logado");
  }
});