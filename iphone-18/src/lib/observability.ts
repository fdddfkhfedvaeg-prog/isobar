import type * as SentryNS from '@sentry/react'

let sentry: typeof SentryNS | null = null

/** Loads Sentry lazily so it never sits on the critical path; no DSN → no-op. */
export async function initObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  sentry = await import('@sentry/react')
  sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
  sentry.setTag('webgl', webglTier())
}

export function captureError(error: unknown, context?: Record<string, string>) {
  if (import.meta.env.DEV) console.error(error, context)
  sentry?.withScope((scope) => {
    if (context) scope.setTags(context)
    sentry!.captureException(error)
  })
}

export function captureMessage(message: string, context?: Record<string, string>) {
  sentry?.withScope((scope) => {
    if (context) scope.setTags(context)
    sentry!.captureMessage(message, 'warning')
  })
}

export type WebGLTier = 'webgl2' | 'webgl1' | 'none'

let cachedTier: WebGLTier | undefined

/** Probes once. WebGL1-only devices get the static fallback: the PBR materials need WebGL2. */
export function webglTier(): WebGLTier {
  if (cachedTier) return cachedTier
  try {
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (gl2) { gl2.getExtension('WEBGL_lose_context')?.loseContext(); return (cachedTier = 'webgl2') }
    cachedTier = canvas.getContext('webgl') ? 'webgl1' : 'none'
  } catch {
    cachedTier = 'none'
  }
  return cachedTier
}
