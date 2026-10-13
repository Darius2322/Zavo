import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store'
import './style.css'
createRoot(document.getElementById('root')!).render(<BrowserRouter><StoreProvider><App /></StoreProvider></BrowserRouter>)
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js').then(r => r.addEventListener('updatefound', () => { const w = r.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller && confirm('A new version of ZAVO is available. Update now?')) location.reload() }) }))
