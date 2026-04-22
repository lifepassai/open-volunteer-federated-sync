import { Card } from '@heroui/react'
import { NavLink } from 'react-router-dom'

export function DataList() {
  return (
    <div className="space-y-4">
      <NavLink
        to="/datasets/volunteer"
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/60"
      >
        <Card className="transition hover:bg-default-100">
          <Card.Content className="flex flex-row items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex flex-col gap-1">
              <h3>Volunteer Dataset</h3>
              <p className="text-sm text-foreground/70">Volunteer records and sync metadata.</p>
            </div>
            <span className="shrink-0 text-sm text-foreground/60" aria-hidden>
              →
            </span>
          </Card.Content>
        </Card>
      </NavLink>

      <NavLink
        to="/datasets/organization"
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/60"
      >
        <Card className="transition hover:bg-default-100">
          <Card.Content className="flex flex-row items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex flex-col gap-1">
              <h3>Organization Dataset</h3>
              <p className="text-sm text-foreground/70">Organization records and sync metadata.</p>
            </div>
            <span className="shrink-0 text-sm text-foreground/60" aria-hidden>
              →
            </span>
          </Card.Content>
        </Card>
      </NavLink>

      <NavLink
        to="/datasets/opportunity"
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/60"
      >
        <Card className="transition hover:bg-default-100">
          <Card.Content className="flex flex-row items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex flex-col gap-1">
              <h3>Opportunity Dataset</h3>
              <p className="text-sm text-foreground/70">Opportunity records and sync metadata.</p>
            </div>
            <span className="shrink-0 text-sm text-foreground/60" aria-hidden>
              →
            </span>
          </Card.Content>
        </Card>
      </NavLink>
    </div>
  )
}

