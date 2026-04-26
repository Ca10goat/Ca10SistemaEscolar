/**
 * auth-guard.js — Ca10 OS
 * 
 * Adiciona ao <head> do index.html (antes de index.js).
 * Redireciona para login.html se o utilizador não estiver autenticado.
 * NÃO modifica index.js.
 */

(async function authGuard() {
    // Aguarda o firebaseApp ser inicializado pelo firebase.js
    let tries = 0;
    while (!window.firebaseApp && tries++ < 50) {
        await new Promise(r => setTimeout(r, 100));
    }

    if (!window.firebaseApp) {
        // Se firebase não carregou, não bloqueamos o app (fail open)
        console.warn('[auth-guard] Firebase não disponível, guard ignorado.');
        return;
    }

    try {
        const { getAuth, onAuthStateChanged } =
            await import("https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js");

        const auth = getAuth(window.firebaseApp);

        // Aguarda resolução do estado de auth (máx. 4s)
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
