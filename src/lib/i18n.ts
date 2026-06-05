import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '../locales/en.json'
import zh from '../locales/zh.json'
import vi from '../locales/vi.json'
import ar from '../locales/ar.json'
import yue from '../locales/yue.json'
import pa from '../locales/pa.json'
import el from '../locales/el.json'
import it from '../locales/it.json'
import hi from '../locales/hi.json'

const RTL_LANGS = new Set(['ar'])

function applyHtmlAttrs(lang: string) {
  document.documentElement.lang = lang
  document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr'
}

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      vi: { translation: vi },
      ar: { translation: ar },
      yue: { translation: yue },
      pa: { translation: pa },
      el: { translation: el },
      it: { translation: it },
      hi: { translation: hi },
    },
    supportedLngs: ['en', 'zh', 'vi', 'ar', 'yue', 'pa', 'el', 'it', 'hi'],
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'cleanmarket-lang',
      caches: ['localStorage'],
    },
  })

// Apply attrs immediately after init (synchronous init with inline resources)
applyHtmlAttrs(i18next.language)

// Keep in sync on every change
i18next.on('languageChanged', (lang: string) => {
  applyHtmlAttrs(lang)
})

export default i18next
