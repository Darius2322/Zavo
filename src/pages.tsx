import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { supabase, img, kes } from './lib'
import { useStore } from './store'

const SEL = 'id,slug,name,price_kes,compare_at_kes,category_id,product_images(path,sort_order),product_variants(stock,size,colour)'
const first = (p: any) => [...(p.product_images || [])].sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.path
const inStock = (p: any) => (p.product_variants || []).some((v: any) => v.stock > 0)

function Card({ p }: { p: any }) {
  const { wish, toggleWish } = useStore(); const f = first(p); const on = wish.includes(p.id); const out = !inStock(p)
  return <div className="card"><Link to={'/product/' + p.slug}>
    <div className="ph">{f ? <img src={img(f)} alt={p.name} loading="lazy" /> : <div className="noimg" />}
      {out ? <span className="tag">Sold out</span> : p.compare_at_kes ? <span className="tag sale">Sale</span> : null}</div>
    <h3>{p.name}</h3><p className="pr"><span className={p.compare_at_kes ? 'now' : ''}>{kes(p.price_kes)}</span>{p.compare_at_kes && <s>{kes(p.compare_at_kes)}</s>}</p></Link>
    <button className="heart" aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'} onClick={() => toggleWish(p.id)}><Heart size={16} fill={on ? 'currentColor' : 'none'} /></button></div>
}
function Hero() {
  const [v, setV] = useState<any>(null)
  useEffect(() => { supabase.from('store_settings').select('value').eq('key', 'page:home').maybeSingle().then(r => setV(r.data?.value || null)) }, [])
  return <div className="hero"><h1>{v?.title || 'New in'}</h1>{v?.body && <p>{v.body}</p>}<Link className="btn" to="/shop">Shop all</Link></div>
}
function CatRow() {
  const [c, setC] = useState<any[]>([]); useEffect(() => { supabase.from('categories').select('id,name').order('sort_order').then(r => setC(r.data || [])) }, [])
  return c.length ? <nav className="cats" aria-label="Categories">{c.map(x => <Link key={x.id} to={'/shop?cat=' + x.id}>{x.name}</Link>)}</nav> : null
}
export function Announce() {
  const [t, setT] = useState(''); useEffect(() => { supabase.from('store_settings').select('value').eq('key', 'announcement').maybeSingle().then(r => setT(typeof r.data?.value === 'string' ? r.data.value : '')) }, [])
  return t ? <div className="announce">{t}</div> : null
}

export function Shop({ home, sale, collection }: { home?: boolean; sale?: boolean; collection?: string }) {
  const [sp, setSp] = useSearchParams(); const q = sp.get('q') || '', cat = sp.get('cat') || '', brand = sp.get('brand') || '', sort = sp.get('sort') || 'new'
  const [items, setItems] = useState<any[] | null>(null); const [cats, setCats] = useState<any[]>([]); const [brands, setBrands] = useState<any[]>([]); const [err, setErr] = useState(''); const [title, setTitle] = useState('')
  const [lim, setLim] = useState(24); const [stockOnly, setStockOnly] = useState(false); const [minP, setMinP] = useState(''); const [maxP, setMaxP] = useState(''); const [fs, setFs] = useState(''); const [fc, setFc] = useState('')
  useEffect(() => { supabase.from('categories').select('id,slug,name').order('sort_order').then(r => setCats(r.data || [])); supabase.from('brands').select('id,name').then(r => setBrands(r.data || [])) }, [])
  useEffect(() => { (async () => {
    setItems(null); setErr('')
    let b: any = supabase.from('products').select(SEL)
    if (collection) { const c = await supabase.from('collections').select('id,name').eq('slug', collection).maybeSingle(); if (!c.data) return setItems([]); setTitle(c.data.name)
      const ids = ((await supabase.from('collection_products').select('product_id').eq('collection_id', c.data.id)).data || []).map((x: any) => x.product_id); b = b.in('id', ids) }
    if (sale) b = b.not('compare_at_kes', 'is', null)
    if (q) b = b.ilike('name', `%${q.replace(/[%,]/g, '')}%`)
    if (cat) b = b.eq('category_id', cat)
    if (brand) b = b.eq('brand_id', brand)
    b = sort === 'price' ? b.order('price_kes') : sort === 'name' ? b.order('name') : b.order('created_at', { ascending: false })
    const r = await b.limit(home ? 8 : lim); r.error ? setErr('Could not load products. Check your connection.') : setItems(r.data || []) })() }, [q, cat, brand, sort, home, sale, collection, lim])
  const opt = (k: string) => [...new Set((items || []).flatMap((p: any) => p.product_variants.map((v: any) => v[k])).filter(Boolean))] as string[]
  const shown = (items || []).filter((p: any) => (!stockOnly || inStock(p)) && (!minP || p.price_kes >= +minP) && (!maxP || p.price_kes <= +maxP)
    && (!fs || p.product_variants.some((v: any) => v.size === fs && v.stock > 0)) && (!fc || p.product_variants.some((v: any) => v.colour === fc && v.stock > 0)))
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n) }
  const dirty = q || cat || brand || fs || fc || minP || maxP || stockOnly
  return <section className="wrap">
    {home ? <><Hero /><CatRow /></> : <h1>{collection ? title : sale ? 'Sale' : 'Shop'}</h1>}
    {!home && <div className="filters">
      <select aria-label="Category" value={cat} onChange={e => set('cat', e.target.value)}><option value="">All categories</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {brands.length > 0 && <select aria-label="Brand" value={brand} onChange={e => set('brand', e.target.value)}><option value="">All brands</option>{brands.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      <select aria-label="Sort" value={sort} onChange={e => set('sort', e.target.value)}><option value="new">Newest</option><option value="price">Price</option><option value="name">Name</option></select>
      <label><input type="checkbox" checked={stockOnly} onChange={e => setStockOnly(e.target.checked)} /> In stock</label>
      <select aria-label="Size" value={fs} onChange={e => setFs(e.target.value)}><option value="">All sizes</option>{opt('size').map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Colour" value={fc} onChange={e => setFc(e.target.value)}><option value="">All colours</option>{opt('colour').map(x => <option key={x}>{x}</option>)}</select>
      <input aria-label="Minimum price" type="number" min={0} placeholder="Min KES" style={{ width: 100 }} value={minP} onChange={e => setMinP(e.target.value)} />
      <input aria-label="Maximum price" type="number" min={0} placeholder="Max KES" style={{ width: 100 }} value={maxP} onChange={e => setMaxP(e.target.value)} />
      {dirty && <button onClick={() => { setSp({}); setFs(''); setFc(''); setMinP(''); setMaxP(''); setStockOnly(false) }}>Clear filters</button>}</div>}
    {err && <p role="alert" className="err">{err}</p>}{items === null && !err && <p>Loading…</p>}
    {items && <p className="count">{shown.length} item{shown.length === 1 ? '' : 's'}</p>}
    {items && shown.length === 0 && <p>No products found. {dirty && 'Try clearing your filters.'}</p>}
    <div className="grid">{shown.map(p => <Card key={p.id} p={p} />)}</div>
    {!home && items && items.length >= lim && <p><button className="btn ghost" onClick={() => setLim(lim + 24)}>Load more</button></p>}
    {home && <><p><Link className="btn" to="/shop">Shop all</Link></p><Featured /><Collections /></>}
  </section>
}
function Featured() {
  const [r, setR] = useState<any[]>([]); useEffect(() => { supabase.from('products').select(SEL).eq('featured', true).limit(8).then(x => setR(x.data || [])) }, [])
  return r.length ? <><h2 className="sec">Featured</h2><div className="grid">{r.map(p => <Card key={p.id} p={p} />)}</div></> : null
}
function Collections() {
  const [r, setR] = useState<any[]>([]); useEffect(() => { supabase.from('collections').select('slug,name').order('sort_order').then(x => setR(x.data || [])) }, [])
  return r.length ? <><h2 className="sec">Collections</h2><p>{r.map(c => <Link key={c.slug} className="chip" to={'/collection/' + c.slug}>{c.name}</Link>)}</p></> : null
}
export const CollectionPage = () => { const { slug } = useParams(); return <Shop collection={slug} key={slug} /> }
export function Newsletter() {
  const [m, setM] = useState('')
  const go = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = e.currentTarget; const email = String(new FormData(f).get('email')).trim()
    const r = await supabase.from('newsletter_subscribers').insert({ email }); setM(r.error && r.error.code !== '23505' ? 'Enter a valid email address.' : 'Subscribed.'); if (!r.error) f.reset() }
  return <form onSubmit={go} className="row"><label className="sr" htmlFor="nl">Email</label><input id="nl" name="email" type="email" required placeholder="Email for updates" /><button className="btn">Subscribe</button>{m && <span role="status">{m}</span>}</form>
}
function Reviews({ pid }: { pid: string }) {
  const [rows, setRows] = useState<any[]>([]); const [f, setF] = useState<any>({ rating: 5 }); const [m, setM] = useState('')
  const load = () => supabase.from('product_reviews').select('id,reviewer_name,rating,comment,created_at').eq('product_id', pid).order('created_at', { ascending: false }).then(r => setRows(r.data || []))
  useEffect(() => { load() }, [pid])
  const go = async (e: React.FormEvent) => { e.preventDefault(); const r = await supabase.rpc('submit_review', { p_ref: f.ref, p_phone: f.phone, p_product: pid, p_rating: +f.rating, p_name: f.name, p_comment: f.comment || '' }); setM(r.error ? r.error.message : 'Thanks. Your review will appear after the store approves it.') }
  const avg = rows.length ? (rows.reduce((a, x) => a + x.rating, 0) / rows.length).toFixed(1) : ''
  return <div><h2>Reviews {avg && `(${avg}/5, ${rows.length})`}</h2>{!rows.length && <p>No reviews yet.</p>}{rows.map(x => <p key={x.id}><b>{x.reviewer_name}</b> · {x.rating}/5<br />{x.comment}</p>)}
    <details><summary>Write a review (customers with a completed order)</summary><form className="form" onSubmit={go}>
      <label>Order reference<input required onChange={e => setF({ ...f, ref: e.target.value })} /></label><label>Phone used for the order<input required type="tel" onChange={e => setF({ ...f, phone: e.target.value })} /></label>
      <label>Your name<input required maxLength={80} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Rating<select value={f.rating} onChange={e => setF({ ...f, rating: e.target.value })}>{[5, 4, 3, 2, 1].map(n => <option key={n}>{n}</option>)}</select></label>
      <label>Comment<textarea maxLength={2000} onChange={e => setF({ ...f, comment: e.target.value })} /></label><button className="btn">Submit review</button>{m && <p role="status">{m}</p>}</form></details></div>
}

export function Product() {
  const { slug } = useParams(); const { add, wish, toggleWish } = useStore(); const nav = useNavigate()
  const [p, setP] = useState<any>(undefined); const [size, setSize] = useState(''); const [colour, setColour] = useState(''); const [qty, setQty] = useState(1); const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('products').select('*,product_images(path,sort_order),product_variants(id,size,colour,stock)').eq('slug', slug).maybeSingle().then(r => setP(r.data || null)) }, [slug])
  useEffect(() => { if (p) document.title = p.name + ' | ZAVO' }, [p])
  if (p === undefined) return <p className="wrap">Loading…</p>
  if (p === null) return <p className="wrap">This product is not available. <Link to="/shop">Back to shop</Link></p>
  const vs: any[] = p.product_variants; const sizes = [...new Set(vs.map(v => v.size))]; const colours = [...new Set(vs.map(v => v.colour).filter(Boolean))]
  const v = vs.find(x => x.size === size && (x.colour === colour || !colours.length))
  const imgs = [...p.product_images].sort((a: any, b: any) => a.sort_order - b.sort_order)
  const addIt = (go: boolean) => {
    if (!size || (colours.length && !colour)) return setMsg('Choose a size' + (colours.length ? ' and colour' : '') + ' first.')
    if (!v || v.stock < 1) return setMsg('That option is sold out.')
    add({ variantId: v.id, name: p.name, size: v.size, colour: v.colour, price: p.price_kes, qty, image: imgs[0]?.path, max: p.is_unique ? 1 : v.stock }); setMsg('Added to cart.'); if (go) nav('/cart') }
  const share = () => navigator.share ? navigator.share({ title: p.name, url: location.href }).catch(() => {}) : navigator.clipboard?.writeText(location.href).then(() => setMsg('Link copied.'))
  return <section className="wrap pdp">
    <div className="gallery">{imgs.length ? imgs.map((i: any) => <img key={i.path} src={img(i.path)} alt={p.name} loading="lazy" />) : <div className="noimg" />}</div>
    <div><h1>{p.name}</h1><p className="price">{kes(p.price_kes)} {p.compare_at_kes && <s>{kes(p.compare_at_kes)}</s>}</p>
      {p.condition && <p>Condition: {p.condition}</p>}
      <fieldset><legend>Size</legend>{sizes.map(s => <button key={s} className={s === size ? 'chip on' : 'chip'} onClick={() => setSize(s)}>{s}</button>)}</fieldset>
      {colours.length > 0 && <fieldset><legend>Colour</legend>{colours.map(c => <button key={c} className={c === colour ? 'chip on' : 'chip'} onClick={() => setColour(c)}>{c}</button>)}</fieldset>}
      {!p.is_unique && <label>Quantity <input type="number" min={1} max={20} value={qty} onChange={e => setQty(Math.max(1, +e.target.value || 1))} /></label>}
      {v && <p>{v.stock > 0 ? (v.stock <= 3 ? `Only ${v.stock} left` : 'In stock') : 'Sold out'}</p>}
      <div className="row"><button className="btn" onClick={() => addIt(false)}>Add to cart</button><button className="btn ghost" onClick={() => addIt(true)}>Buy now</button>
        <button className="btn ghost" onClick={() => toggleWish(p.id)}>{wish.includes(p.id) ? 'Saved' : 'Save'}</button></div>
      {msg && <p role="status">{msg}</p>}{p.description && <p className="desc">{p.description}</p>}<p><button onClick={share}>Share</button> · <Link to="/size-guide">Size guide</Link> · <Link to="/delivery">Delivery</Link> · <Link to="/returns">Returns</Link></p><Reviews pid={p.id} /></div></section>
}

export function Wishlist() {
  const { wish } = useStore(); const [items, setItems] = useState<any[]>([])
  useEffect(() => { if (wish.length) supabase.from('products').select(SEL).in('id', wish).then(r => setItems(r.data || [])); else setItems([]) }, [wish])
  return <section className="wrap"><h1>Wishlist</h1>{!items.length && <p>Nothing saved on this device yet.</p>}<div className="grid">{items.map(p => <Card key={p.id} p={p} />)}</div></section>
}

export function Cart() {
  const { cart, setQty, remove } = useStore(); const total = cart.reduce((n: number, l: any) => n + l.price * l.qty, 0)
  if (!cart.length) return <section className="wrap"><h1>Cart</h1><p>Your cart is empty.</p><Link className="btn" to="/shop">Continue shopping</Link></section>
  return <section className="wrap"><h1>Cart</h1>{cart.map((l: any) => <div className="line" key={l.variantId}>
    {l.image && <img src={img(l.image)} alt="" />}<div><b>{l.name}</b><p>{l.size}{l.colour && ' · ' + l.colour}</p><p>{kes(l.price)} each</p>
      <input aria-label="Quantity" type="number" min={1} max={l.max} value={l.qty} onChange={e => setQty(l.variantId, +e.target.value)} /></div>
    <div><b>{kes(l.price * l.qty)}</b><button aria-label="Remove" onClick={() => remove(l.variantId)}><Trash2 size={18} /></button></div></div>)}
    <p className="total">Subtotal {kes(total)}</p><p>Delivery is added at checkout where applicable.</p>
    <Link className="btn" to="/checkout">Checkout</Link> <Link to="/shop">Continue shopping</Link></section>
}

export function Checkout() {
  const { cart, clear } = useStore(); const nav = useNavigate(); const key = useRef(crypto.randomUUID())
  const [f, setF] = useState<any>({ fulfilment: 'delivery', payment_method: 'M-Pesa (manual confirmation)' }); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const total = cart.reduce((n: number, l: any) => n + l.price * l.qty, 0); const s = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const [disc, setDisc] = useState(0); const [promoMsg, setPromoMsg] = useState('')
  const applyPromo = async () => { const r = await supabase.rpc('check_promo', { p_code: f.promo_code || '', p_sub: total }); if (r.error) { setDisc(0); setPromoMsg(r.error.message) } else { setDisc(+r.data); setPromoMsg('Promo applied.') } }
  if (!cart.length) return <section className="wrap"><p>Your cart is empty. <Link to="/shop">Shop</Link></p></section>
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (busy) return; setErr('')
    if ((f.customer_name || '').trim().length < 2) return setErr('Enter your full name.')
    if (!/^\+?[0-9 ]{9,15}$/.test(f.phone || '')) return setErr('Enter a valid phone number.')
    if (f.fulfilment === 'delivery' && (f.address || '').trim().length < 5) return setErr('Enter a delivery address.')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_order', { p: { ...f, idempotency_key: key.current, items: cart.map((l: any) => ({ variant_id: l.variantId, quantity: l.qty })) } })
    setBusy(false)
    if (error) return setErr(error.message)
    clear(); nav('/order/' + data.reference, { state: data }) }
  return <section className="wrap"><h1>Checkout</h1><form onSubmit={submit} className="form">
    <label>Full name<input required autoComplete="name" onChange={s('customer_name')} /></label>
    <label>Phone<input required type="tel" autoComplete="tel" onChange={s('phone')} /></label>
    <label>Email (optional)<input type="email" autoComplete="email" onChange={s('email')} /></label>
    <label>Delivery or collection<select value={f.fulfilment} onChange={s('fulfilment')}><option value="delivery">Delivery</option><option value="collection">Collection</option></select></label>
    {f.fulfilment === 'delivery' && <><label>Address<input autoComplete="street-address" onChange={s('address')} /></label>
      <label>Town or city<input onChange={s('town')} /></label><label>Estate, landmark or directions<input onChange={s('directions')} /></label></>}
    <label>Payment<select value={f.payment_method} onChange={s('payment_method')}><option>M-Pesa (manual confirmation)</option><option>Cash on delivery or collection</option></select></label>
    <label>Order notes (optional)<textarea onChange={s('notes')} /></label>
    <div className="row"><label>Promo code<input onChange={e => { setF({ ...f, promo_code: e.target.value.toUpperCase() }); setDisc(0); setPromoMsg('') }} value={f.promo_code || ''} /></label><button type="button" onClick={applyPromo}>Apply</button>{promoMsg && <span role="status">{promoMsg}</span>}</div>
    <h2>Summary</h2>{cart.map((l: any) => <p key={l.variantId}>{l.qty} × {l.name} ({l.size}{l.colour && ', ' + l.colour}) {kes(l.price * l.qty)}</p>)}
    <p className="total">Subtotal {kes(total)}</p>{disc > 0 && <p>Promo discount −{kes(disc)}</p>}<p>The final total, including any delivery fee, is confirmed by the store when you submit.</p>
    {err && <p role="alert" className="err">{err}</p>}<button className="btn" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button></form></section>
}

export function Confirmation() {
  const { ref } = useParams(); const st: any = (history.state && history.state.usr) || {}
  return <section className="wrap"><h1>Order received</h1><p>Your order reference</p><p className="ref">{ref}</p>
    {st.total_kes != null && <p>Total: {kes(st.total_kes)}</p>}<p>Status: received. The store will confirm your order and payment. Keep this reference.</p>
    <Link className="btn" to="/track">Track order</Link></section>
}

export function Contact() {
  const [done, setDone] = useState(false); const [err, setErr] = useState('')
  const submit = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = new FormData(e.currentTarget)
    const { error } = await supabase.from('contact_messages').insert({ name: d.get('name'), contact: d.get('contact'), subject: d.get('subject') || null, message: d.get('message') })
    error ? setErr('Could not send. Check the fields and try again.') : setDone(true) }
  if (done) return <section className="wrap"><h1>Message sent</h1><p>The store will get back to you.</p></section>
  return <section className="wrap"><h1>Contact</h1><form onSubmit={submit} className="form">
    <label>Name<input name="name" required maxLength={120} /></label><label>Phone or email<input name="contact" required minLength={3} maxLength={160} /></label>
    <label>Subject<input name="subject" maxLength={160} /></label><label>Message<textarea name="message" required maxLength={4000} /></label>
    {err && <p role="alert" className="err">{err}</p>}<button className="btn">Send message</button></form></section>
}

export function Track() {
  const [ref, setRef] = useState(''); const [phone, setPhone] = useState(''); const [o, setO] = useState<any>(undefined); const [busy, setBusy] = useState(false)
  const go = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); const r = await supabase.rpc('track_order', { p_ref: ref, p_phone: phone }); setBusy(false); setO(r.error ? null : r.data) }
  return <section className="wrap"><h1>Track order</h1><form className="form" onSubmit={go}>
    <label>Order reference<input required value={ref} onChange={e => setRef(e.target.value.toUpperCase())} /></label>
    <label>Phone number used for the order<input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} /></label>
    <button className="btn" disabled={busy}>{busy ? 'Checking…' : 'Track order'}</button></form>
    {o === null && <p role="alert" className="err">No order matches that reference and phone number.</p>}
    {o && <div><h2>{o.reference}</h2><p>Placed {new Date(o.created_at).toLocaleDateString('en-KE')} · Status: {o.status.replace(/_/g, ' ')} · Payment: {o.payment_status.replace(/_/g, ' ')} · {o.fulfilment}</p>
      {o.items.map((i: any, n: number) => <p key={n}>{i.quantity} × {i.name} ({i.size}{i.colour && ', ' + i.colour}) {kes(i.unit_price_kes)}</p>)}<p className="total">Total {kes(o.total_kes)}</p>
      <h3>Updates</h3>{o.updates.map((u: any, n: number) => <p key={n}>{new Date(u.at).toLocaleString('en-KE')} · {u.status.replace(/_/g, ' ')} {u.note && '· ' + u.note}</p>)}</div>}
    <p>Phone check is not OTP verification. Contact the store if you need help. <Link to="/contact">Contact us</Link></p></section>
}
export function Page({ k }: { k: string }) {
  const [v, setV] = useState<any>(undefined)
  useEffect(() => { setV(undefined); supabase.from('store_settings').select('value').eq('key', 'page:' + k).maybeSingle().then(r => setV(r.data?.value || null)) }, [k])
  useEffect(() => { document.title = (v?.title || 'ZAVO') + ' | ZAVO' }, [v])
  if (v === undefined) return <p className="wrap">Loading…</p>
  if (!v) return <section className="wrap"><h1>Coming soon</h1><p>This page has not been written yet.</p></section>
  return <section className="wrap prose"><h1>{v.title}</h1>{String(v.body || '').split(/\n\s*\n/).map((t: string, n: number) => <p key={n}>{t}</p>)}</section>
}
export function Faq() {
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => { supabase.from('faqs').select('*').order('sort_order').then(r => setRows(r.data || [])) }, [])
  return <section className="wrap prose"><h1>FAQ</h1>{rows && !rows.length && <p>No questions yet.</p>}{(rows || []).map(f => <details key={f.id}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</section>
}
export const NotFound = () => <section className="wrap"><h1>Page not found</h1><Link to="/">Go home</Link></section>
