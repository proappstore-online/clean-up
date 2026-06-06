import { describe, it, expect } from 'vitest'

// AC source: ticket "Raise photo limit to 10 in PostJobModal"
//  - post.photos_label must use {{count}} interpolation in ALL 9 locales (no hardcoded number)
//  - post.cover_hint must EXIST in ALL 9 locales (helper text, no missing-key regression)
//
// These tests import the actual locale JSON the app ships (src/lib/i18n.ts loads exactly these),
// so a missing/regressed key here is a real, reproducible UI failure (raw key string rendered).

import en from '../../src/locales/en.json'
import zh from '../../src/locales/zh.json'
import vi from '../../src/locales/vi.json'
import ar from '../../src/locales/ar.json'
import yue from '../../src/locales/yue.json'
import pa from '../../src/locales/pa.json'
import el from '../../src/locales/el.json'
import it from '../../src/locales/it.json'
import hi from '../../src/locales/hi.json'

const LOCALES: Record<string, any> = { en, zh, vi, ar, yue, pa, el, it, hi }
const LOCALE_NAMES = Object.keys(LOCALES)

// Project memory: 9 target languages.
const EXPECTED_LOCALES = ['en', 'zh', 'vi', 'ar', 'yue', 'pa', 'el', 'it', 'hi']

describe('locale coverage', () => {
  it('has all 9 target languages loaded', () => {
    expect(LOCALE_NAMES.sort()).toEqual([...EXPECTED_LOCALES].sort())
  })
})

describe('post.photos_label — {{count}} interpolation (AC: renders max via count in all 9 locales)', () => {
  for (const [name, data] of Object.entries(LOCALES)) {
    it(`[${name}] post.photos_label exists`, () => {
      expect(data?.post?.photos_label, `${name}: post.photos_label missing`).toBeTruthy()
      expect(typeof data.post.photos_label).toBe('string')
    })

    it(`[${name}] post.photos_label uses {{count}} interpolation (not a hardcoded number)`, () => {
      const label: string = data.post.photos_label
      expect(label, `${name}: photos_label must contain {{count}}`).toContain('{{count}}')
    })

    it(`[${name}] post.photos_label does NOT hardcode the old "4" or new "10"`, () => {
      const label: string = data.post.photos_label
      // The count is driven by MAX_PHOTOS via interpolation; no digits should be baked in.
      expect(label, `${name}: photos_label should not contain a literal digit`).not.toMatch(/[0-9]/)
    })
  }
})

describe('post.cover_hint — helper text present in all 9 locales (AC: no missing key)', () => {
  for (const [name, data] of Object.entries(LOCALES)) {
    it(`[${name}] post.cover_hint key exists and is a non-empty string`, () => {
      const hint = data?.post?.cover_hint
      expect(hint, `${name}: post.cover_hint is MISSING — t('post.cover_hint') will render the raw key`).toBeDefined()
      expect(typeof hint, `${name}: post.cover_hint must be a string`).toBe('string')
      expect((hint ?? '').trim().length, `${name}: post.cover_hint must not be empty`).toBeGreaterThan(0)
    })

    it(`[${name}] post.cover_hint does not contain {{count}} (it is plain helper text, not the count label)`, () => {
      const hint = data?.post?.cover_hint ?? ''
      expect(hint).not.toContain('{{count}}')
    })
  }

  it('en post.cover_hint matches the ticket copy', () => {
    expect((en as any).post.cover_hint).toBe(
      'First photo will be used as the cover image on the listing.',
    )
  })
})

describe('locale key parity (no locale left missing the new keys vs. English)', () => {
  const enPostKeys = Object.keys((en as any).post)

  for (const [name, data] of Object.entries(LOCALES)) {
    it(`[${name}] post namespace has all English post.* keys`, () => {
      const keys = Object.keys(data.post ?? {})
      const missing = enPostKeys.filter((k) => !keys.includes(k))
      expect(missing, `${name}: missing post keys: ${missing.join(', ')}`).toEqual([])
    })
  }
})
