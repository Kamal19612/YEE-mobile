/** Activity / news filter constants — AfrEA-YEE actualités */

export const STORY_COUNTRIES = [
  'Bénin',
  'Burkina Faso',
  'Cameroun',
  'Côte d’Ivoire',
  'Ghana',
  'Kenya',
  'Maroc',
  'Nigeria',
  'Rwanda',
  'Sénégal',
  'Afrique du Sud',
  'Ouganda',
]

export const STORY_THEMATICS = [
  'Genre & Équité',
  'Évaluation participative',
  'Climat & Environnement',
  'Santé publique',
  'Éducation',
  'Gouvernance',
  'Jeunesse & Emploi',
  'Méthodes mixtes',
]

export const STORY_LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' },
  { code: 'sw', label: 'Kiswahili' },
]

export const PUBLICATION_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
}

export const activityFilters = [
  { id: 'all', labelKey: 'stories.filters.all' },
  { id: 'just-me', labelKey: 'stories.filters.mine' },
  { id: 'pending', labelKey: 'stories.filters.pending' },
  { id: 'favorites', labelKey: 'stories.filters.likes' },
  { id: 'groups', labelKey: 'stories.filters.cohorts' },
]
