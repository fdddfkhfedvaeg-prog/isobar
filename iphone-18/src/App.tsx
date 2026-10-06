import { useMemo, useState } from 'react'
import { Bento } from './components/Bento'
import { Compare } from './components/Compare'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Header } from './components/Header'
import { Showcase } from './components/Showcase'
import { FLAGSHIP_SLUG, LINEAGE } from './data/lineage'
import { useLineage } from './lib/useLineage'
import { FINISHES, type Finish } from './three/finishes'

export default function App() {
  const { models, source } = useLineage()
  const [finish, setFinish] = useState<Finish>(FINISHES[0])

  const { flagship, previous } = useMemo(() => {
    const flagship = models.find((m) => m.slug === FLAGSHIP_SLUG) ?? LINEAGE[LINEAGE.length - 1]
    const previous = models.find((m) => m.slug === 'iphone-17-pro-max')
    return { flagship, previous }
  }, [models])

  return (
    <div id="top">
      <Header />
      <main>
        <Showcase finish={finish} setFinish={setFinish} />
        <Bento flagship={flagship} previous={previous} />
        <ErrorBoundary area="compare" fallback={<p className="mx-auto max-w-6xl px-4 py-20 text-fg-3">The comparison table couldn't load.</p>}>
          <Compare models={models} source={source} />
        </ErrorBoundary>
      </main>
      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-10 text-xs leading-relaxed text-fg-3">
          <p>Concept experience. Not affiliated with or endorsed by Apple Inc. iPhone is a trademark of Apple Inc.</p>
          <p className="mt-2">Historical specs are from Apple's published tech specs; pre-release figures are marked †.</p>
        </div>
      </footer>
    </div>
  )
}
