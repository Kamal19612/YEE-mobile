import clsx from 'clsx'

const sizes = {
  xs: 'h-6 w-6 text-[0.65rem]',
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
        className={clsx(
          'rounded-full object-cover ring-2 ring-white/80 shadow-[0_2px_8px_rgba(18,26,43,0.08)]',
          sizes[size],
          className,
        )}
      />
    )
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#e4ebff] to-[#f7efd9] text-bb-sm font-semibold text-bb-heading ring-2 ring-white/80',
        sizes[size],
        className,
      )}
      aria-label={alt || name}
    >
      {initials}
    </span>
  )
}
