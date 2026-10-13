import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
export type Line = { variantId: string; name: string; size: string; colour: string; price: number; qty: number; image?: string; max: number }
function useLocal<T>(k: string, init: T) {
  const [v, set] = useState<T>(() => { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return init } })
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }, [k, v])
  return [v, set] as const
}
const Ctx = createContext<any>(null)
export const useStore = () => useContext(Ctx)
export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useLocal<Line[]>('zavo-cart', [])
  const [wish, setWish] = useLocal<string[]>('zavo-wish', [])
  const add = (l: Line) => setCart(c => { const i = c.findIndex(x => x.variantId === l.variantId)
    if (i < 0) return [...c, { ...l, qty: Math.min(l.qty, l.max) }]
    const n = [...c]; n[i] = { ...n[i], qty: Math.min(n[i].qty + l.qty, l.max) }; return n })
  const setQty = (id: string, q: number) => setCart(c => c.map(x => x.variantId === id ? { ...x, qty: Math.max(1, Math.min(q, x.max)) } : x))
  const remove = (id: string) => setCart(c => c.filter(x => x.variantId !== id))
  const toggleWish = (id: string) => setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id])
  return <Ctx.Provider value={{ cart, add, setQty, remove, clear: () => setCart([]), wish, toggleWish }}>{children}</Ctx.Provider>
}
