import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { navItemDefs } from '../data/layoutData'
import { IconEllipsis } from '../components/icons'

const PRIMARY_COUNT = 5

export function SiteNavigation({ items = navItemDefs }) {
  const { t } = useTranslation()
  const primary = items.slice(0, PRIMARY_COUNT)
  const more = items.slice(PRIMARY_COUNT)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)

  useEffect(() => {
    if (!moreOpen) return undefined
    const onPointer = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [moreOpen])

  return (
    <nav id="site-navigation" className="main-navigation hidden min-w-0 flex-1 bb:block" data-menu-space="120">
      <div id="primary-navbar" className="flex items-center gap-1 overflow-hidden">
        <ul id="primary-menu" className="primary-menu bb-primary-overflow m-0 flex list-none items-center gap-1 p-0">
          {primary.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  clsx(
                    'block rounded-bb-inner px-2.5 py-2 text-bb-sm font-medium transition-colors lg:px-3 lg:text-bb-base',
                    isActive
                      ? 'text-bb-primary'
                      : 'text-bb-header-link hover:text-bb-header-link-hover',
                  )
                }
              >
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>

        {more.length > 0 && (
          <div id="navbar-collapse" className="relative shrink-0" ref={moreRef}>
            <button
              type="button"
              className={clsx(
                'more-button flex h-10 w-10 items-center justify-center rounded-bb-inner text-bb-header-link hover:bg-bb-alt hover:text-bb-header-link-hover',
                moreOpen && 'bg-bb-alt text-bb-primary',
              )}
              aria-expanded={moreOpen}
              aria-haspopup="true"
              onClick={() => setMoreOpen((v) => !v)}
            >
              <IconEllipsis />
              <span className="screen-reader-text">{t('nav.more')}</span>
            </button>

            {moreOpen && (
              <ul className="absolute right-0 top-[calc(100%+8px)] z-dropdown m-0 min-w-[180px] list-none overflow-hidden rounded-bb border border-bb-border bg-bb-content p-0 shadow-dropdown">
                {more.map((item) => (
                  <li key={item.id}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        clsx(
                          'block px-4 py-2.5 text-bb-sm font-medium transition-colors hover:bg-bb-alt',
                          isActive ? 'text-bb-primary' : 'text-bb-heading hover:text-bb-primary',
                        )
                      }
                    >
                      {t(item.labelKey)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
