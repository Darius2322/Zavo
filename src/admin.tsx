import { useEffect, useState } from 'react'
import { supabase, kes } from './lib'

const ORDER = ['received', 'awaiting_confirmation', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'completed', 'cancelled']
const PAY = ['method_selected', 'awaiting_confirmation', 'confirmed', 'failed', 'refunded']
const PAGES = ['about', 'size-guide', 'delivery', 'returns', 'privacy', 'terms']

export default function Admin() {
  const [ok, setOk] = useState<null | boolean>(null); const [session, setSession] = useState<any>(undefined); const [tab, setTab] = useState('dashboard'); const [needMfa, setNeedMfa] = useState(false); const [err, setErr] = useState('')
  useEffect(() => { const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.appendChild(m); return () => { m.remove() } }, [])
  useEffect(() => { supabase.auth.getSession().then(r => setSession(r.data.session)); const { data } = supabase.auth.onAuthStateChange((_, s) => setSession(s)); return () => data.subscription.unsubscribe() }, [])
  useEffect(() => { if (session) supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(r => setNeedMfa(r.data?.nextLevel === 'aal2' && r.data?.currentLevel !== 'aal2')) }, [session])
  useEffect(() => { if (session) supabase.from('admin_profiles').select('active').eq('user_id', session.user.id).maybeSingle().then(r => setOk(!!r.data?.active)); else setOk(null) }, [session])
  if (session === undefined) return <p className="wrap">Loading…</p>
  if (!session) return <Login />
  if (needMfa) return <MfaGate />
  if (ok === null) return <p className="wrap">Checking access…</p>
  if (!ok) return <section className="wrap"><h1>Access denied</h1><p>This account is not a staff account.</p><button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button></section>
  return <section className="wrap"><div className="row"><h1>ZAVO admin</h1>{['dashboard', 'orders', 'products', 'catalogue', 'reviews', 'enquiries', 'content', 'system'].map(t => <button key={t} className={tab === t ? 'chip on' : 'chip'} onClick={() => setTab(t)}>{t}</button>)}
    <button className="chip" onClick={() => supabase.auth.signOut()}>Sign out</button></div>{err && <p role="alert" className="err">{err}</p>}
    {tab === 'catalogue' && <Catalogue fail={setErr} />}{tab === 'reviews' && <ReviewsAdmin fail={setErr} />}{tab === 'dashboard' && <Dashboard fail={setErr} />}{tab === 'system' && <System fail={setErr} />}{tab === 'orders' && <Orders fail={setErr} />}{tab === 'products' && <Products fail={setErr} />}{tab === 'enquiries' && <Enquiries fail={setErr} />}{tab === 'content' && <Content fail={setErr} />}</section>
}

function Login() {
  const [e, setE] = useState(''); const [p, setP] = useState(''); const [show, setShow] = useState(false); const [msg, setMsg] = useState('')
  const go = async (ev: React.FormEvent) => { ev.preventDefault(); const r = await supabase.auth.signInWithPassword({ email: e, password: p }); if (r.error) setMsg('Sign-in failed. Check your email and password.') }
  const reset = async () => { if (!e) return setMsg('Enter your email first.'); await supabase.auth.resetPasswordForEmail(e, { redirectTo: location.href }); setMsg('If that account exists, a reset email was sent.') }
  return <section className="wrap"><h1>Staff sign in</h1><form className="form" onSubmit={go}>
    <label>Email<input type="email" required autoComplete="username" value={e} onChange={x => setE(x.target.value)} /></label>
    <label>Password<input type={show ? 'text' : 'password'} required autoComplete="current-password" value={p} onChange={x => setP(x.target.value)} /></label>
    <label><input type="checkbox" checked={show} onChange={x => setShow(x.target.checked)} /> Show password</label>
    {msg && <p role="alert" className="err">{msg}</p>}<button className="btn">Sign in</button><button type="button" onClick={reset}>Forgot password</button></form></section>
}

function Orders({ fail }: { fail: (s: string) => void }) {
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState(''); const [st, setSt] = useState('')
  const load = () => { let b = supabase.from('orders').select('*,order_items(*)').order('created_at', { ascending: false }).limit(50)
    if (st) b = b.eq('status', st); if (q) b = b.ilike('reference', `%${q}%`); b.then(r => r.error ? fail(r.error.message) : setRows(r.data || [])) }
  useEffect(load, [st, q])
  const act = async (fn: string, args: any) => { const r = await supabase.rpc(fn, args); fail(r.error?.message || ''); load() }
  return <div><div className="filters"><input placeholder="Search reference" value={q} onChange={e => setQ(e.target.value.toUpperCase())} />
    <select aria-label="Status" value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option>{ORDER.map(s => <option key={s}>{s}</option>)}</select></div>
    {!rows.length && <p>No orders.</p>}{rows.map(o => <details key={o.id} className="line" style={{ display: 'block' }}>
      <summary><b>{o.reference}</b> · {o.customer_name} · {kes(o.total_kes)}{+o.discount_kes > 0 && ` (promo ${o.promo_code} −${kes(o.discount_kes)})`} · {o.status} · pay: {o.payment_status}</summary>
      <p>{o.phone} {o.email} · {o.fulfilment} {o.address} {o.town} {o.directions}</p><p>{o.notes && 'Customer note: ' + o.notes}</p>
      {o.order_items.map((i: any) => <p key={i.id}>{i.quantity} × {i.product_name} ({i.size} {i.colour}) {kes(i.unit_price_kes)}</p>)}
      <p><button onClick={() => window.print()}>Print receipt</button></p><label>Status <select value={o.status} onChange={e => { const note = prompt('Note for the customer (optional)') || null; act('admin_set_order_status', { p_id: o.id, p_status: e.target.value, p_note: note }) }}>{ORDER.map(s => <option key={s}>{s}</option>)}</select></label>{' '}
      <label>Payment <select value={o.payment_status} onChange={e => confirm('Change payment status?') && act('admin_set_payment_status', { p_id: o.id, p_status: e.target.value })}>{PAY.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Internal note<textarea defaultValue={o.internal_notes || ''} onBlur={e => supabase.from('orders').update({ internal_notes: e.target.value }).eq('id', o.id).then(r => fail(r.error?.message || ''))} /></label></details>)}</div>
}

function Products({ fail }: { fail: (s: string) => void }) {
  const [rows, setRows] = useState<any[]>([]); const [cats, setCats] = useState<any[]>([]); const [brands, setBrands] = useState<any[]>([]); const [f, setF] = useState<any>({ status: 'draft' })
  const load = () => { supabase.from('products').select('*,product_variants(*),product_images(id,path,sort_order)').order('created_at', { ascending: false }).then(r => r.error ? fail(r.error.message) : setRows(r.data || []))
    supabase.from('categories').select('*').order('sort_order').then(r => setCats(r.data || [])); supabase.from('brands').select('*').then(r => setBrands(r.data || [])) }
  useEffect(load, [])
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const add = async (e: React.FormEvent) => { e.preventDefault()
    const p = await supabase.from('products').insert({ name: f.name, slug: slug(f.name) + '-' + Math.random().toString(36).slice(2, 6), price_kes: +f.price, status: f.status, category_id: f.cat || null, description: f.desc || null, condition: f.condition || null, is_unique: !!f.uniq }).select('id').single()
    if (p.error) return fail(p.error.message)
    const v = await supabase.from('product_variants').insert({ product_id: p.data.id, size: f.size || 'One size', colour: f.colour || '', stock: +f.stock || 0 }); fail(v.error?.message || ''); setF({ status: 'draft' }); load() }
  const upload = async (id: string, file?: File) => { if (!file) return; if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5e6) return fail('Use a JPG, PNG or WebP under 5 MB.')
    const path = `${id}/${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`; const u = await supabase.storage.from('product-images').upload(path, file)
    if (u.error) return fail(u.error.message); const r = await supabase.from('product_images').insert({ product_id: id, path }); fail(r.error?.message || ''); load() }
  const adjust = async (vid: string) => { const d = +(prompt('Stock change (e.g. 5 or -2)') || 0); const reason = prompt('Reason'); if (!d || !reason) return; const r = await supabase.rpc('admin_adjust_stock', { p_variant: vid, p_delta: d, p_reason: reason }); fail(r.error?.message || ''); load() }
  const edit = async (p: any) => { const name = prompt('Name', p.name); if (!name) return; const price = prompt('Price (KES)', String(p.price_kes)); if (price === null || isNaN(+price)) return
    const desc = prompt('Description', p.description || ''); const was = p.price_kes
    const r = await supabase.from('products').update({ name, price_kes: +price, description: desc, updated_at: new Date().toISOString() }).eq('id', p.id)
    if (!r.error && +price !== +was) await supabase.from('audit_log').insert({ action: 'price_change', detail: { product: p.id, from: was, to: +price } }); fail(r.error?.message || ''); load() }
  const mainImg = async (p: any, i: any) => { const min = Math.min(...p.product_images.map((x: any) => x.sort_order)); const r = await supabase.from('product_images').update({ sort_order: min - 1 }).eq('id', i.id); fail(r.error?.message || ''); load() }
  const delImg = async (i: any) => { if (!confirm('Delete this image?')) return; await supabase.storage.from('product-images').remove([i.path]); const r = await supabase.from('product_images').delete().eq('id', i.id); fail(r.error?.message || ''); load() }
  const addBrand = async () => { const name = prompt('Brand name'); if (!name) return; const r = await supabase.from('brands').insert({ name }); fail(r.error?.message || ''); load() }
  const addCat = async () => { const name = prompt('Category name'); if (!name) return; const r = await supabase.from('categories').insert({ name, slug: slug(name) }); fail(r.error?.message || ''); load() }
  return <div><form className="form" onSubmit={add}><h2>Add product</h2>
    <label>Name<input required onChange={e => setF({ ...f, name: e.target.value })} value={f.name || ''} /></label>
    <label>Price (KES)<input required type="number" min={0} onChange={e => setF({ ...f, price: e.target.value })} value={f.price || ''} /></label>
    <label>Category<select onChange={e => setF({ ...f, cat: e.target.value })}><option value="">None</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button type="button" onClick={addCat}>New category</button>
    <label>Size<input onChange={e => setF({ ...f, size: e.target.value })} value={f.size || ''} /></label><label>Colour<input onChange={e => setF({ ...f, colour: e.target.value })} value={f.colour || ''} /></label>
    <label>Stock<input type="number" min={0} onChange={e => setF({ ...f, stock: e.target.value })} value={f.stock || ''} /></label>
    <label>Condition<input onChange={e => setF({ ...f, condition: e.target.value })} value={f.condition || ''} /></label><label>Description<textarea onChange={e => setF({ ...f, desc: e.target.value })} value={f.desc || ''} /></label>
    <label><input type="checkbox" onChange={e => setF({ ...f, uniq: e.target.checked })} /> One-off item</label>
    <label>Status<select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option>draft</option><option>published</option></select></label><button className="btn">Save product</button></form>
    {rows.map(p => <div key={p.id} className="line" style={{ display: 'block' }}><b>{p.name}</b> · {kes(p.price_kes)} <button onClick={() => edit(p)}>Edit</button> · {p.status} · {p.product_images.length} image(s)
      <div className="row"><select value={p.status} onChange={e => supabase.from('products').update({ status: e.target.value, updated_at: new Date().toISOString() }).eq('id', p.id).then(r => { fail(r.error?.message || ''); load() })}><option>draft</option><option>published</option><option>archived</option></select>
        <select aria-label="Brand" value={p.brand_id || ''} onChange={e => supabase.from('products').update({ brand_id: e.target.value || null }).eq('id', p.id).then(r => { fail(r.error?.message || ''); load() })}><option value="">No brand</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select><button onClick={addBrand}>New brand</button>
        {[...p.product_images].sort((a: any, b: any) => a.sort_order - b.sort_order).map((i: any, n: number) => <span key={i.id}>image {n + 1} <button onClick={() => mainImg(p, i)}>Main</button><button onClick={() => delImg(i)}>Delete</button></span>)}
        <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload image" onChange={e => upload(p.id, e.target.files?.[0])} /></div>
      {p.product_variants.map((v: any) => <p key={v.id}>{v.size} {v.colour}: {v.stock} in stock <button onClick={() => adjust(v.id)}>Adjust</button>{v.stock <= v.low_stock_threshold && ' (low)'}</p>)}</div>)}</div>
}

function Enquiries({ fail }: { fail: (s: string) => void }) {
  const [rows, setRows] = useState<any[]>([]); const load = () => supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100).then(r => r.error ? fail(r.error.message) : setRows(r.data || []))
  useEffect(() => { load() }, [])
  return <div>{!rows.length && <p>No enquiries.</p>}{rows.map(m => <div className="line" style={{ display: 'block' }} key={m.id}><b>{m.name}</b> · {m.contact} · {m.subject}<p>{m.message}</p>
    <select value={m.state} onChange={e => supabase.from('contact_messages').update({ state: e.target.value }).eq('id', m.id).then(r => { fail(r.error?.message || ''); load() })}><option value="new">new</option><option value="in_progress">in progress</option><option value="resolved">resolved</option></select></div>)}</div>
}

function Content({ fail }: { fail: (s: string) => void }) {
  const [k, setK] = useState('about'); const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [fee, setFee] = useState(''); const [done, setDone] = useState('')
  useEffect(() => { supabase.from('store_settings').select('value').eq('key', 'page:' + k).maybeSingle().then(r => { setTitle(r.data?.value?.title || ''); setBody(r.data?.value?.body || '') }) }, [k])
  useEffect(() => { supabase.from('store_settings').select('value').eq('key', 'delivery_fee_kes').maybeSingle().then(r => setFee(r.data ? String(r.data.value) : '')) }, [])
  const save = async () => { const r = await supabase.from('store_settings').upsert({ key: 'page:' + k, value: { title, body }, is_public: true, updated_at: new Date().toISOString() }); fail(r.error?.message || ''); setDone(r.error ? '' : 'Saved.') }
  const saveFee = async () => { const r = await supabase.from('store_settings').upsert({ key: 'delivery_fee_kes', value: +fee || 0, is_public: false, updated_at: new Date().toISOString() }); fail(r.error?.message || ''); setDone(r.error ? '' : 'Delivery fee saved.') }
  return <div className="form"><label>Page<select value={k} onChange={e => setK(e.target.value)}>{PAGES.map(p => <option key={p}>{p}</option>)}</select></label>
    <label>Title<input value={title} onChange={e => setTitle(e.target.value)} /></label><label>Content (blank line starts a new paragraph)<textarea rows={12} value={body} onChange={e => setBody(e.target.value)} /></label>
    <button className="btn" onClick={save}>Save page</button><label>Delivery fee (KES)<input type="number" min={0} value={fee} onChange={e => setFee(e.target.value)} /></label><button className="btn ghost" onClick={saveFee}>Save delivery fee</button>{done && <p role="status">{done}</p>}</div>
}

function Dashboard({ fail }: { fail: (s: string) => void }) {
  const [from, setFrom] = useState(''); const [o, setO] = useState<any[]>([]); const [v, setV] = useState<any[]>([]); const [m, setM] = useState<any[]>([])
  useEffect(() => { let b = supabase.from('orders').select('status,payment_status,total_kes,created_at').limit(2000); if (from) b = b.gte('created_at', from)
    b.then(r => r.error ? fail(r.error.message) : setO(r.data || [])) }, [from])
  useEffect(() => { supabase.from('product_variants').select('stock,low_stock_threshold').then(r => setV(r.data || [])); supabase.from('contact_messages').select('id,state').eq('state', 'new').then(r => setM(r.data || [])) }, [])
  const n = (s: string) => o.filter(x => x.status === s).length; const live = o.filter(x => x.status !== 'cancelled')
  const paid = live.filter(x => x.payment_status === 'confirmed').reduce((a, x) => a + +x.total_kes, 0)
  const owed = live.filter(x => !['confirmed', 'refunded'].includes(x.payment_status)).reduce((a, x) => a + +x.total_kes, 0)
  const cards: [string, string | number][] = [['Total orders', o.length], ['New', n('received')], ['Awaiting confirmation', n('awaiting_confirmation')], ['Processing', n('processing')], ['Completed', n('completed')], ['Cancelled', n('cancelled')],
    ['Paid sales (confirmed)', kes(paid)], ['Outstanding payments', kes(owed)], ['Units in stock', v.reduce((a, x) => a + x.stock, 0)], ['Low stock', v.filter(x => x.stock > 0 && x.stock <= x.low_stock_threshold).length], ['Out of stock', v.filter(x => x.stock === 0).length], ['New enquiries', m.length]]
  return <div><label>From date <input type="date" onChange={e => setFrom(e.target.value)} /></label><div className="grid" style={{ marginTop: 12 }}>{cards.map(([k, x]) => <div key={k} className="line" style={{ display: 'block' }}><p>{k}</p><b>{x}</b></div>)}</div></div>
}

function System({ fail }: { fail: (s: string) => void }) {
  const [log, setLog] = useState<any[]>([]); const [staff, setStaff] = useState<any[]>([]); const [f, setF] = useState<any>({ role: 'staff' })
  const load = () => { supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(50).then(r => setLog(r.data || [])); supabase.from('admin_profiles').select('*').then(r => r.error ? fail(r.error.message) : setStaff(r.data || [])) }
  useEffect(load, [])
  const add = async (e: React.FormEvent) => { e.preventDefault(); const r = await supabase.from('admin_profiles').insert({ user_id: f.id, full_name: f.name, role: f.role, permissions: (f.perms || '').split(',').map((s: string) => s.trim()).filter(Boolean) }); fail(r.error?.message || ''); load() }
  return <div><h2>Staff</h2>{staff.map(s => <p key={s.user_id}>{s.full_name} · {s.role} · {s.permissions.join(', ') || 'no permissions'} · {s.active ? 'active' : 'inactive'}{' '}
    <button onClick={() => supabase.from('admin_profiles').update({ active: !s.active }).eq('user_id', s.user_id).then(r => { fail(r.error?.message || ''); load() })}>{s.active ? 'Deactivate' : 'Activate'}</button></p>)}
    <form className="form" onSubmit={add}><p>Create the user in Supabase Auth first, then paste their user ID.</p><label>User ID<input required onChange={e => setF({ ...f, id: e.target.value })} /></label><label>Name<input required onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Role<select onChange={e => setF({ ...f, role: e.target.value })}><option>staff</option><option>owner</option></select></label><label>Permissions (products, inventory, orders, enquiries, content, settings, staff)<input onChange={e => setF({ ...f, perms: e.target.value })} /></label><button className="btn">Add staff</button></form>
    <Mfa /><NewsletterList fail={fail} /><h2>Audit log</h2>{log.map(l => <p key={l.id}>{new Date(l.created_at).toLocaleString('en-KE')} · {l.action} · {JSON.stringify(l.detail)}</p>)}</div>
}

function ReviewsAdmin({ fail }: { fail: (s: string) => void }) {
  const [rows, setRows] = useState<any[]>([]); const load = () => supabase.from('product_reviews').select('*,products(name)').order('created_at', { ascending: false }).limit(100).then(r => r.error ? fail(r.error.message) : setRows(r.data || []))
  useEffect(() => { load() }, [])
  const set = (id: string, status: string) => supabase.from('product_reviews').update({ status }).eq('id', id).then(r => { fail(r.error?.message || ''); load() })
  return <div>{!rows.length && <p>No reviews.</p>}{rows.map(x => <div key={x.id} className="line" style={{ display: 'block' }}><b>{x.products?.name}</b> · {x.reviewer_name} · {x.rating}/5 · {x.status}<p>{x.comment}</p>
    <button onClick={() => set(x.id, 'approved')}>Approve</button> <button onClick={() => set(x.id, 'rejected')}>Reject</button></div>)}</div>
}

function Catalogue({ fail }: { fail: (s: string) => void }) {
  const [cats, setCats] = useState<any[]>([]); const [cols, setCols] = useState<any[]>([]); const [prods, setProds] = useState<any[]>([]); const [faqs, setFaqs] = useState<any[]>([]); const [cp, setCp] = useState<any>({}); const [promos, setPromos] = useState<any[]>([])
  const load = () => { supabase.from('categories').select('*').order('sort_order').then(r => setCats(r.data || [])); supabase.from('collections').select('*').order('sort_order').then(r => setCols(r.data || []))
    supabase.from('products').select('id,name').order('name').then(r => setProds(r.data || [])); supabase.from('faqs').select('*').order('sort_order').then(r => setFaqs(r.data || [])); supabase.from('promotions').select('*').order('created_at', { ascending: false }).then(r => setPromos(r.data || [])) }
  useEffect(load, [])
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const run = (p: PromiseLike<any>) => p.then((r: any) => { fail(r.error?.message || ''); load() })
  const upd = (t: string, id: string, v: any) => run(supabase.from(t).update(v).eq('id', id))
  return <div><h2>Categories</h2>{cats.map(c => <p key={c.id}>{c.name} · order {c.sort_order} · {c.active ? 'active' : 'inactive'}{' '}
      <button onClick={() => { const n = prompt('Name', c.name); n && upd('categories', c.id, { name: n }) }}>Rename</button>
      <button onClick={() => { const n = prompt('Order number', String(c.sort_order)); n !== null && !isNaN(+n) && upd('categories', c.id, { sort_order: +n }) }}>Reorder</button>
      <button onClick={() => upd('categories', c.id, { active: !c.active })}>{c.active ? 'Deactivate' : 'Activate'}</button></p>)}
    <h2>Collections</h2><button onClick={() => { const n = prompt('Collection name'); n && run(supabase.from('collections').insert({ name: n, slug: slug(n) })) }}>New collection</button>
    {cols.map(c => <p key={c.id}>{c.name} · {c.active ? 'active' : 'inactive'} <button onClick={() => upd('collections', c.id, { active: !c.active })}>{c.active ? 'Deactivate' : 'Activate'}</button></p>)}
    <div className="row"><select aria-label="Collection" onChange={e => setCp({ ...cp, c: e.target.value })}><option value="">Collection</option>{cols.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select aria-label="Product" onChange={e => setCp({ ...cp, p: e.target.value })}><option value="">Product</option>{prods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button onClick={() => cp.c && cp.p && run(supabase.from('collection_products').upsert({ collection_id: cp.c, product_id: cp.p }))}>Add to collection</button></div>
    <h2>Promo codes</h2><button onClick={() => { const code = (prompt('Code (e.g. WELCOME10)') || '').toUpperCase().trim(); const kind = prompt('Type: percent or fixed'); const value = +(prompt('Value (percent, or KES for fixed)') || 0); const min = +(prompt('Minimum subtotal in KES (0 for none)') || 0); const uses = prompt('Maximum uses (blank for unlimited)')
      code && (kind === 'percent' || kind === 'fixed') && value > 0 && run(supabase.from('promotions').insert({ code, kind, value, min_subtotal: min, max_uses: uses ? +uses : null })) }}>New promo code</button>
    {promos.map(x => <p key={x.id}>{x.code} · {x.kind === 'percent' ? x.value + '%' : kes(x.value)} · min {kes(x.min_subtotal)} · used {x.used_count}{x.max_uses ? '/' + x.max_uses : ''} · {x.active ? 'active' : 'off'} <button onClick={() => upd('promotions', x.id, { active: !x.active })}>{x.active ? 'Turn off' : 'Turn on'}</button></p>)}
    <h2>FAQs</h2><button onClick={() => { const topic = prompt('Topic (e.g. Delivery)'); const question = prompt('Question'); const answer = prompt('Answer'); topic && question && answer && run(supabase.from('faqs').insert({ topic, question, answer, sort_order: faqs.length })) }}>New FAQ</button>
    {faqs.map(f => <p key={f.id}>{f.question} · {f.published ? 'published' : 'hidden'}{' '}
      <button onClick={() => { const q = prompt('Question', f.question); const a = prompt('Answer', f.answer); q && a && upd('faqs', f.id, { question: q, answer: a }) }}>Edit</button>
      <button onClick={() => upd('faqs', f.id, { published: !f.published })}>{f.published ? 'Hide' : 'Publish'}</button>
      <button onClick={() => { const n = prompt('Order number', String(f.sort_order)); n !== null && !isNaN(+n) && upd('faqs', f.id, { sort_order: +n }) }}>Reorder</button>
      <button onClick={() => confirm('Delete this FAQ?') && run(supabase.from('faqs').delete().eq('id', f.id))}>Delete</button></p>)}</div>
}

export function Mfa() {
  const [e, setE] = useState<any>(null); const [code, setCode] = useState(''); const [m, setM] = useState('')
  const start = async () => { const r = await supabase.auth.mfa.enroll({ factorType: 'totp' }); r.error ? setM(r.error.message) : setE(r.data) }
  const verify = async () => { const c = await supabase.auth.mfa.challenge({ factorId: e.id }); if (c.error) return setM(c.error.message)
    const v = await supabase.auth.mfa.verify({ factorId: e.id, challengeId: c.data.id, code }); setM(v.error ? v.error.message : 'Two-factor sign-in enabled for this account.') }
  return <div><h2>Two-factor sign-in (optional)</h2>{!e && <button onClick={start}>Set up authenticator app</button>}
    {e && <div><img src={e.totp.qr_code} alt="QR code for your authenticator app" width="180" /><p>Or enter this key: {e.totp.secret}</p><input aria-label="6-digit code" value={code} onChange={x => setCode(x.target.value)} /><button onClick={verify}>Verify</button></div>}{m && <p role="status">{m}</p>}</div>
}

function NewsletterList({ fail }: { fail: (s: string) => void }) {
  const [r, setR] = useState<any[]>([]); useEffect(() => { supabase.from('newsletter_subscribers').select('email,created_at').order('created_at', { ascending: false }).then(x => x.error ? fail(x.error.message) : setR(x.data || [])) }, [])
  const csv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['email,subscribed\n' + r.map(x => x.email + ',' + x.created_at).join('\n')], { type: 'text/csv' })); a.download = 'subscribers.csv'; a.click() }
  return <div><h2>Newsletter subscribers ({r.length})</h2><button onClick={csv}>Download CSV</button></div>
}

function MfaGate() {
  const [code, setCode] = useState(''); const [m, setM] = useState('')
  const go = async (e: React.FormEvent) => { e.preventDefault(); const f = await supabase.auth.mfa.listFactors(); const id = f.data?.totp?.[0]?.id; if (!id) return setM('No authenticator found.')
    const c = await supabase.auth.mfa.challenge({ factorId: id }); if (c.error) return setM(c.error.message)
    const v = await supabase.auth.mfa.verify({ factorId: id, challengeId: c.data.id, code }); if (v.error) setM('That code did not work.'); else location.reload() }
  return <section className="wrap"><h1>Two-factor check</h1><form className="form" onSubmit={go}><label>6-digit code from your authenticator app<input inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.target.value)} /></label>
    {m && <p role="alert" className="err">{m}</p>}<button className="btn">Verify</button><button type="button" onClick={() => supabase.auth.signOut()}>Sign out</button></form></section>
}
