import clsx from 'clsx'

const variants = {
  primary:
    'bg-[var(--bb-primary-button-background-regular)] text-[var(--bb-primary-button-text-regular)] border-[var(--bb-primary-button-border-regular)] hover:bg-[var(--bb-primary-button-background-hover)] hover:border-[var(--bb-primary-button-border-hover)]',
  secondary:
    'bg-[var(--bb-secondary-button-background-regular)] text-[var(--bb-secondary-button-text-regular)] border-[var(--bb-secondary-button-border-regular)] hover:bg-[var(--bb-secondary-button-background-hover)] hover:text-[var(--bb-secondary-button-text-hover)] hover:border-[var(--bb-secondary-button-border-hover)]',
  outline:
    'bg-transparent text-bb-heading border-bb-border hover:border-bb-primary hover:text-bb-primary',
  link: 'border-transparent bg-transparent text-bb-header-link hover:text-bb-header-link-hover px-0',
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
        'inline-flex items-center justify-center gap-2 rounded-bb-btn border font-medium transition-colors duration-150',
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
