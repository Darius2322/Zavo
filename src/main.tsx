import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './store'
import { missingEnv } from './lib'
import './style.css'
const root = document.getElementById('root')!
if (missingEnv) root.innerHTML = '<p style="padding:16px;font-family:sans-serif">Setup needed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Add them in Vercel, then redeploy.</p>'
else createRoot(root).render(<BrowserRouter><StoreProvider><App /></StoreProvider></BrowserRouter>)
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js')
