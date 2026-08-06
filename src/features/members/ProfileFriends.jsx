import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchFollowers, fetchFollowing } from '../../api/users'
import { Avatar } from '../../components/ui/Avatar'

/**
 * Liste followers / following (follow asymétrique App API).
 * Remplace l’ancien onglet “Friends” basé sur des données mock / BP.
 */
export function ProfileFriends({ member }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('followers')
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    async function run() {
      if (!member?.id) return
      setLoading(true)
      setError(null)
      try {
        const [f1, f2] = await Promise.all([
          fetchFollowers(member.id, { page: 1, perPage: 50 }),
          fetchFollowing(member.id, { page: 1, perPage: 50 }),
        ])
        if (alive) {
          setFollowers(f1)
          setFollowing(f2)
        }
      } catch (err) {
        if (alive) setError(err.message || t('members.followListError'))
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [member?.id, t])

  const list = tab === 'followers' ? followers : following

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === 'followers'} onClick={() => setTab('followers')}>
          {t('members.followers')} ({followers.length})
        </TabButton>
        <TabButton active={tab === 'following'} onClick={() => setTab('following')}>
          {t('members.following')} ({following.length})
        </TabButton>
      </div>

      {loading && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">{t('members.loadingFollows')}</div>
      )}
      {!loading && error && (
        <div className="bb-card p-4 text-bb-sm text-bb-danger" role="alert">
          {error}
        </div>
      )}
      {!loading && !error && list.length === 0 && (
        <div className="bb-card p-8 text-center text-bb-sm text-bb-muted">
          {tab === 'followers' ? t('members.noFollowers') : t('members.noFollowing')}
        </div>
      )}
      {!loading && !error && list.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((person) => (
            <li key={person.id} className="bb-card flex items-center gap-3 p-4">
              <Link to={`/members/${person.id}`}>
                <Avatar name={person.displayName} src={person.avatar} size="lg" />
              </Link>
              <div className="min-w-0">
                <Link
                  to={`/members/${person.id}`}
                  className="block truncate font-medium text-bb-heading hover:text-bb-primary"
                >
                  {person.displayName}
                </Link>
                <div className="text-bb-sm text-bb-muted">@{person.mentionName}</div>
                {person.profession && (
                  <div className="truncate text-bb-xs text-bb-muted">{person.profession}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-bb-inner px-3 py-2 text-bb-sm font-medium ${
        active ? 'bg-bb-primary text-white' : 'bg-bb-alt text-bb-text'
      }`}
    >
      {children}
    </button>
  )
}
