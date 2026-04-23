import type { ComponentPropsWithoutRef } from 'react'

type BrandLogoProps = Omit<ComponentPropsWithoutRef<'img'>, 'src' | 'alt'> & {
  'aria-label'?: string
}

export function BrandLogo({ className, 'aria-label': ariaLabel, ...props }: BrandLogoProps) {
  const decorative = ariaLabel == null || ariaLabel === ''
  return (
    <img
      src="/favicon.svg"
      alt={decorative ? '' : ariaLabel}
      aria-hidden={decorative ? true : undefined}
      className={className}
      draggable={false}
      {...props}
    />
  )
}
