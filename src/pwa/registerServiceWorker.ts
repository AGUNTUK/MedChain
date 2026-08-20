export function registerServiceWorker() {
  if (typeof window === 'undefined') {
    return; // Don't run on server
  }

  if (!('serviceWorker' in navigator)) {
    return; // Not supported
  }

  if (import.meta.env.DEV) {
    return; // Don't register in development
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', {
        scope: '/'
      })
      .then((registration) => {
        console.log('MediChain Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('MediChain Service Worker registration failed:', error);
      });
  });
}
