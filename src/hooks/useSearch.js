import { useEffect, useMemo, useState } from 'react'
import { globalSearch } from '../api/search'
import { USE_MOCK } from '../config/api'
import { demoActivities, PUBLICATION_STATUS } from '../data/activityData'
import { demoForums, demoTopics } from '../data/forumsData'
import { demoGroups } from '../data/groupsData'
import { demoMembers } from '../data/membersData'
import { demoResources } from '../data/resourcesData'
import { stripHtml } from '../features/activity/utils'

function mockSearch(query, filters = {}) {
  const q = query.trim().toLowerCase()
  const { country = '', language = '', thematic = '' } = filters

  const matchMember = (m) => {
    if (country && m.country !== country) return false
    if (language && m.language !== language) return false
    if (thematic && m.thematic !== thematic) return false
    if (!q) return Boolean(country || language || thematic)
    return (
      m.displayName.toLowerCase().includes(q) ||
      m.mentionName.toLowerCase().includes(q) ||
      (m.bio || '').toLowerCase().includes(q) ||
      (m.country || '').toLowerCase().includes(q) ||
      (m.thematic || '').toLowerCase().includes(q)
    )
  }

  const matchStory = (a) => {
    if (a.status !== PUBLICATION_STATUS.PUBLISHED) return false
    if (country && a.tags?.country !== country) return false
    if (language && a.tags?.language !== language) return false
    if (thematic && a.tags?.thematic !== thematic) return false
    if (!q) return Boolean(country || language || thematic)
    const hay = [a.title, stripHtml(a.content), a.tags?.country, a.tags?.thematic]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  }

  if (!q && !country && !language && !thematic) {
    return { members: [], groups: [], forums: [], topics: [], resources: [], activity: [] }
  }

  return {
    members: demoMembers.filter(matchMember),
    groups: demoGroups.filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        (g.region || '').toLowerCase().includes(q),
    ),
    forums: demoForums.filter(
      (f) => !q || f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    ),
    topics: demoTopics.filter(
      (t) => !q || t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q),
    ),
    resources: demoResources.filter((r) => {
      if (language && r.language !== language) return false
      if (thematic && r.thematic !== thematic) return false
      if (!q) return Boolean(language || thematic)
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.thematic.toLowerCase().includes(q)
      )
    }),
    activity: demoActivities.filter(matchStory),
  }
}

export const SEARCH_TABS = [
  { id: 'all', labelKey: 'search.tabs.all' },
  { id: 'activity', labelKey: 'search.tabs.stories' },
  { id: 'members', labelKey: 'search.tabs.members' },
  { id: 'groups', labelKey: 'search.tabs.cohorts' },
  { id: 'forums', labelKey: 'search.tabs.forums' },
  { id: 'topics', labelKey: 'search.tabs.topics' },
  { id: 'resources', labelKey: 'search.tabs.resources' },
]

export function useSearch(query, filters = {}) {
  const [results, setResults] = useState({
    members: [],
    groups: [],
    forums: [],
    topics: [],
    resources: [],
    activity: [],
  })
  const [loading, setLoading] = useState(false)
  const filterKey = `${filters.country}|${filters.language}|${filters.thematic}`

  useEffect(() => {
    let alive = true
    async function run() {
      if (!query.trim() && !filters.country && !filters.language && !filters.thematic) {
        setResults({
          members: [],
          groups: [],
          forums: [],
          topics: [],
          resources: [],
          activity: [],
        })
        return
      }
      setLoading(true)
      try {
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 250))
          if (alive) setResults(mockSearch(query, filters))
        } else {
          const data = await globalSearch(query)
          if (alive) setResults({ resources: [], ...data })
        }
      } catch (err) {
        if (USE_MOCK && alive) setResults(mockSearch(query, filters))
        else if (alive) {
          setResults({
            members: [],
            groups: [],
            forums: [],
            topics: [],
            resources: [],
            activity: [],
          })
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [query, filterKey])

  const counts = useMemo(
    () => ({
      members: results.members.length,
      groups: results.groups.length,
      forums: results.forums.length,
      topics: results.topics.length,
      resources: results.resources.length,
      activity: results.activity.length,
    }),
    [results],
  )

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return { results, counts, total, loading }
}
