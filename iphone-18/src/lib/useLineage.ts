import { useEffect, useState } from 'react'
import { LINEAGE } from '../data/lineage'
import type { IPhoneModel } from '../data/types'
import { captureError } from './observability'

export type LineageSource = 'seed' | 'supabase'

/**
 * Returns the bundled seed immediately (no loading flash), then swaps in the
 * live `iphone_lineage` view when Supabase env vars are set. Any network or
 * schema error keeps the seed and is reported to Sentry.
 */
export function useLineage(): { models: IPhoneModel[]; source: LineageSource } {
  const [state, setState] = useState<{ models: IPhoneModel[]; source: LineageSource }>({ models: LINEAGE, source: 'seed' })

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) return
    let cancelled = false

    import('@supabase/supabase-js')
      .then(async ({ createClient }) => {
        const client = createClient(url, key, { auth: { persistSession: false } })
        const { data, error } = await client.from('iphone_lineage').select('*')
        if (error) throw error
        if (!cancelled && data?.length) setState({ models: data as IPhoneModel[], source: 'supabase' })
      })
      .catch((err) => captureError(err, { area: 'lineage-fetch' }))

    return () => { cancelled = true }
  }, [])

  return state
}
