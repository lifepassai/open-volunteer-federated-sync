import { listVolunteerDataset } from '../../net/serverApi'
import { useAccountStore } from '../../stores/accountStore'
import { DatasetExplorer } from './DatasetExplorer'
import { DatasetSubscriber } from './DatasetSubscriber'
import { DatasetSubscriberList } from './DatasetSubscriberList'
import { DatasourcesList } from './DatasourcesList'

export function VolunteerDatasetPage() {
  const { account } = useAccountStore()
  const isAdmin = account?.role === 'admin'

  return (
    <div className="space-y-6">
      {account ? (
        <DatasetExplorer
          defaultCollapsed
          title="Volunteer dataset"
          description="Records from the managed volunteer dataset."
          fetchRows={listVolunteerDataset}
        />
      ) : null}
      <DatasetSubscriber
        type="volunteer"
        title="My subscription"
        description="Your subscription to this volunteer dataset."
      />
      {isAdmin && <DatasetSubscriberList type="volunteer" />}
      {isAdmin && <DatasourcesList type="volunteer" />}
    </div>
  )
}
