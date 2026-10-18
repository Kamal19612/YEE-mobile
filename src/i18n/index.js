import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'

const savedLng =
  typeof window !== 'undefined' ? localStorage.getItem('afrea-lng') : null

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: savedLng || 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('afrea-lng', lng)
    document.documentElement.lang = lng
  }
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language
}

export default i18n
