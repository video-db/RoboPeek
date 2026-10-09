import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './mcap.css'
import McapApp from './McapApp.tsx'
createRoot(document.getElementById('root')!).render(<StrictMode><McapApp /></StrictMode>)
