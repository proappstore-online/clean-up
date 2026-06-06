import { describe, it, expect } from 'vitest'

// Criterion #7: detail.add_photo, detail.remove_photo, detail.photo_management_hint
// must exist in ALL 9 locale files.
import en from '../../src/locales/en.json'
import zh from '../../src/locales/zh.json'
import vi from '../../src/locales/vi.json'
import ar from '../../src/locales/ar.json'
import yue from '../../src/locales/yue.json'
import pa from '../../src/locales/pa.json'
import el from '../../src/locales/el.json'
import it from '../../src/locales/it.json'
import hi from '../../src/locales/hi.json'

const REQUIRED_KEYS = ['add_photo', 'remove_photo', 'photo_management_hint'] as const

const locales: Record<string, any> = { en, zh, vi, ar, yue, pa, el, it, hi }

describe('i18n detail.* photo keys present in all 9 locales (criterion #7)', () => {
  for (const [name, data] of Object.entries(locales)) {
    for (const key of REQUIRED_KEYS) {
      it(`${name}.json has detail.${key}`, () => {
        expect(data.detail, `${name}.json is missing the "detail" section entirely`).toBeDefined()
        expect(
          data.detail?.[key],
          `${name}.json is missing detail.${key}`,
        ).toBeTruthy()
      })
    }
  }
})

describe('en.json hint copy matches spec value', () => {
  it('detail.photo_management_hint === "First photo is the cover image"', () => {
    expect((en as any).detail.photo_management_hint).toBe('First photo is the cover image')
  })
})
