import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import EpisodeApp from './EpisodeApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EpisodeApp />
  </StrictMode>,
)
