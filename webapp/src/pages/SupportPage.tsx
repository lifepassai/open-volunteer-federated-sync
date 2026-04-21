import { Link } from '@heroui/react'

export function SupportPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-3 text-sm text-foreground/70">
        <p>If you need help, contact the maintainers or open an issue in the repository.</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="https://github.com/lifepassai/open-volunteer-federated-sync/issues"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Open an issue
          </Link>
        </div>
      </div>
    </div>
  )
}

