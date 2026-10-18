import clsx from 'clsx'

export function Badge({ count, className, max = 99 }) {
  if (!count || count < 1) return null
  const label = count > max ? `${max}+` : String(count)

  return (
    <span
      className={clsx(
        'count absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-bb-danger px-1 text-[10px] font-semibold leading-[18px] text-white',
        className,
      )}
    >
      {label}
    </span>
  )
}
