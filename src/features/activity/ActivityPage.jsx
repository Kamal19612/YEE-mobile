import { useTranslation } from 'react-i18next'
import { ActivityFeed } from './ActivityFeed'

/** Page fil de récits — buddypress/activity/index.php adapté AfrEA-YEE */
export function ActivityPage() {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col gap-6 bb:flex-row">
      <main id="primary" className="content-area min-w-0 flex-1">
        <ActivityFeed />
      </main>

      <aside className="widget-area hidden w-[280px] shrink-0 space-y-4 bb:block">
        <section className="bb-card p-4">
          <h3 className="m-0 mb-3 text-bb-sm font-semibold uppercase tracking-wide text-bb-heading">
            {t('stories.sidebar.community')}
          </h3>
          <ul className="m-0 list-none space-y-2 p-0 text-bb-sm text-bb-text">
            <li className="flex justify-between">
              <span>{t('stories.sidebar.members')}</span>
              <strong className="text-bb-heading">248</strong>
            </li>
            <li className="flex justify-between">
              <span>{t('stories.sidebar.cohorts')}</span>
              <strong className="text-bb-heading">12</strong>
            </li>
            <li className="flex justify-between">
              <span>{t('stories.sidebar.online')}</span>
              <strong className="text-bb-heading">31</strong>
            </li>
          </ul>
        </section>
        <section className="bb-card p-4">
          <h3 className="m-0 mb-2 text-bb-sm font-semibold uppercase tracking-wide text-bb-heading">
            {t('stories.sidebar.tips')}
          </h3>
          <p className="m-0 text-bb-sm text-bb-text">{t('stories.sidebar.tipsBody')}</p>
        </section>
      </aside>
    </div>
  )
}
