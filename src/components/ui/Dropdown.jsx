import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLayout } from '../../context/LayoutProvider'

export function Dropdown({
  id,
  trigger,
  children,
  align = 'right',
  className,
  panelClassName,
  width = 'w-[360px]',
}) {
  const { openDropdown, toggleDropdown, closeDropdowns } = useLayout()
  const open = openDropdown === id
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) closeDropdowns()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, closeDropdowns])

  return (
    <div
      ref={ref}
      className={clsx('notification-wrap relative menu-item-has-children', open && 'selected', className)}
    >
      <button
        type="button"
        className="notification-link relative flex items-center justify-center text-bb-header-link hover:text-bb-header-link-hover"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => toggleDropdown(id)}
      >
        {trigger}
      </button>

      {open && (
        <section
          className={clsx(
            'notification-dropdown absolute top-[calc(100%+10px)] z-dropdown overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-dropdown',
            width,
            align === 'right' ? 'right-0' : 'left-0',
            panelClassName,
          )}
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
