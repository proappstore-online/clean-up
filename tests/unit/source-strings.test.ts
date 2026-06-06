import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function src(rel: string): string {
  return readFileSync(resolve(__dirname, '../../src/components', rel), 'utf8')
}

const FILES = [
  'CleanMarket.tsx',
  'JobCard.tsx',
  'JobDetail.tsx',
  'JobList.tsx',
  'JobSearchBar.tsx',
  'PostJobModal.tsx',
  'MyJobsView.tsx',
  'LocationAutocomplete.tsx',
]

describe('i18n wiring in components', () => {
  for (const f of FILES) {
    it(`${f} imports useTranslation from react-i18next`, () => {
      const code = src(f)
      expect(code).toMatch(/import\s*\{[^}]*useTranslation[^}]*\}\s*from\s*['"]react-i18next['"]/)
    })

    it(`${f} calls t(...) at least once`, () => {
      expect(src(f)).toMatch(/\bt\(\s*['"]/)
    })
  }
})

describe('JobList emoji fix (bonus from ticket)', () => {
  it('JobList no longer contains the 🧹 broom emoji', () => {
    expect(src('JobList.tsx')).not.toContain('🧹')
  })

  it('JobList imports and renders the Sparkles lucide icon', () => {
    const code = src('JobList.tsx')
    expect(code).toMatch(/import\s*\{[^}]*Sparkles[^}]*\}\s*from\s*['"]lucide-react['"]/)
    expect(code).toMatch(/<Sparkles\b/)
  })
})

describe('FINDING: JobSearchBar still has a hardcoded 🔍 emoji', () => {
  // This documents a real gap the ticket says to cover ("all other visible text").
  // The 🔍 is aria-hidden decorative, but it is a hardcoded literal, not t()/icon.
  it('JobSearchBar contains a hardcoded magnifier emoji (expected FAIL until fixed)', () => {
    expect(src('JobSearchBar.tsx')).not.toContain('🔍')
  })
})
