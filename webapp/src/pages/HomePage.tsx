import { BrandLogo } from '../components/BrandLogo'
import { DataList } from './datasets/DataList'

export function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <BrandLogo className="h-16 w-16 md:h-20 md:w-20" aria-label="Open Volunteer Federation" />
        <p className="max-w-2xl text-left text-base leading-relaxed text-slate-600 dark:text-slate-300">
          The Open Volunteer Federation node manages a set of datasets: Volunteers, Volunteering
          Opportunities, and the Organizations that host the opportunities.
        </p>
        <p className="max-w-2xl text-left text-base leading-relaxed text-slate-600 dark:text-slate-300">
          This node can subscribe to other nodes to receive their full or partial datasets.  This node can
          also publish its datasets to other nodes that subscribe.
        </p>
      </div>

      <div className="w-full max-w-2xl text-left">
        <DataList />
      </div>
    </div>
  )
}

