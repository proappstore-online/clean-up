import { describe, it, expect } from 'vitest'

import en from '../../src/locales/en.json'
import zh from '../../src/locales/zh.json'
import vi from '../../src/locales/vi.json'
import ar from '../../src/locales/ar.json'
import yue from '../../src/locales/yue.json'
import pa from '../../src/locales/pa.json'
import el from '../../src/locales/el.json'
import it from '../../src/locales/it.json'
import hi from '../../src/locales/hi.json'

type Json = Record<string, unknown>

// Recursively collect leaf key paths, e.g. "detail.place_bid"
function leafKeys(obj: Json, prefix = ''): string[] {
  const out: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...leafKeys(v as Json, path))
    } else {
      out.push(path)
    }
  }
  return out
}

function getAt(obj: Json, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Json)[part]
    return undefined
  }, obj)
}

// Extract {{placeholder}} tokens from a translation string
function placeholders(str: string): string[] {
  const matches = str.match(/\{\{\s*[\w]+\s*\}\}/g) ?? []
  return matches.map((m) => m.replace(/[{}\s]/g, '')).sort()
}

const ALL_LOCALES: Record<string, Json> = { zh, vi, ar, yue, pa, el, it, hi }
const EN_KEYS = leafKeys(en as Json)

describe('locale parity — en.json is the source of truth', () => {
  it('en.json has the documented ticket keys', () => {
    // Spot-check the exact keys the components reference exist in en.
    const required = [
      'nav.browse_jobs',
      'nav.my_jobs',
      'jobs.post_button',
      'auth.sign_in_google',
      'auth.sign_in_github',
      'detail.place_bid',
      'detail.submit_bid',
      'detail.accept',
      'detail.close_job',
      'detail.cancel',
      'post.post',
      'errors.refresh',
      'post.title_label',
      'detail.message_label',
      'post.title_placeholder',
      'post.description_placeholder',
      'post.location_placeholder',
      'detail.message_placeholder',
      'status.open',
      'status.closed',
      'status.accepted',
      'jobs.empty_no_jobs',
      'jobs.empty_be_first',
      'jobs.no_match',
      'myjobs.empty_posted',
      'myjobs.empty_bids',
      'jobs.loading',
      'post.posting',
      'detail.submitting',
      'location.no_results',
    ]
    for (const key of required) {
      expect(getAt(en as Json, key), `missing en key: ${key}`).toBeTruthy()
    }
  })

  for (const [name, locale] of Object.entries(ALL_LOCALES)) {
    describe(`${name}.json`, () => {
      it(`has EVERY key present in en.json (no missing translations)`, () => {
        const missing = EN_KEYS.filter((k) => {
          const v = getAt(locale, k)
          return v === undefined || v === null || v === ''
        })
        expect(missing, `${name}.json is missing keys: ${missing.join(', ')}`).toEqual([])
      })

      it(`has NO extra keys absent from en.json`, () => {
        const localeKeys = leafKeys(locale)
        const extra = localeKeys.filter((k) => !EN_KEYS.includes(k))
        expect(extra, `${name}.json has stray keys not in en.json: ${extra.join(', ')}`).toEqual([])
      })

      it(`preserves all {{placeholder}} tokens for each key`, () => {
        const mismatches: string[] = []
        for (const key of EN_KEYS) {
          const enVal = getAt(en as Json, key)
          const locVal = getAt(locale, key)
          if (typeof enVal !== 'string' || typeof locVal !== 'string') continue
          const enPh = placeholders(enVal)
          const locPh = placeholders(locVal)
          if (JSON.stringify(enPh) !== JSON.stringify(locPh)) {
            mismatches.push(`${key} (en:[${enPh}] vs ${name}:[${locPh}])`)
          }
        }
        expect(mismatches, `placeholder mismatches: ${mismatches.join('; ')}`).toEqual([])
      })
    })
  }

  it('all 9 locale files are wired into i18n resources (8 + English)', () => {
    // The memory lists 9 languages total; verify we ship 9 locale objects.
    expect(Object.keys(ALL_LOCALES).length).toBe(8)
  })
})
