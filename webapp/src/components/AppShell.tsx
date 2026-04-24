import { Avatar, Button, Separator } from '@heroui/react'
import type { PropsWithChildren } from 'react'
import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAccountStore } from '../stores/accountStore'
import { GoogleLoginButton } from './GoogleLoginButton'
import { ThemeToggle } from './ThemeToggle'
import { BrandLogo } from './BrandLogo'
import { IconChevronLeft, IconHamburger, IconX } from './icons'

type NavItem = { to: string; label: string; requiresAdmin?: boolean }

const navItems: NavItem[] = [
  { to: '/', label: 'Home' },
  { to: '/datasets', label: 'Datasets' },
  { to: '/settings', label: 'Settings' },
  { to: '/account', label: 'Account' },
  { to: '/about', label: 'About' },
  { to: '/terms', label: 'Terms' },
  { to: '/support', label: 'Support' },
  { to: '/manage-users', label: 'Admin', requiresAdmin: true },
]

const datasetPageTitles: Record<string, string> = {
  '/datasets/volunteer': 'Volunteer Dataset',
  '/datasets/organization': 'Organization Dataset',
  '/datasets/opportunity': 'Opportunity Dataset',
}

function isPublicRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/about' || pathname === '/terms' || pathname === '/support'
}

function isNavItemAccessible(item: NavItem, account: { role?: string } | null): boolean {
  if (!account) return isPublicRoute(item.to)
  if (item.requiresAdmin) return account.role === 'admin'
  return true
}

function shouldShowNavItem(item: NavItem, account: { role?: string } | null): boolean {
  if (item.requiresAdmin) return account?.role === 'admin'
  return true
}

function NavItemLink({
  item,
  onNavigate,
  disabled,
}: {
  item: NavItem
  onNavigate?: () => void
  disabled?: boolean
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        title={item.requiresAdmin ? 'Admin access required' : 'Sign in to access'}
        className="block cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-600"
      >
        {item.label}
      </span>
    )
  }
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          'block rounded-lg px-3 py-2 text-sm font-medium transition',
          isActive
            ? 'bg-default-200 text-foreground'
            : 'text-foreground/80 hover:bg-default-100 hover:text-foreground',
        ].join(' ')
      }
    >
      {item.label}
    </NavLink>
  )
}

export function AppShell({ children }: PropsWithChildren) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { account, logout } = useAccountStore()

  const isHome = location.pathname === '/'
  const headerTitle = useMemo(() => {
    if (location.pathname === '/') {
      return 'Open Volunteer Federation'
    }
    const datasetTitle = datasetPageTitles[location.pathname]
    if (datasetTitle) {
      return datasetTitle
    }
    return navItems.find((n) => n.to === location.pathname)?.label ?? 'Open Volunteer Federation'
  }, [location.pathname])

  const accountAvatar = account ? (
    <button
      type="button"
      onClick={() => navigate('/account')}
      aria-label="Open account"
      className="inline-flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/60"
    >
      <Avatar className="h-8 w-8">
        {account.pictureUrl ? <Avatar.Image src={account.pictureUrl} alt="" /> : null}
        <Avatar.Fallback>{(account.name ?? account.email ?? 'U').slice(0, 1).toUpperCase()}</Avatar.Fallback>
      </Avatar>
    </button>
  ) : null

  return (
    <div className="h-full bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="flex h-full">
        <aside className="hidden w-48 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:block">
          <div className="mb-4 flex items-center gap-2">
            <NavLink
              to="/"
              className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 dark:focus-visible:ring-slate-500/60"
              aria-label="Open Volunteer Federation home"
            >
              <BrandLogo className="h-9 w-9" />
            </NavLink>
            <div className="min-w-0 whitespace-normal break-words text-sm font-semibold leading-snug tracking-wide">
              Open Volunteer Federation
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems
              .filter((item) => shouldShowNavItem(item, account))
              .map((item) => (
                <NavItemLink key={item.to} item={item} disabled={!isNavItemAccessible(item, account)} />
              ))}
          </nav>
          <Separator className="my-4" />
          {account ? (
            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">Signed in</div>
                <div className="truncate text-sm">{account.email}</div>
              </div>
              <Button size="sm" variant="secondary" onPress={logout} className="self-start">
                Log out
              </Button>
            </div>
          ) : (
            <div className="flex w-full justify-center">
              <GoogleLoginButton presentation="standard" />
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950 md:px-8">
            {isHome ? (
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:text-slate-50 dark:hover:text-slate-200 dark:focus:ring-slate-500/60 md:hidden"
                    aria-label="Open menu"
                  >
                    <IconHamburger title="Menu" className="h-6 w-6" />
                  </button>
                  <h1 className="min-w-0 flex-1 truncate">{headerTitle}</h1>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {account ? (
                    <>
                      <ThemeToggle />
                      {accountAvatar}
                    </>
                  ) : isHome ? null : (
                    <GoogleLoginButton />
                  )}
                  {account ? null : <ThemeToggle />}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:text-slate-50 dark:hover:text-slate-200 dark:focus:ring-slate-500/60 md:hidden"
                    aria-label="Open menu"
                  >
                    <IconHamburger title="Menu" className="h-6 w-6" />
                  </button>
                  <NavLink
                    to="/"
                    className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 md:hidden dark:focus-visible:ring-slate-500/60"
                    aria-label="Open Volunteer Federation home"
                  >
                    <BrandLogo className="h-8 w-8" />
                  </NavLink>
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <button
                      type="button"
                      aria-label="Back"
                      className="inline-flex shrink-0 items-center justify-center rounded-md p-1 text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:text-slate-50 dark:hover:text-slate-200 dark:focus:ring-slate-500/60"
                      onClick={() => {
                        if (window.history.length > 1) navigate(-1)
                        else navigate('/', { replace: true })
                      }}
                    >
                      <IconChevronLeft className="h-10 w-10 md:h-12 md:w-12" />
                    </button>
                    <h1 className="min-w-0 flex-1 truncate">{headerTitle}</h1>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {account ? (
                    <>
                      <ThemeToggle />
                      {accountAvatar}
                    </>
                  ) : (
                    <GoogleLoginButton />
                  )}
                  {account ? null : <ThemeToggle />}
                </div>
              </div>
            )}
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 md:px-8">
            <div className="mx-auto w-full max-w-5xl">{children}</div>
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-56 max-w-[85vw] bg-white p-4 shadow-xl dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <BrandLogo className="h-8 w-8 shrink-0" />
                <div className="min-w-0 whitespace-normal break-words text-sm font-semibold leading-snug">
                  Open Volunteer Federation
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center rounded-md p-2 text-slate-900 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:text-slate-50 dark:hover:text-slate-200 dark:focus:ring-slate-500/60"
              >
                <IconX title="Close" className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {navItems
                .filter((item) => shouldShowNavItem(item, account))
                .map((item) => (
                  <NavItemLink
                    key={item.to}
                    item={item}
                    onNavigate={() => setMobileOpen(false)}
                    disabled={!isNavItemAccessible(item, account)}
                  />
                ))}
            </nav>
            <Separator className="my-4" />
            {account ? (
              <div className="flex flex-col gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">Signed in</div>
                  <div className="truncate text-sm">{account.email}</div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="self-start"
                  onPress={() => {
                    logout()
                    setMobileOpen(false)
                  }}
                >
                  Log out
                </Button>
              </div>
            ) : (
              <div className="flex w-full justify-center">
                <GoogleLoginButton
                  presentation="standard"
                  onLoggedIn={() => {
                    setMobileOpen(false)
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

