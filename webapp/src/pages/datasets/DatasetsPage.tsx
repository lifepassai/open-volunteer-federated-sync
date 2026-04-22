import { DataList } from './DataList'

export function DatasetsPage() {
  return (
    <div className="space-y-6">
      <div className="text-sm text-foreground/60">Browse and open federated datasets.</div>
      <DataList />
    </div>
  )
}
