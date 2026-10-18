import clsx from 'clsx'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '../components/ui/Avatar'
import { IconAngleDown } from '../components/icons'
import { useLayout } from '../context/LayoutProvider'
import { useAuth } from '../hooks/useAuth'
import { profileMenuDefs } from '../data/layoutData'
import { useEffect, useMemo, useRef } from 'react'

export function HeaderProfileMenu({ mode = 'name_and_avatar' }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const { openDropdown, toggleDropdown, closeDropdowns } = useLayout()
  const open = openDropdown === 'profile'
  const ref = useRef(null)

  const menuUser = user || {
    id: 0,
    displayName: t('auth.signin'),
    mentionName: 'guest',
    avatar: null,
  }

  const items = useMemo(() => {
    if (!user?.id) return []
    return profileMenuDefs
      .filter((item) => !item.adminOnly || user.isSiteAdmin)
      .map((item) => {
        if (item.id === 'logout' || item.adminOnly) return item
        const href = item.href.replace(/\/members\/(?:me|\d+)/, `/members/${user.id}`)
        return { ...item, href }
      })
  }, [user?.id, user?.isSiteAdmin])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) closeDropdowns()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, closeDropdowns])

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="rounded-bb-btn bg-bb-primary px-3 py-2 text-bb-sm font-medium text-white hover:opacity-90"
      >
        {t('auth.signin')}
      </Link>
    )
  }

  const go = (href, e) => {
    e?.preventDefault()
    closeDropdowns()
    navigate(href)
  }

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
        aria-haspopup="true"
        onClick={(e) => {
          e.stopPropagation()
          toggleDropdown('profile')
        }}
      >
        {mode === 'name_and_avatar' && (
          <>
            <span className="user-name hidden text-bb-sm font-medium lg:inline">{menuUser.displayName}</span>
            <IconAngleDown className="hidden lg:block" />
          </>
        )}
        <Avatar name={menuUser.displayName} src={menuUser.avatar} size="md" />
      </button>

      {open && (
        <div
          className={clsx(
            'sub-menu z-dropdown overflow-hidden rounded-bb border border-bb-border bg-bb-content shadow-dropdown',
            'fixed inset-x-2.5 top-[calc(var(--bb-header-height)+8px)] w-auto',
            'bb:inset-x-auto bb:right-4 bb:w-64',
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="wrapper">
            <ul className="sub-menu-inner m-0 list-none p-0">
              <li className="border-b border-bb-border px-4 py-3">
                <button
                  type="button"
                  className="user-link flex w-full items-center gap-3 text-left"
                  onClick={(e) => go(`/members/${menuUser.id}`, e)}
                >
                  <Avatar name={menuUser.displayName} src={menuUser.avatar} size="lg" />
                  <span>
                    <span className="user-name block font-semibold text-bb-heading">{menuUser.displayName}</span>
                    <span className="user-mention text-bb-sm text-bb-muted">@{menuUser.mentionName}</span>
                  </span>
                </button>
              </li>
              {items.map((item) => (
                <li key={item.id}>
                  {item.id === 'logout' ? (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdowns()
                        logout({ redirect: true })
                      }}
                      className="block w-full px-4 py-3 text-left text-bb-sm text-bb-heading hover:bg-bb-alt hover:text-bb-primary"
                    >
                      {t(item.labelKey)}
                    </button>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={closeDropdowns}
                      className="block px-4 py-3 text-bb-sm text-bb-heading hover:bg-bb-alt hover:text-bb-primary"
                    >
                      {t(item.labelKey)}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
