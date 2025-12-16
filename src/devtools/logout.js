document.addEventListener('DOMContentLoaded', () => {
    // Assuming AuthModule is available globally from auth.js,
    // but initLogout is a standalone function in auth.js not exported in AuthModule (based on previous file content).
    // Let's check auth.js content again.
    // user's auth.js had:
    // window.AuthModule = { ... }
    // but initLogout() was defined in the global scope of auth.js? 
    // Yes, the functions initSignup, initLogin, initLogout were defined in global scope.

    if (typeof initLogout === 'function') {
        initLogout();
    } else {
        console.error('initLogout function not found. Ensure auth.js is loaded.');
    }
});
