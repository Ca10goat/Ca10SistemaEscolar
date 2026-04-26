/**
 * login.js — Ca10 OS Authentication UI
 * 
 * Depende de:
 *   - firebase.js  (inicializa window.firebaseApp)
 *   - auth.js      (expõe window.login e window.registrar)
 * 
 * NÃO modifica index.js.
 */

/* ─── Estado da UI ──────────────────────────────── */
let currentTab = 'login';

/* ─── Troca de abas ─────────────────────────────── */
function switchTab(tab) {
    currentTab = tab;

    document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
    document.getElementById('tabRegister').classList.toggle('active', tab === 'register');

    document.getElementById('formLogin').classList.toggle('hidden', tab !== 'login');
    document.getElementById('formRegister').classList.toggle('hidden', tab !== 'register');

    // Limpar erros ao trocar de aba
    hideError('loginError');
    hideError('regError');
    hideSuccess();
}

/* ─── Mostrar / esconder erros ──────────────────── */
function showError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function showSuccess(msg) {
    const el = document.getElementById('authSuccess');
    const msgEl = document.getElementById('authSuccessMsg');
    if (!el || !msgEl) return;
    msgEl.textContent = msg;
    el.classList.remove('hidden');
}

function hideSuccess() {
    const el = document.getElementById('authSuccess');
    if (el) el.classList.add('hidden');
}

/* ─── Estado de loading do botão ────────────────── */
function setLoading(btnId, spinnerId, textId, loading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const text = document.getElementById(textId);
    if (!btn) return;
    btn.disabled = loading;
    if (spinner) spinner.classList.toggle('hidden', !loading);
    if (text) text.style.opacity = loading ? '0.5' : '1';
}

/* ─── Mostrar/ocultar password ──────────────────── */
function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.style.opacity = show ? '1' : '0.5';
}

/* ─── Tradução de erros Firebase ────────────────── */
function translateFirebaseError(code) {
    const map = {
        'auth/invalid-email':            'Email inválido.',
        'auth/user-not-found':           'Nenhuma conta com este email.',
        'auth/wrong-password':           'Palavra-passe incorreta.',
        'auth/invalid-credential':       'Email ou palavra-passe incorretos.',
        'auth/email-already-in-use':     'Este email já tem uma conta.',
        'auth/weak-password':            'A palavra-passe é demasiado fraca (mínimo 6 caracteres).',
        'auth/too-many-requests':        'Demasiadas tentativas. Tenta novamente mais tarde.',
        'auth/network-request-failed':   'Erro de rede. Verifica a tua ligação.',
        'auth/user-disabled':            'Esta conta foi desativada.',
        'auth/operation-not-allowed':    'Login por email não está ativado.',
        'auth/requires-recent-login':    'Por favor, entra novamente para continuar.',
    };
    return map[code] || 'Ocorreu um erro. Tenta novamente.';
}

/* ─── LOGIN ─────────────────────────────────────── */
function handleLogin() {
    hideError('loginError');
    hideSuccess();

    const email = document.getElementById('loginEmail')?.value.trim();
    const senha = document.getElementById('loginPassInput')?.value;

    if (!email) return showError('loginError', 'Insere o teu email.');
    if (!senha)  return showError('loginError', 'Insere a tua palavra-passe.');

    // Aguardar que firebase.js e auth.js estejam carregados
    if (typeof window.login !== 'function') {
        return showError('loginError', 'A carregar autenticação, tenta de novo em instantes.');
    }

    setLoading('loginBtn', 'loginSpinner', 'loginBtnText', true);

    // Substitui temporariamente o auth.js para capturar resultado
    _callWithFeedback(
        () => window.login(email, senha),
        () => {
            // Sucesso → redirecionar
            setLoading('loginBtn', 'loginSpinner', 'loginBtnText', false);
            showSuccess('Login efetuado! A redirecionar...');
            setTimeout(() => { window.location.href = 'index.html'; }, 1200);
        },
        (err) => {
            setLoading('loginBtn', 'loginSpinner', 'loginBtnText', false);
            const msg = err?.code ? translateFirebaseError(err.code) : (err?.message || 'Erro desconhecido.');
            showError('loginError', msg);
        }
    );
}

/* ─── REGISTAR ──────────────────────────────────── */
function handleRegister() {
    hideError('regError');
    hideSuccess();

    const email  = document.getElementById('regEmail')?.value.trim();
    const senha  = document.getElementById('regPassInput')?.value;
    const conf   = document.getElementById('regPassConfirm')?.value;

    if (!email)           return showError('regError', 'Insere o teu email.');
    if (!senha)           return showError('regError', 'Insere uma palavra-passe.');
    if (senha.length < 6) return showError('regError', 'A palavra-passe precisa de pelo menos 6 caracteres.');
    if (senha !== conf)   return showError('regError', 'As palavras-passe não coincidem.');

    if (typeof window.registrar !== 'function') {
        return showError('regError', 'A carregar autenticação, tenta de novo em instantes.');
    }

    setLoading('regBtn', 'regSpinner', 'regBtnText', true);

    _callWithFeedback(
        () => window.registrar(email, senha),
        () => {
            setLoading('regBtn', 'regSpinner', 'regBtnText', false);
            showSuccess('Conta criada! A redirecionar...');
            setTimeout(() => { window.location.href = 'index.html'; }, 1400);
        },
        (err) => {
            setLoading('regBtn', 'regSpinner', 'regBtnText', false);
            const msg = err?.code ? translateFirebaseError(err.code) : (err?.message || 'Erro desconhecido.');
            showError('regError', msg);
        }
    );
}

/* ─── Wrapper para capturar resultado do auth.js ── */
/**
 * auth.js usa .then/.catch internamente mas não retorna a Promise.
 * Aqui interceptamos onAuthStateChanged para detetar sucesso,
 * e adicionamos um listener temporário de erro via wrapper.
 *
 * Estratégia:
 *   1. Observar window.__authLastError (preenchido por patch abaixo)
 *   2. Observar mudança no estado de auth via polling rápido
 */
function _callWithFeedback(action, onSuccess, onError) {
    window.__authLastError = null;
    window.__authExpectingChange = true;

    // Timeout de segurança
    const timeout = setTimeout(() => {
        window.__authExpectingChange = false;
        if (window.__authLastError) {
            onError(window.__authLastError);
        } else {
            onError({ message: 'Tempo limite excedido. Verifica a tua ligação.' });
        }
    }, 10000);

    // Listener de resultado
    window.__authOnResult = (user, err) => {
        if (!window.__authExpectingChange) return;
        window.__authExpectingChange = false;
        clearTimeout(timeout);
        window.__authOnResult = null;
        if (err) {
            onError(err);
        } else if (user) {
            onSuccess(user);
        }
    };

    try { action(); } catch (e) { clearTimeout(timeout); onError(e); }
}

/* ─── Patch do auth.js (sem modificar o ficheiro) ─ */
/**
 * Sobrescreve temporariamente as funções globais para capturar
 * erros e sucessos e devolvê-los à UI.
 * 
 * Aguarda que auth.js termine de carregar antes de fazer o patch.
 */
(function patchAuth() {
    // Aguarda que os módulos ES sejam carregados
    const check = setInterval(() => {
        if (typeof window.login === 'function' && typeof window.registrar === 'function') {
            clearInterval(check);
            applyPatch();
        }
    }, 80);

    // Timeout máximo de 5s para patch
    setTimeout(() => clearInterval(check), 5000);

    function applyPatch() {
        const origLogin    = window.login;
        const origRegistar = window.registrar;

        window.login = function(email, senha) {
            // Chama o firebase diretamente para capturar a promise
            const { getAuth, signInWithEmailAndPassword } =
                window.__fbAuth || {};

            if (!getAuth) {
                // Fallback: usa a versão original e escuta onAuthStateChanged
                origLogin(email, senha);
                _listenForAuthChange();
                return;
            }

            const auth = getAuth(window.firebaseApp);
            signInWithEmailAndPassword(auth, email, senha)
                .then(cred => {
                    if (window.__authOnResult) window.__authOnResult(cred.user, null);
                })
                .catch(err => {
                    window.__authLastError = err;
                    if (window.__authOnResult) window.__authOnResult(null, err);
                });
        };

        window.registrar = function(email, senha) {
            const { getAuth, createUserWithEmailAndPassword } =
                window.__fbAuth || {};

            if (!getAuth) {
                origRegistar(email, senha);
                _listenForAuthChange();
                return;
            }

            const auth = getAuth(window.firebaseApp);
            createUserWithEmailAndPassword(auth, email, senha)
                .then(cred => {
                    if (window.__authOnResult) window.__authOnResult(cred.user, null);
                })
                .catch(err => {
                    window.__authLastError = err;
                    if (window.__authOnResult) window.__authOnResult(null, err);
                });
        };
    }

    // Fallback: escuta mudança de estado via onAuthStateChanged
    function _listenForAuthChange() {
        const listenOnce = setInterval(() => {
            if (!window.__fbAuth) return;
            clearInterval(listenOnce);
            const { getAuth, onAuthStateChanged } = window.__fbAuth;
            const auth = getAuth(window.firebaseApp);
            const unsub = onAuthStateChanged(auth, (user) => {
                if (user && window.__authOnResult) {
                    unsub();
                    window.__authOnResult(user, null);
                }
            });
        }, 100);
    }
})();

/* ─── Expõe firebase-auth para o patch ──────────── */
/**
 * Carrega firebase-auth para o namespace window.__fbAuth
 * para que o patch acima possa usar as funções diretamente.
 */
(async function loadFbAuth() {
    try {
        const mod = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");
        window.__fbAuth = mod;
    } catch (e) {
        console.warn('[login.js] Não foi possível carregar firebase-auth:', e);
    }
})();

/* ─── Redirecionar se já está autenticado ────────── */
(async function checkAlreadyLoggedIn() {
    await new Promise(r => setTimeout(r, 300)); // aguarda firebase.js
    try {
        const { getAuth, onAuthStateChanged } =
            await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");

        // Aguarda firebaseApp estar disponível
        let tries = 0;
        while (!window.firebaseApp && tries++ < 30) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (!window.firebaseApp) return;

        const auth = getAuth(window.firebaseApp);
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) {
                unsub();
                // Já está logado → vai direto para o app
                window.location.href = 'index.html';
            }
        });
    } catch (e) {
        // Sem bloqueio, continua na tela de login
    }
})();
