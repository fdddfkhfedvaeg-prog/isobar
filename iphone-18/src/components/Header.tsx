import { Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

const LINKS = [
  { href: '#design', label: 'Design' },
  { href: '#features', label: 'Features' },
  { href: '#compare', label: 'Compare' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background,border-color] duration-500 ${scrolled ? 'glass border-x-0 border-t-0' : 'border-b border-transparent'}`}>
      <nav aria-label="Primary" className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
        <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Smartphone className="size-4" aria-hidden />
          iPhone 18 Pro Max
        </a>
        <div className="flex items-center gap-5 text-xs text-fg-2">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hidden transition-colors hover:text-fg sm:inline">{l.label}</a>
          ))}
          <a href="#compare" className="rounded-pill bg-accent px-3 py-1 font-medium text-white transition-transform duration-300 ease-spring hover:scale-105">
            Compare
          </a>
        </div>
      </nav>
    </header>
  )
}
