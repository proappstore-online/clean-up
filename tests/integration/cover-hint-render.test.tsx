import { describe, it, expect, beforeAll } from 'vitest'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '../../src/locales/en.json'
import zh from '../../src/locales/zh.json'
import vi from '../../src/locales/vi.json'
import ar from '../../src/locales/ar.json'
import yue from '../../src/locales/yue.json'
import pa from '../../src/locales/pa.json'
import el from '../../src/locales/el.json'
import it from '../../src/locales/it.json'
import hi from '../../src/locales/hi.json'

// Integration: exercise the i18next runtime exactly as the app configures it,
// so we catch the real "raw key rendered" failure that the user would see.
//
// AC checked here:
//  - t('post.photos_label', { count: 10 }) -> string containing "10" (interpolation works, new max surfaces)
//  - t('post.cover_hint') -> a real translated string, NOT the raw key "post.cover_hint"
//    (a missing key in any locale fails this).

const resources = {
  en: { translation: en },
  zh: { translation: zh },
  vi: { translation: vi },
  ar: { translation: ar },
  yue: { translation: yue },
  pa: { translation: pa },
  el: { translation: el },
  it: { translation: it },
  hi: { translation: hi },
} as const

const LANGS = Object.keys(resources)

beforeAll(async () => {
  await i18next.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: false, // do NOT fall back: we want each locale to stand on its own
    supportedLngs: LANGS,
    interpolation: { escapeValue: false },
  })
})

describe('post.photos_label interpolation surfaces the new max (10)', () => {
  for (const lng of LANGS) {
    it(`[${lng}] renders "10" when count=10`, async () => {
      await i18next.changeLanguage(lng)
      const out = i18next.t('post.photos_label', { count: 10 })
      expect(out).toContain('10')
      // not the raw key
      expect(out).not.toBe('post.photos_label')
    })
  }
})

describe('post.cover_hint resolves to translated text, not the raw key', () => {
  for (const lng of LANGS) {
    it(`[${lng}] t('post.cover_hint') is not the raw key`, async () => {
      await i18next.changeLanguage(lng)
      const out = i18next.t('post.cover_hint')
      expect(
        out,
        `${lng}: cover_hint resolved to raw key — translation missing for this locale`,
      ).not.toBe('post.cover_hint')
      expect(out.trim().length).toBeGreaterThan(0)
    })
  }

  it('en cover_hint matches ticket copy verbatim', async () => {
    await i18next.changeLanguage('en')
    expect(i18next.t('post.cover_hint')).toBe(
      'First photo will be used as the cover image on the listing.',
    )
  })
})
