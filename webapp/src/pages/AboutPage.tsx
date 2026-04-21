export function AboutPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-3 text-sm text-foreground/70">
        <p>
          Open Volunteer Federated Sync (OVFS) is a lightweight app for signing in and managing an
          account that will be synchronized across a federation of open-volunteer systems.
        </p>
        <p>
          This web app is a single-page application (SPA) deployed on AWS. Authentication uses Google
          OAuth and the backend stores account metadata in DynamoDB.
        </p>
      </div>
    </div>
  )
}

