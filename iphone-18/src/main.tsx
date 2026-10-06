import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initObservability, webglTier } from './lib/observability'
import './styles/index.css'

void initObservability()

// Start the model download in parallel with the JS chunk, but only for devices that will render it.
const glb = import.meta.env.VITE_PHONE_GLB_URL
if (glb && webglTier() === 'webgl2') {
  const link = Object.assign(document.createElement('link'), { rel: 'preload', as: 'fetch', href: glb, crossOrigin: 'anonymous' })
  document.head.append(link)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
