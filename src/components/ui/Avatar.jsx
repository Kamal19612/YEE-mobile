import clsx from 'clsx'

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
}

export function Avatar({ src, alt = '', name, size = 'md', className }) {
  const initials = (name || alt || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || ''}
        className={clsx('rounded-full object-cover', sizes[size], className)}
      />
    )
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-bb-alt text-bb-sm font-semibold text-bb-heading',
        sizes[size],
        className,
      )}
      aria-label={alt || name}
    >
      {initials}
    </span>
  )
}
