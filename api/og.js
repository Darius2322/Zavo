// Serves Open Graph tags to link-preview crawlers (WhatsApp, Facebook, X, Slack...). Real visitors get the normal app.
export default async function handler(req, res) {
  const slug = String(req.query.slug || ''); const U = process.env.VITE_SUPABASE_URL, K = process.env.VITE_SUPABASE_ANON_KEY
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  try {
    const r = await fetch(`${U}/rest/v1/products?select=name,description,price_kes,product_images(path,sort_order)&slug=eq.${encodeURIComponent(slug)}&status=eq.published`, { headers: { apikey: K, Authorization: `Bearer ${K}` } })
    const [p] = await r.json(); if (!p) { res.status(404).send('Not found'); return }
    const im = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]; const url = `https://${req.headers.host}/product/${encodeURIComponent(slug)}`
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 's-maxage=300')
    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.name)} | ZAVO</title><meta property="og:title" content="${esc(p.name)}"><meta property="og:description" content="${esc(`KES ${p.price_kes}. ${p.description || ''}`.slice(0, 200))}"><meta property="og:type" content="product"><meta property="og:url" content="${esc(url)}">${im ? `<meta property="og:image" content="${esc(U + '/storage/v1/object/public/product-images/' + im.path)}">` : ''}<link rel="canonical" href="${esc(url)}"></head><body><a href="${esc(url)}">${esc(p.name)}</a></body></html>`)
  } catch { res.status(500).send('Error') }
}
