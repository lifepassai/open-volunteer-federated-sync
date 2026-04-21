import { jwtDecode } from 'jwt-decode'

type GoogleIdJwtPayload = {
  exp?: number
}

/** Google ID tokens are short-lived (~1h). Persisted tokens often need refresh. */
export function isGoogleIdTokenExpired(idToken: string, skewSeconds = 60): boolean {
  try {
    const { exp } = jwtDecode<GoogleIdJwtPayload>(idToken)
    if (typeof exp !== 'number') return true
    const nowSec = Date.now() / 1000
    return exp - skewSeconds <= nowSec
  } catch {
    return true
  }
}
