import { useRef, useState } from 'react'
import { CollapsibleCard } from '../../components/CollapsibleCard'
import { listVolunteerDataset } from '../../net/serverApi'
import { useAccountStore } from '../../stores/accountStore'
import { DatasetExplorer, type DatasetExplorerHandle } from './DatasetExplorer'
import { DatasetSubscriber } from './DatasetSubscriber'
import { DatasetSubscriberList } from './DatasetSubscriberList'
import { DatasourcesList } from './DatasourcesList'

export function VolunteerDatasetPage() {
  const { account } = useAccountStore()
  const isAdmin = account?.role === 'admin'

  const datasetExplorerRef = useRef<DatasetExplorerHandle | null>(null)
  const [datasetExplorerRefreshing, setDatasetExplorerRefreshing] = useState(false)

  return (
    <div className="space-y-6">
      <DatasetSubscriber
        type="volunteer"
        title="My subscription"
        description="Your subscription to this volunteer dataset."
      />
      {account ? (
        <CollapsibleCard
          title="Volunteer dataset"
          description="Records from the managed volunteer dataset."
          defaultCollapsed
          refreshing={datasetExplorerRefreshing}
          onRefresh={() => datasetExplorerRef.current?.reload()}
        >
          <DatasetExplorer
            ref={datasetExplorerRef}
            embedded
            fetchRows={listVolunteerDataset}
            onLoadingChange={setDatasetExplorerRefreshing}
          />
        </CollapsibleCard>
      ) : null}
      {isAdmin && <DatasetSubscriberList type="volunteer" />}
      {isAdmin && <DatasourcesList type="volunteer" />}
    </div>
  )
}
