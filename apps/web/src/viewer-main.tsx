import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ViewerApp from './ViewerApp.tsx'
createRoot(document.getElementById('root')!).render(<StrictMode><ViewerApp /></StrictMode>)
