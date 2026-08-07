import clsx from 'clsx'

const variants = {
  primary:
    'bg-[var(--bb-primary-button-background-regular)] text-[var(--bb-primary-button-text-regular)] border-[var(--bb-primary-button-border-regular)] shadow-[0_6px_16px_rgba(0,102,163,0.22)] hover:bg-[var(--bb-primary-button-background-hover)] hover:border-[var(--bb-primary-button-border-hover)] hover:shadow-[0_8px_20px_rgba(0,102,163,0.28)] active:translate-y-px',
  secondary:
    'bg-[var(--bb-secondary-button-background-regular)] text-[var(--bb-secondary-button-text-regular)] border-[var(--bb-secondary-button-border-regular)] hover:bg-[var(--bb-secondary-button-background-hover)] hover:text-[var(--bb-secondary-button-text-hover)] hover:border-[var(--bb-secondary-button-border-hover)]',
  outline:
    'bg-transparent text-bb-heading border-bb-border hover:border-bb-primary hover:text-bb-primary',
  link: 'border-transparent bg-transparent text-bb-header-link hover:text-bb-header-link-hover px-0 shadow-none',
}

const sizes = {
  sm: 'px-3 py-1.5 text-bb-sm',
  md: 'px-4 py-2 text-bb-base',
  lg: 'px-5 py-2.5 text-bb-md',
}

export function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <Comp
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-bb-btn border font-semibold transition-all duration-150 ease-bb disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:active:translate-y-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  )
}
