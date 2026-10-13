// Generates public/sitemap.xml from published products. Needs SITE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY; skips quietly if missing.
import { writeFileSync } from 'node:fs'
const { SITE_URL, VITE_SUPABASE_URL: U, VITE_SUPABASE_ANON_KEY: K } = process.env
if (!SITE_URL || !U || !K) { console.warn('sitemap skipped: set SITE_URL and Supabase env vars'); process.exit(0) }
const get = async t => (await (await fetch(`${U}/rest/v1/${t}`, { headers: { apikey: K, Authorization: `Bearer ${K}` } })).json())
try {
  const prods = await get('products?select=slug,updated_at&status=eq.published'); const cols = await get('collections?select=slug&active=eq.true')
  const urls = ['', '/shop', '/sale', '/about', '/size-guide', '/delivery', '/returns', '/faq', '/contact', ...prods.map(p => '/product/' + p.slug), ...cols.map(c => '/collection/' + c.slug)]
  writeFileSync('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${SITE_URL}${u}</loc></url>`).join('')}</urlset>`)
  console.log('sitemap written:', urls.length, 'urls')
} catch (e) { console.warn('sitemap skipped:', e.message) }
