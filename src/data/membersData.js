/** Member directory filter constants — AfrEA-YEE annuaire YEE */

export const MEMBER_REGIONS = [
  'Afrique de l’Ouest',
  'Afrique centrale',
  'Afrique de l’Est',
  'Afrique australe',
  'Afrique du Nord',
]

export const MEMBER_COUNTRIES = [
  'Bénin',
  'Cameroun',
  'Côte d’Ivoire',
  'Ghana',
  'Kenya',
  'Maroc',
  'Nigeria',
  'Rwanda',
  'Sénégal',
  'Afrique du Sud',
]

export const MEMBER_LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
]

export const MEMBER_THEMATICS = [
  'Genre & Équité',
  'Évaluation participative',
  'Climat & Environnement',
  'Santé publique',
  'Éducation',
  'Gouvernance',
  'Jeunesse & Emploi',
  'Méthodes mixtes',
]

export const memberSortOptions = [
  { id: 'alphabetical', labelKey: 'members.sort.alphabetical' },
  { id: 'newest', labelKey: 'members.sort.newest' },
  { id: 'active', labelKey: 'members.sort.active' },
]

export const memberTypeFilters = [
  { id: 'all', labelKey: 'members.type.all' },
  { id: 'friends', labelKey: 'members.type.peers' },
  { id: 'online', labelKey: 'members.type.online' },
]
