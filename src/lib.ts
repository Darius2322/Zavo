import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const missingEnv = !url || !key
export const supabase = createClient(url || 'https://missing.supabase.co', key || 'missing')
export const img = (p: string) => supabase.storage.from('product-images').getPublicUrl(p).data.publicUrl
export const kes = (n: number) => 'KES ' + Number(n).toLocaleString('en-KE')
