import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // enregistrement manuel dans main.tsx, avec rechargement forcé sur mise à jour
      // Précache tout ce que Vite génère (JS, CSS, HTML, icônes) — l'app peut donc se
      // lancer hors-ligne même si le téléphone redémarre ou que l'onglet est fermé puis
      // rouvert sans connexion. Ajouté le 25/08/2026 sur demande explicite de
      // l'utilisateur — même principe que Patrimoine-Pro, qui utilise déjà ce plugin.
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Les appels réseau vers Supabase (sync cloud) ne sont volontairement PAS mis
        // en cache ici : hors-ligne, ils échouent simplement et l'app continue avec le
        // localStorage, qui reste la source de vérité locale immédiate (voir cloudLoad/
        // cloudSave/persist dans App.tsx — déjà conçus pour tolérer un échec réseau).
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        // Le nouveau service worker prend le contrôle de la page dès son activation
        // (clientsClaim), au lieu d'attendre la prochaine navigation — indispensable
        // pour que le rechargement forcé côté main.tsx serve bien le NOUVEAU code
        // juste après, et pas l'ancien encore actif.
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: "OrderTrack",
        short_name: "OrderTrack",
        description: "Gestion des commandes et factures — fonctionne hors-ligne",
        theme_color: "#111827",
        background_color: "#F0F4F8",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
})
