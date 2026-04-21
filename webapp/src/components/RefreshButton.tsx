import { IconRefresh } from './icons'

export function RefreshButton(props: {
  label?: string
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
}) {
  const { label = 'Refresh', loading, disabled, onClick, className } = props
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={Boolean(disabled || loading)}
      className={
        className ??
        [
          'inline-flex items-center justify-center rounded-md p-2',
          'text-slate-900 hover:bg-default-100 hover:text-slate-700',
          'focus:outline-none focus:ring-2 focus:ring-slate-400/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:text-slate-50 dark:hover:text-slate-200 dark:focus:ring-slate-500/60',
        ].join(' ')
      }
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        <IconRefresh className="h-6 w-6" />
      )}
    </button>
  )
}

