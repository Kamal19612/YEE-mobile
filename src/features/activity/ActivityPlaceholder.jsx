export function ActivityPlaceholder() {
  return (
    <div className="bb-activity-placeholder mb-2 overflow-hidden rounded-bb border border-bb-border bg-bb-content">
      <div className="bb-activity-placeholder_head flex gap-3 px-4 pt-3 pb-2">
        <div className="bb-activity-placeholder_avatar h-12 w-12 animate-pulse rounded-full bg-bb-alt" />
        <div className="bb-activity-placeholder_details flex-1 space-y-2 pt-1">
          <div className="bb-activity-placeholder_title h-3 w-1/3 animate-pulse rounded bg-bb-alt" />
          <div className="bb-activity-placeholder_description h-2.5 w-1/2 animate-pulse rounded bg-bb-alt" />
          <div className="h-2.5 w-1/5 animate-pulse rounded bg-bb-alt" />
        </div>
      </div>
      <div className="bb-activity-placeholder_content space-y-2 px-4 pb-3">
        <div className="h-3 w-full animate-pulse rounded bg-bb-alt" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-bb-alt" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-bb-alt" />
      </div>
      <div className="h-40 animate-pulse bg-bb-alt" />
      <div className="bb-activity-placeholder_actions flex gap-6 border-t border-bb-border px-4 py-3">
        <div className="h-3 w-10 animate-pulse rounded bg-bb-alt" />
        <div className="h-3 w-10 animate-pulse rounded bg-bb-alt" />
        <div className="h-3 w-10 animate-pulse rounded bg-bb-alt" />
      </div>
    </div>
  )
}
