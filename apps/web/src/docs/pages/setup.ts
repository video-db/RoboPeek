export const SETUP = `// npm i @videodb/robopeek-react @videodb/robopeek-rlds
// or: pnpm add @videodb/robopeek-react @videodb/robopeek-rlds
import { createRoot } from 'react-dom/client'
import '@videodb/robopeek-react/styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
`
