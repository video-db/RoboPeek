import type { ComponentProps, ReactNode } from 'react'

export function Button({ className = '', variant = 'outline', ...props }: ComponentProps<'button'> & { variant?: 'primary' | 'outline' }) {
  return <button type="button" className={`ui-button ${className}`} data-variant={variant} {...props} />
}

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`ui-input ${className}`} {...props} />
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="ui-badge">{children}</span>
}

const paths = {
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M7 12h10" /></>,
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />,
  link: <><path d="m10 13 4-4m-5 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 0)" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  external: <path d="M7 17 17 7M7 7h10v10" />,
  book: <path d="M12 5v16M3 3h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V3Z" />,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  file: <><path d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8l-6-6Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
}

export function Icon({ name, className = '' }: { name: keyof typeof paths; className?: string }) {
  return <svg className={`icon ${className}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
