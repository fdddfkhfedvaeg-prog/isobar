export type PriceBasis = 'full' | 'contract'
export type DisplayTech = 'LCD' | 'IPS LCD' | 'Liquid Retina LCD' | 'Super Retina OLED' | 'Super Retina XDR OLED' | 'ProMotion XDR OLED'
export type Frame = 'Aluminum' | 'Stainless steel' | 'Titanium' | 'Aluminum unibody' | 'Plastic'

/** One row of `public.iphone_models` (see supabase/migrations). Field names match the SQL columns. */
export interface IPhoneModel {
  slug: string
  name: string
  release_year: number
  chip: string
  process_nm: number
  display_in: number
  display_tech: DisplayTech
  resolution: string
  refresh_hz: number
  rear_cameras: number
  main_camera_mp: number
  max_optical_zoom: number
  frame: Frame
  height_mm: number
  width_mm: number
  depth_mm: number
  weight_g: number
  base_storage_gb: number
  launch_price_usd: number
  price_basis: PriceBasis
  /** false = pre-announcement / unverified figures. Rendered with a marker in the UI. */
  verified: boolean
}

export type NumericKey = {
  [K in keyof IPhoneModel]: IPhoneModel[K] extends number ? K : never
}[keyof IPhoneModel]
