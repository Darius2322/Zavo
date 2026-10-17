import { useEffect, useState } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './lib'
import { Orders, Products, Catalogue, ReviewsAdmin, Enquiries, Content, System, Dashboard, Mfa, MfaGate } from './panel'

type Profile = { role: 'owner' | 'staff'; active: boolean; full_name: string; permissions: string[] }
const getProfile = async (): Promise<Profile | null> => {
  const u = (await supabase.auth.getUser()).data.user; if (!u) return null
  const r = await supabase.from('admin_profiles').select('role,active,full_name,permissions').eq('user_id', u.id).maybeSingle(); return (r.data as Profile) || null
}

function Landing() {
  return <main className="auth"><h1>ZAVO<br />back office</h1><p>Authorised personnel only. Choose how you sign in.</p>
    <Link className="btn" to="/admin">Administrator sign in</Link><Link className="btn ghost" to="/staff">Staff sign in</Link></main>
}

function SignIn({ kind }: { kind: 'admin' | 'staff' }) {
  const nav = useNavigate(); const [e, setE] = useState(''); const [p, setP] = useState(''); const [show, setShow] = useState(false); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false)
  const go = async (ev: React.FormEvent) => { ev.preventDefault(); setBusy(true); setMsg('')
    const r = await supabase.auth.signInWithPassword({ email: e, password: p })
    if (r.error) { setBusy(false); return setMsg('Sign-in failed. Check your email and password.') }
    const pr = await getProfile(); const bad = !pr || !pr.active ? 'This account does not have access.' : kind === 'admin' && pr.role !== 'owner' ? 'This is not an administrator account. Use staff sign-in.' : kind === 'staff' && pr.role !== 'staff' ? 'Administrators sign in from the administrator page.' : ''
    if (bad) { await supabase.auth.signOut(); setBusy(false); return setMsg(bad) }
    nav('/app') }
  const reset = async () => { if (!e) return setMsg('Enter your email first.'); await supabase.auth.resetPasswordForEmail(e, { redirectTo: location.origin + '/' + kind }); setMsg('If that account exists, a reset email was sent.') }
  return <main className="auth"><p className="eyebrow">{kind === 'admin' ? 'Administrator' : 'Staff'}</p><h1>Sign in</h1><form className="form" onSubmit={go}>
    <label>Email<input type="email" required autoComplete="username" value={e} onChange={x => setE(x.target.value)} /></label>
    <label>Password<input type={show ? 'text' : 'password'} required autoComplete="current-password" value={p} onChange={x => setP(x.target.value)} /></label>
    <label className="inline"><input type="checkbox" checked={show} onChange={x => setShow(x.target.checked)} /> Show password</label>
    {msg && <p role="alert" className="err">{msg}</p>}<button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    <button type="button" className="link" onClick={reset}>Forgot password</button></form><p><Link to="/" className="link">Back</Link></p></main>
}

const NEED: Record<string, string> = { dashboard: 'orders', orders: 'orders', products: 'products', catalogue: 'products', reviews: 'content', enquiries: 'enquiries', content: 'content', system: 'staff' }

function Shell() {
  const nav = useNavigate(); const [st, setSt] = useState<'load' | 'out' | 'denied' | 'enroll' | 'verify' | 'ok'>('load'); const [pr, setPr] = useState<Profile | null>(null); const [tab, setTab] = useState(''); const [err, setErr] = useState(''); const [email, setEmail] = useState('')
  useEffect(() => { (async () => {
    const s = (await supabase.auth.getSession()).data.session; if (!s) return setSt('out'); setEmail(s.user.email || '')
    const p = await getProfile(); if (!p || !p.active) return setSt('denied'); setPr(p)
    const a = (await supabase.auth.mfa.getAuthenticatorAssuranceLevel()).data
    if (p.role === 'owner' && a?.nextLevel !== 'aal2' && a?.currentLevel !== 'aal2') return setSt('enroll')
    if (a?.nextLevel === 'aal2' && a?.currentLevel !== 'aal2') return setSt('verify')
    setSt('ok') })() }, [])
  const out = async () => { await supabase.auth.signOut(); nav('/') }
  if (st === 'load') return <main className="auth"><p>Loading…</p></main>
  if (st === 'out') return <Navigate to="/" replace />
  if (st === 'denied') return <main className="auth"><h1>Access denied</h1><p>This account is not authorised.</p><button className="btn" onClick={out}>Sign out</button></main>
  if (st === 'enroll') return <main className="auth"><h1>Set up two-factor</h1><p>Administrator accounts must use an authenticator app. Scan the code, then enter the 6-digit number.</p><Mfa /></main>
  if (st === 'verify') return <MfaGate />
  const tabs = ['dashboard', 'orders', 'products', 'catalogue', 'reviews', 'enquiries', 'content', 'system'].filter(t => pr!.role === 'owner' || pr!.permissions.includes(NEED[t]))
  const cur = tab || tabs[0]; const f = setErr
  return <div className="shell"><aside><div className="brand">ZAVO<span>{pr!.role === 'owner' ? 'Admin' : 'Staff'}</span></div>
    <nav>{tabs.map(t => <button key={t} className={t === cur ? 'on' : ''} onClick={() => { setTab(t); setErr('') }}>{t}</button>)}</nav>
    <div className="who">{pr!.full_name}<br /><small>{email}</small><button onClick={out}>Sign out</button></div></aside>
    <main className="panel"><h1>{cur}</h1>{err && <p role="alert" className="err">{err}</p>}
      {cur === 'dashboard' && <Dashboard fail={f} />}{cur === 'orders' && <Orders fail={f} />}{cur === 'products' && <Products fail={f} />}{cur === 'catalogue' && <Catalogue fail={f} />}
      {cur === 'reviews' && <ReviewsAdmin fail={f} />}{cur === 'enquiries' && <Enquiries fail={f} />}{cur === 'content' && <Content fail={f} />}{cur === 'system' && <System fail={f} />}</main></div>
}

export default function App() {
  return <Routes><Route path="/" element={<Landing />} /><Route path="/admin" element={<SignIn kind="admin" />} /><Route path="/staff" element={<SignIn kind="staff" />} /><Route path="/app" element={<Shell />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}
