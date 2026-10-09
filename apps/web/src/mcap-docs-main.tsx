import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './site.css'
import './docs/docs.css'
import { DocsApp } from './docs/DocsApp.tsx'
createRoot(document.getElementById('root')!).render(<StrictMode><DocsApp format="mcap" /></StrictMode>)
