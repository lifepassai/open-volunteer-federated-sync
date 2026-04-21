export function getRequiredEnv(name: string): string {
  const value = import.meta.env[name]
  if (typeof value === 'string' && value.length > 0) return value
  throw new Error(`Missing required env var: ${name}`)
}

