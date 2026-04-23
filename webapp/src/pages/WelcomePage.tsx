import { BrandLogo } from '../components/BrandLogo'
import { GoogleLoginButton } from '../components/GoogleLoginButton'

export function WelcomePage() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex w-full max-w-2xl flex-col items-center gap-4 text-left">
        <BrandLogo className="h-16 w-16 md:h-20 md:w-20" aria-label="Open Volunteer Federation" />
        <p>
          This webapp and service demonstrate a <strong>Data Node</strong> in the Open Volunteer Federation.
        </p>
        <p>
          A Data Node contains a list of volunteers, volunteer involving organizations, and volunteering opportunities.  It can subscribe to other nodes to receive their full or partial datasets.  It can also publish its datasets to other nodes that subscribe.
        </p>
        <p>
          Each Data Node can decide if it wants a full copy from all the other nodes in the federation, or a smaller subset.
        </p>
        <p>
          Sign in with Google to view records in this dataset, and to create a subscription so you can receive a full snapshot or incremental updates.
        </p>
      </div>
      <div className="flex w-full justify-center">
        <GoogleLoginButton presentation="standard" />
      </div>
    </div>
  )
}
