export const MCAP_SETUP = `// npm i @videodb/robopeek-react @videodb/robopeek-mcap
// or: pnpm add @videodb/robopeek-react @videodb/robopeek-mcap
import { createRoot } from 'react-dom/client'
import '@videodb/robopeek-react/styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
`
