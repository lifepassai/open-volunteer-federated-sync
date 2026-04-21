import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from './icons'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:text-slate-50 dark:hover:text-slate-200 dark:focus:ring-slate-500/60"
      onClick={() => {
        const next = isDark ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', next === 'dark')
        localStorage.setItem('ovfs.theme', next)
      }}
    >
      {isDark ? (
        <IconSun title="Sun" className="h-7 w-7" />
      ) : (
        <IconMoon title="Moon" className="h-7 w-7" />
      )}
    </button>
  )
}

