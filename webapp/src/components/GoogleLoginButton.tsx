import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useEffect, useState } from 'react'
import { useAccountStore, type Account } from '../stores/accountStore'

export type GoogleLoginButtonProps = {
  /** Compact icon for the shell header, or full-width branded button on the welcome screen. */
  presentation?: 'icon' | 'standard'
  onLoggedIn?: (account: Account) => void
}

export function GoogleLoginButton({ presentation = 'icon', onLoggedIn }: GoogleLoginButtonProps) {
  const setAccount = useAccountStore((s) => s.setAccount)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const onSuccess = async (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential
    if (!idToken) return
    try {
      const res = await fetch('/api/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      if (!res.ok)
        return
      const data = (await res.json()) as { login?: Account }
      const login = data.login
      if (!login?.uid || !login.bearerToken)
        return
      setAccount(login)
      onLoggedIn?.(login)
    } catch {
      // keep UI minimal; errors can be surfaced with toast later
    }
  }

  if (presentation === 'standard') {
    return (
      <GoogleLogin
        type="standard"
        shape="rectangular"
        size="large"
        text="continue_with"
        theme={isDark ? 'filled_black' : 'outline'}
        onSuccess={onSuccess}
        onError={() => {
          // keep UI minimal; errors can be surfaced with toast later
        }}
      />
    )
  }

  return (
    <GoogleLogin
      useOneTap
      type="icon"
      shape="square"
      size="medium"
      theme={isDark ? 'filled_black' : 'outline'}
      onSuccess={onSuccess}
      onError={() => {
        // keep UI minimal; errors can be surfaced with toast later
      }}
    />
  )
}
