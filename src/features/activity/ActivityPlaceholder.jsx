export function ActivityPlaceholder() {
  return (
    <div className="bb-activity-placeholder mb-5 overflow-hidden rounded-bb border border-bb-border bg-bb-content p-[15px]">
      <div className="bb-activity-placeholder_head mb-4 flex gap-3">
        <div className="bb-activity-placeholder_avatar h-12 w-12 animate-pulse rounded-full bg-bb-alt" />
        <div className="bb-activity-placeholder_details flex-1 space-y-2 pt-1">
          <div className="bb-activity-placeholder_title h-3 w-1/3 animate-pulse rounded bg-bb-alt" />
          <div className="bb-activity-placeholder_description h-3 w-1/4 animate-pulse rounded bg-bb-alt" />
        </div>
      </div>
      <div className="bb-activity-placeholder_content mb-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-bb-alt" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-bb-alt" />
      </div>
      <div className="bb-activity-placeholder_actions flex gap-6">
        <div className="h-3 w-16 animate-pulse rounded bg-bb-alt" />
        <div className="h-3 w-16 animate-pulse rounded bg-bb-alt" />
        <div className="h-3 w-16 animate-pulse rounded bg-bb-alt" />
      </div>
    </div>
  )
}
