import { ActivityFeed } from './ActivityFeed'

/** Page directory activité — buddypress/activity/index.php */
export function ActivityPage() {
  return (
    <div className="flex w-full flex-col gap-6 bb:flex-row">
      <main id="primary" className="content-area min-w-0 flex-1">
        <ActivityFeed />
      </main>

      <aside className="widget-area hidden w-[280px] shrink-0 space-y-4 bb:block">
        <section className="bb-card p-4">
          <h3 className="m-0 mb-3 text-bb-sm font-semibold uppercase tracking-wide text-bb-heading">
            Community
          </h3>
          <ul className="m-0 list-none space-y-2 p-0 text-bb-sm text-bb-text">
            <li className="flex justify-between">
              <span>Members</span>
              <strong className="text-bb-heading">1,248</strong>
            </li>
            <li className="flex justify-between">
              <span>Groups</span>
              <strong className="text-bb-heading">86</strong>
            </li>
            <li className="flex justify-between">
              <span>Online</span>
              <strong className="text-bb-heading">42</strong>
            </li>
          </ul>
        </section>
        <section className="bb-card p-4">
          <h3 className="m-0 mb-2 text-bb-sm font-semibold uppercase tracking-wide text-bb-heading">
            Tips
          </h3>
          <p className="m-0 text-bb-sm text-bb-text">
            Use the composer to post updates, attach photos, or create polls. Filter the feed with the
            tabs above.
          </p>
        </section>
      </aside>
    </div>
  )
}
