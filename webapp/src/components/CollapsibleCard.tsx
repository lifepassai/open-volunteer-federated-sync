import { Card } from '@heroui/react'
import { useState, type ReactNode } from 'react'
import { IconChevronLeft, IconRefresh } from './icons'

export function CollapsibleCard(props: {
  title: string
  description?: string
  defaultCollapsed?: boolean
  actions?: ReactNode
  headerActions?: ReactNode
  refreshing?: boolean
  onRefresh?: () => void
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}) {
  const {
    title,
    description,
    defaultCollapsed = true,
    actions,
    headerActions,
    refreshing,
    onRefresh,
    onOpenChange,
    children,
  } = props

  const [open, setOpen] = useState(!defaultCollapsed)

  return (
    <Card>
      <Card.Content className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate">{title}</h3>
            {description ? <p className="text-sm text-foreground/70">{description}</p> : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {headerActions ? <div className="flex items-center gap-1">{headerActions}</div> : null}
            {onRefresh ? (
              <button
                type="button"
                aria-label="Refresh"
                title="Refresh"
                onClick={() => {
                  setOpen(true)
                  onOpenChange?.(true)
                  onRefresh()
                }}
                disabled={Boolean(refreshing)}
                className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-50 dark:hover:text-slate-200"
              >
                {refreshing ? (
                  <span
                    aria-hidden="true"
                    className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                ) : (
                  <IconRefresh className="h-6 w-6" />
                )}
              </button>
            ) : null}

            <button
              type="button"
              aria-label={open ? 'Collapse' : 'Expand'}
              title={open ? 'Collapse' : 'Expand'}
              onClick={() => {
                setOpen((v) => {
                  const next = !v
                  onOpenChange?.(next)
                  return next
                })
              }}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:bg-default-100 hover:text-slate-700 dark:text-slate-50 dark:hover:text-slate-200"
            >
              <IconChevronLeft className={['h-6 w-6 transition-transform', open ? '-rotate-90' : 'rotate-90'].join(' ')} />
            </button>
          </div>
        </div>

        {open ? <div className="space-y-3">{actions ? <div className="flex items-center justify-end gap-2">{actions}</div> : null}{children}</div> : null}
      </Card.Content>
    </Card>
  )
}

