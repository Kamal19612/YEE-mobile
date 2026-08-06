/** Filtres annuaire + options de création — App API Groups */

export const groupTypeFilters = [
  { id: 'all', labelKey: 'groups.type.all' },
  { id: 'mine', labelKey: 'groups.type.mine' },
]

export const groupVisibilityOptions = [
  {
    id: 'public',
    labelKey: 'groups.visibility.public',
    hintKey: 'groups.visibility.publicHint',
  },
  {
    id: 'private',
    labelKey: 'groups.visibility.private',
    hintKey: 'groups.visibility.privateHint',
  },
  {
    id: 'secret',
    labelKey: 'groups.visibility.secret',
    hintKey: 'groups.visibility.secretHint',
  },
]

export const groupRoleOptions = [
  { id: 'member', labelKey: 'groups.roles.member' },
  { id: 'moderator', labelKey: 'groups.roles.moderator' },
  { id: 'admin', labelKey: 'groups.roles.admin' },
]
