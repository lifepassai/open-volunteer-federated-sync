import { Avatar, Button, Card } from '@heroui/react'
import { GoogleLoginButton } from '../components/GoogleLoginButton'
import { useAccountStore } from '../stores/accountStore'

export function AccountPage() {
  const { account, logout } = useAccountStore()

  if (!account) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-foreground/70">
          Sign in to view and manage your account.
        </div>
        <GoogleLoginButton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <Card.Content className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              {account.pictureUrl ? <Avatar.Image src={account.pictureUrl} alt="" /> : null}
              <Avatar.Fallback>{(account.name ?? account.email ?? 'U').slice(0, 1).toUpperCase()}</Avatar.Fallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate">{account.name ?? '—'}</h2>
              <div className="truncate text-sm text-foreground/70">{account.email ?? '—'}</div>
              <div className="truncate text-sm text-foreground/70">
                Role: <span className="text-foreground">{account.role ?? '—'}</span>
              </div>
            </div>
          </div>
          <Button variant="secondary" onPress={logout}>
            Log out
          </Button>
        </Card.Content>
      </Card>
    </div>
  )
}

