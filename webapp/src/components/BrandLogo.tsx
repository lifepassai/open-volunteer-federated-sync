import type { SVGProps } from 'react'

/** Open Volunteer Federation — “O” circle nestled in a “V” (SVG). */
export function BrandLogo({ className, 'aria-label': ariaLabel, ...props }: SVGProps<SVGSVGElement>) {
  const decorative = ariaLabel == null || ariaLabel === ''
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : ariaLabel}
      role={decorative ? undefined : 'img'}
      {...props}
    >
      <rect width="40" height="40" rx="10" className="fill-slate-900 dark:fill-slate-100" />
      {/* Letter “V”: apex at bottom (∨). Circle sits in the cup above the point. */}
      <circle cx="20" cy="14" r="8.25" className="fill-sky-400 dark:fill-sky-500" />
      <path
        d="M8.5 10 L20 32 L31.5 10"
        className="stroke-slate-100 dark:stroke-slate-900"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
