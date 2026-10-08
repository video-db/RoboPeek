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
  code: <><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  play: <path d="m9 5 11 7-11 7V5Z" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  camera: <><path d="m8 5 2-2h4l2 2h4v15H4V5h4Z" /><circle cx="12" cy="12" r="4" /></>,
  sliders: <><path d="M4 7h6m4 0h6M4 17h10m4 0h2M10 4v6m4 4v6" /></>,
  terminal: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m6 8 4 4-4 4m7 0h5" /></>,
  github: <><path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1-.2-2-1-2 4 0 7-2 7-6 0-2-.7-3-2-4 0-1 0-2-.5-3-2 0-3 1-4 1-2-.5-4-.5-6 0-1 0-2-1-4-1-.5 1-.5 2-.5 3-1.3 1-2 2-2 4 0 4 3 6 7 6-.8 0-1 1-1 2v4" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
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
