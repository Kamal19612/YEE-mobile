import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/ui/Avatar'
import { IconAngleDown } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { currentUser, profileMenuItems } from '../data/demoData'
import { useEffect, useRef } from 'react'

export function HeaderProfileMenu({
  user = currentUser,
  items = profileMenuItems,
  mode = 'name_and_avatar',
}) {
  const { openDropdown, toggleDropdown, closeDropdowns } = useLayout()
  const open = openDropdown === 'profile'
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
      className={clsx('user-wrap user-wrap-container menu-item-has-children relative', open && 'selected')}
    >
      <button
        type="button"
        className="user-link flex items-center gap-2 text-bb-header-link"
        aria-expanded={open}
        onClick={() => toggleDropdown('profile')}
      >
        {mode === 'name_and_avatar' && (
          <>
            <span className="user-name hidden text-bb-sm font-medium bb:inline">{user.displayName}</span>
            <IconAngleDown className="hidden bb:block" />
          </>
        )}
        <Avatar name={user.displayName} src={user.avatar} size="md" />
      </button>

      {open && (
        <div className="sub-menu absolute right-0 top-[calc(100%+10px)] z-dropdown w-64 overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-dropdown">
          <div className="wrapper">
            <ul className="sub-menu-inner m-0 list-none p-0">
              <li className="border-b border-bb-border px-4 py-3">
                <Link
                  to={`/members/${user.id}`}
                  className="user-link flex items-center gap-3"
                  onClick={closeDropdowns}
                >
                  <Avatar name={user.displayName} src={user.avatar} size="lg" />
                  <span>
                    <span className="user-name block font-semibold text-bb-heading">{user.displayName}</span>
                    <span className="user-mention text-bb-sm text-bb-muted">@{user.mentionName}</span>
                  </span>
                </Link>
              </li>
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    onClick={closeDropdowns}
                    className="block px-4 py-2.5 text-bb-sm text-bb-heading hover:bg-bb-alt hover:text-bb-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
