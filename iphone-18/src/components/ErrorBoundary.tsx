import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureError } from '../lib/observability'

interface Props { fallback: ReactNode; area: string; children: ReactNode }

/** Contains a failing subtree (e.g. WebGL init/shader errors), reports it, and renders `fallback` instead. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { area: this.props.area, componentStack: (info.componentStack ?? '').slice(0, 500) })
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
