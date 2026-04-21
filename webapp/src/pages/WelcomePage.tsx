import { BrandLogo } from '../components/BrandLogo'
import { GoogleLoginButton } from '../components/GoogleLoginButton'

export function WelcomePage() {
  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <BrandLogo className="h-16 w-16 md:h-20 md:w-20" aria-label="Open Volunteer Federation" />
        <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          This app helps organizations keep volunteer records in sync across a federation of databases. Sign in with
          Google to link your account, manage preferences, and (soon) connect to the sync service backed by the API.
        </p>
      </div>
      <div className="flex w-full justify-center">
        <GoogleLoginButton presentation="standard" />
      </div>
    </div>
  )
}
