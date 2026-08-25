import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// --------------------------------------------------------------------------
// Enregistrement et mise à jour du service worker — entièrement automatique,
// sans jamais demander à l'utilisateur de désinscrire quoi que ce soit à la
// main. Permet un vrai fonctionnement hors ligne (l'app se recharge même
// sans réseau) tout en évitant le piège classique des PWA : rester coincé
// sur une ancienne version mise en cache après un déploiement, parfois
// pendant des heures sur un onglet resté ouvert ou une PWA relancée depuis
// l'arrière-plan (le navigateur ne revérifie sw.js que ~toutes les 24h par
// défaut). Ce même correctif a déjà fait ses preuves sur Patrimoine-Pro,
// repris ici à l'identique.
//
// On va chercher sw.js nous-mêmes avec cache:"no-store" à intervalle
// rapproché ET à chaque retour au premier plan, puis on force
// registration.update(). Si une nouvelle version est détectée
// (onNeedRefresh), on désinscrit tous les service workers, on vide tous les
// caches, puis on recharge.
// --------------------------------------------------------------------------

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000; // vérifie toutes les 60s pendant que l'app est ouverte

if ("serviceWorker" in navigator) {
  const nukeServiceWorkersAndReload = async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch {}
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    window.location.reload();
  };

  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        nukeServiceWorkersAndReload();
      },
      onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
        if (!registration) return;

        const checkForUpdate = async () => {
          try {
            if (registration.installing) return; // une mise à jour est déjà en cours d'installation
            if ("onLine" in navigator && !navigator.onLine) return;

            // Contourne le cache HTTP du navigateur pour être sûr de voir le
            // VRAI sw.js actuellement déployé, pas une copie mise en cache.
            const resp = await fetch(swUrl, {
              cache: "no-store",
              headers: { "cache-control": "no-cache" },
            });
            if (resp?.status === 200) await registration.update();
          } catch {
            // Hors-ligne ou requête échouée — on retentera au prochain cycle.
          }
        };

        setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("focus", checkForUpdate);
        checkForUpdate();
      },
    });
  }).catch(() => {});
}
