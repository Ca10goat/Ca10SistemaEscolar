/**
 * auth-guard.js — Ca10 OS
 * Redireciona para login.html se não há sessão ativa.
 */
(async function authGuard() {
    let tries = 0;
    while (!window.firebaseApp && tries++ < 50) {
        await new Promise(r => setTimeout(r, 100));
    }

    if (!window.firebaseApp) {
        console.warn('[auth-guard] Firebase não disponível, guard ignorado.');
        return;
    }

    try {
        const { getAuth, onAuthStateChanged } =
            await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");

        const auth = getAuth(window.firebaseApp);

        await new Promise((resolve) => {
            const timer = setTimeout(resolve, 4000);
            const unsub = onAuthStateChanged(auth, (user) => {
                clearTimeout(timer);
                unsub();
                if (!user) {
                    window.location.replace('login.html');
                }
                resolve();
            });
        });
    } catch (e) {
        console.warn('[auth-guard] Erro:', e);
    }
})();
