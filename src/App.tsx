import { Routes, Route, Link, NavLink, useNavigate } from 'react-router-dom'
import { Home, Store, Heart, PackageSearch, ShoppingBag, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from './store'
import { Shop, Product, Wishlist, Cart, Checkout, Confirmation, Contact, Track, NotFound, Page, Faq, CollectionPage, Newsletter, Announce } from './pages'

export default function App() {
  const { cart } = useStore(); const nav = useNavigate()
  const count = cart.reduce((n: number, l: any) => n + l.qty, 0)
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => { const a = () => setOnline(true), b = () => setOnline(false)
    addEventListener('online', a); addEventListener('offline', b); return () => { removeEventListener('online', a); removeEventListener('offline', b) } }, [])
  const tabs = [['/', Home, 'Home'], ['/shop', Store, 'Shop'], ['/wishlist', Heart, 'Wishlist'], ['/track', PackageSearch, 'Track'], ['/cart', ShoppingBag, 'Cart']] as const
  return <>
    {!online && <div className="offline">You are offline. Checkout needs a connection.</div>}
    <Announce />
    <header className="top"><Link to="/" className="logo"><img src="/favicon.svg" alt="" width="28" height="28" />ZAVO</Link>
      <nav className="dnav"><NavLink to="/shop">Shop</NavLink><NavLink to="/track">Track order</NavLink><NavLink to="/contact">Contact</NavLink></nav>
      <form onSubmit={e => { e.preventDefault(); const q = new FormData(e.currentTarget).get('q'); nav('/shop?q=' + encodeURIComponent(String(q || ''))) }}>
        <label className="sr" htmlFor="q">Search</label><input id="q" name="q" placeholder="Search clothes" /><button aria-label="Search"><Search size={18} /></button></form>
      <Link to="/cart" className="cartlink" aria-label="Cart"><ShoppingBag size={22} />{count > 0 && <b>{count}</b>}</Link></header>
    <main><Routes>
      <Route path="/" element={<Shop home />} /><Route path="/shop" element={<Shop />} /><Route path="/product/:slug" element={<Product />} />
      <Route path="/wishlist" element={<Wishlist />} /><Route path="/cart" element={<Cart />} /><Route path="/checkout" element={<Checkout />} />
      <Route path="/order/:ref" element={<Confirmation />} /><Route path="/contact" element={<Contact />} /><Route path="/track" element={<Track />} />
      {[['about','about'],['size-guide','size-guide'],['delivery','delivery'],['returns','returns'],['privacy','privacy'],['terms','terms']].map(([r, k]) => <Route key={r} path={'/' + r} element={<Page k={k} />} />)}
      <Route path="/faq" element={<Faq />} /><Route path="/sale" element={<Shop sale />} /><Route path="/collection/:slug" element={<CollectionPage />} />
      <Route path="*" element={<NotFound />} /></Routes></main>
    <footer className="foot">{['sale', 'about', 'size-guide', 'delivery', 'returns', 'faq', 'contact', 'privacy', 'terms'].map(x => <Link key={x} to={'/' + x}>{x.replace('-', ' ')}</Link>)}<Newsletter /></footer>
    <nav className="bottom">{tabs.map(([to, I, l]) => <NavLink key={to} to={to} end={to === '/'}><I size={22} /><span>{l}</span></NavLink>)}</nav>
  </>
}
