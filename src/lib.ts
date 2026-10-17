import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
export const img = (p: string) => supabase.storage.from('product-images').getPublicUrl(p).data.publicUrl
export const kes = (n: number) => 'KES ' + Number(n).toLocaleString('en-KE')
