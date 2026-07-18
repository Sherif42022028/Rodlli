import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslation from '../../../public/locales/en/translation.json'
import arTranslation from '../../../public/locales/ar/translation.json'

const resources = {
  en: {
    translation: enTranslation,
  },
  ar: {
    translation: arTranslation,
  },
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  })
}

export default i18n
export { resources }
