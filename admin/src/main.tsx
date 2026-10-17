import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { missingEnv } from './lib'
import './admin.css'
const root = document.getElementById('root')!
if (missingEnv) root.innerHTML = '<p style="padding:16px;font-family:sans-serif">Setup needed: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.</p>'
else createRoot(root).render(<BrowserRouter><App /></BrowserRouter>)
