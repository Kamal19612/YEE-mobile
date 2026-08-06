import { useEffect, useMemo, useState } from 'react'
import { globalSearch } from '../api/search'

export const SEARCH_TABS = [
  { id: 'all', labelKey: 'search.tabs.all' },
  { id: 'activity', labelKey: 'search.tabs.stories' },
  { id: 'members', labelKey: 'search.tabs.members' },
  { id: 'groups', labelKey: 'search.tabs.cohorts' },
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
        const data = await globalSearch(query)
        if (alive) setResults({ resources: [], ...data })
      } catch (err) {
        if (alive) {
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
      activity: results.activity.length,
    }),
    [results],
  )

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return { results, counts, total, loading }
}
