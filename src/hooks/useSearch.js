import { useEffect, useMemo, useState } from 'react'
import { globalSearch } from '../api/search'
import { demoActivities } from '../data/activityData'
import { demoForums, demoTopics } from '../data/forumsData'
import { demoGroups } from '../data/groupsData'
import { demoMembers } from '../data/membersData'
import { stripHtml } from '../features/activity/utils'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

function mockSearch(query) {
  const q = query.trim().toLowerCase()
  if (!q) {
    return { members: [], groups: [], forums: [], topics: [], posts: [], activity: [] }
  }

  return {
    members: demoMembers.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) ||
        m.mentionName.toLowerCase().includes(q) ||
        m.bio.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q),
    ),
    groups: demoGroups.filter(
      (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q),
    ),
    forums: demoForums.filter(
      (f) => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    ),
    topics: demoTopics.filter(
      (t) => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q),
    ),
    posts: [],
    activity: demoActivities.filter((a) => stripHtml(a.content).toLowerCase().includes(q)),
  }
}

export const SEARCH_TABS = [
  { id: 'all', label: 'All' },
  { id: 'members', label: 'Members' },
  { id: 'groups', label: 'Groups' },
  { id: 'forums', label: 'Forums' },
  { id: 'topics', label: 'Discussions' },
  { id: 'activity', label: 'Activity' },
]

export function useSearch(query) {
  const [results, setResults] = useState({
    members: [],
    groups: [],
    forums: [],
    topics: [],
    posts: [],
    activity: [],
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    async function run() {
      if (!query.trim()) {
        setResults({ members: [], groups: [], forums: [], topics: [], posts: [], activity: [] })
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 300))
          if (alive) setResults(mockSearch(query))
        } else {
          const data = await globalSearch(query)
          if (alive) setResults({ posts: [], activity: [], ...data })
        }
      } catch {
        if (alive) setResults(mockSearch(query))
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [query])

  const counts = useMemo(
    () => ({
      members: results.members.length,
      groups: results.groups.length,
      forums: results.forums.length,
      topics: results.topics.length,
      activity: results.activity.length,
      posts: results.posts.length,
    }),
    [results],
  )

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return { results, counts, total, loading }
}
