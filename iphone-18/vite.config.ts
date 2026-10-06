import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    // Maps are emitted for Sentry upload but not referenced from the bundles, and deleted before deploy (scripts/deploy-build.sh).
    sourcemap: 'hidden',
    // No manual chunking: the lazy <Stage> import already isolates three.js/r3f/drei
    // into their own chunk, so the entry ships only React + page code.
    chunkSizeWarningLimit: 1300,
  },
})
