import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../components/ui/Avatar'
import { IconAngleDown } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { currentUser, profileMenuDefs } from '../data/demoData'
import { useEffect, useRef } from 'react'

export function HeaderProfileMenu({
  user = currentUser,
  items = profileMenuDefs,
  mode = 'name_and_avatar',
}) {
  const { t } = useTranslation()
  const { openDropdown, toggleDropdown, closeDropdowns } = useLayout()
  const open = openDropdown === 'profile'
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
      className={clsx('user-wrap user-wrap-container menu-item-has-children relative', open && 'selected')}
    >
      <button
        type="button"
        className={clsx(
          'user-link flex items-center gap-2 text-bb-header-link',
          mode === 'avatar' ? 'h-10 w-10 justify-center' : 'rounded-bb-inner py-1 pl-1 pr-2 hover:bg-bb-alt',
        )}
        aria-expanded={open}
        onClick={() => toggleDropdown('profile')}
      >
        {mode === 'name_and_avatar' && (
          <>
            <span className="user-name hidden text-bb-sm font-medium lg:inline">{user.displayName}</span>
            <IconAngleDown className="hidden lg:block" />
          </>
        )}
        <Avatar name={user.displayName} src={user.avatar} size="md" />
      </button>

      {open && (
        <div
          className={clsx(
            'sub-menu z-dropdown overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-dropdown',
            'fixed inset-x-2.5 top-[calc(var(--bb-header-height)+8px)] w-auto',
            'bb:absolute bb:inset-x-auto bb:right-0 bb:top-[calc(100%+10px)] bb:w-64',
          )}
        >
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
                    className="block px-4 py-3 text-bb-sm text-bb-heading hover:bg-bb-alt hover:text-bb-primary"
                  >
                    {t(item.labelKey)}
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
