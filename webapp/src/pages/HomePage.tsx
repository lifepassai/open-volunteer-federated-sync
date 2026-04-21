import { BrandLogo } from '../components/BrandLogo'

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <BrandLogo className="h-14 w-14 md:h-16 md:w-16" aria-label="Open Volunteer Federation" />
      </div>

      <div className="text-sm text-foreground/60">
        Next: we’ll have the backend verify your Google ID token and create/update your DynamoDB account.
      </div>
    </div>
  )
}

