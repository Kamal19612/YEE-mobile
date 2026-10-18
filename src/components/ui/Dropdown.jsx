import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLayout } from '../../context/LayoutProvider'

/**
 * Dropdown header — position fixed pour éviter le clip par overflow des ancêtres.
 */
export function Dropdown({
  id,
  trigger,
  children,
  align = 'right',
  className,
  panelClassName,
  width = 'bb:w-[360px]',
}) {
  const { openDropdown, toggleDropdown, closeDropdowns } = useLayout()
  const open = openDropdown === id
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) closeDropdowns()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, closeDropdowns])

  return (
    <div
      ref={ref}
      className={clsx('notification-wrap relative menu-item-has-children', open && 'selected', className)}
    >
      <button
        type="button"
        className="notification-link relative flex h-11 w-11 items-center justify-center text-bb-header-link touch-manipulation hover:text-bb-header-link-hover"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={(e) => {
          e.stopPropagation()
          toggleDropdown(id)
        }}
      >
        {trigger}
      </button>

      {open && (
        <section
          className={clsx(
            'notification-dropdown z-dropdown overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-dropdown',
            'fixed inset-x-2.5 top-[calc(var(--bb-header-height)+8px)] w-auto max-h-[min(72dvh,520px)] overflow-y-auto',
            'bb:inset-x-auto bb:top-[calc(var(--bb-header-height)+8px)] bb:max-h-[min(70dvh,480px)]',
            width,
            align === 'right' ? 'bb:right-4' : 'bb:left-4',
            panelClassName,
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {children}
        </section>
      )}
    </div>
  )
}

export function DropdownHeader({ title, action }) {
  return (
    <header className="notification-header flex items-center justify-between border-b border-bb-border px-4 py-3">
      <h2 className="title m-0 text-bb-md font-semibold text-bb-heading">{title}</h2>
      {action}
    </header>
  )
}

export function DropdownFooter({ href = '#', children, onClick }) {
  return (
    <footer className="notification-footer border-t border-bb-border">
      <Link
        to={href}
        onClick={onClick}
        className="delete-all flex items-center justify-center gap-1 px-4 py-3 text-bb-sm font-medium text-bb-primary hover:underline"
      >
        {children}
      </Link>
    </footer>
  )
}
