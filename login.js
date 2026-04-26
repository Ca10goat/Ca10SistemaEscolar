/**
 * login.js — Ca10 OS Authentication UI
 * Apenas login. Sem registo.
 */

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

function setLoading(btnId, spinnerId, textId, loading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const text = document.getElementById(textId);
    if (!btn) return;
    btn.disabled = loading;
    if (spinner) spinner.classList.toggle('hidden', !loading);
    if (text) text.style.opacity = loading ? '0.5' : '1';
}

function togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.style.opacity = show ? '1' : '0.5';
}

function translateFirebaseError(code) {
    const map = {
        'auth/invalid-email':          'Email inválido.',
        'auth/user-not-found':         'Nenhuma conta com este email.',
        'auth/wrong-password':         'Palavra-passe incorreta.',
        'auth/invalid-credential':     'Email ou palavra-passe incorretos.',
        'auth/too-many-requests':      'Demasiadas tentativas. Tenta mais tarde.',
        'auth/network-request-failed': 'Erro de rede. Verifica a tua ligação.',
        'auth/user-disabled':          'Esta conta foi desativada.',
    };
    return map[code] || 'Ocorreu um erro. Tenta novamente.';
}

function handleLogin() {
    hideError('loginError');
    hideSuccess();

    const email = document.getElementById('loginEmail')?.value.trim();
    const senha = document.getElementById('loginPassInput')?.value;

    if (!email) return showError('loginError', 'Insere o teu email.');
    if (!senha)  return showError('loginError', 'Insere a tua palavra-passe.');

    setLoading('loginBtn', 'loginSpinner', 'loginBtnText', true);

    _callWithFeedback(
        () => window.login(email, senha),
        () => {
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

function _callWithFeedback(action, onSuccess, onError) {
    window.__authLastError = null;
    window.__authExpectingChange = true;

    const timeout = setTimeout(() => {
        window.__authExpectingChange = false;
        onError(window.__authLastError || { message: 'Tempo limite excedido.' });
    }, 10000);

    window.__authOnResult = (user, err) => {
        if (!window.__authExpectingChange) return;
        window.__authExpectingChange = false;
        clearTimeout(timeout);
        window.__authOnResult = null;
        if (err) onError(err);
        else if (user) onSuccess(user);
    };

    try { action(); } catch (e) { clearTimeout(timeout); onError(e); }
}

/* ─── Patch: captura resultado do window.login ─── */
(function patchAuth() {
    const check = setInterval(() => {
        if (typeof window.login === 'function') {
            clearInterval(check);

            window.login = function(email, senha) {
                const { getAuth, signInWithEmailAndPassword } = window.__fbAuth || {};

                if (!getAuth) {
                    // Fallback sem patch
                    onError({ message: 'Firebase Auth não carregado.' });
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
        }
    }, 80);
    setTimeout(() => clearInterval(check), 5000);
})();

/* ─── Carrega firebase-auth para o patch ─────── */
(async function loadFbAuth() {
    try {
        window.__fbAuth = await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");
    } catch (e) {
        console.warn('[login.js] firebase-auth não carregou:', e);
    }
})();

/* ─── Redireciona se já está autenticado ─────── */
(async function checkAlreadyLoggedIn() {
    await new Promise(r => setTimeout(r, 300));
    try {
        const { getAuth, onAuthStateChanged } =
            await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");

        let tries = 0;
        while (!window.firebaseApp && tries++ < 30) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (!window.firebaseApp) return;

        const auth = getAuth(window.firebaseApp);
        const unsub = onAuthStateChanged(auth, (user) => {
            if (user) { unsub(); window.location.href = 'index.html'; }
        });
    } catch (e) {}
})();
