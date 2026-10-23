import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const origin = 'https://clean-up.proappstore.online'
const root = resolve(__dirname, '../..')
const temporary = mkdtempSync(join(tmpdir(), 'clean-up-assets-'))

afterAll(() => rmSync(temporary, { recursive: true, force: true }))

// Source HTML can reference Vite modules or public/ files. Built HTML must
// resolve entirely inside the deployment artifact; never fall back to source.
function checkAssets(html: string, roots: string[]) {
  function localFile(reference: string, base: string) {
    const url = new URL(reference, base)
    if (url.origin !== origin) return null
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '')
    const file = roots.map((directory) => resolve(directory, relative)).find((candidate, i) => {
      if (!candidate.startsWith(`${resolve(roots[i])}/`)) return false
      try { return statSync(candidate).isFile() } catch { return false }
    })
    if (!file) throw new Error(`Missing public asset: ${url.pathname}`)
    return { file, url: url.href }
  }

  const document = new DOMParser().parseFromString(html, 'text/html')
  const base = new URL(document.querySelector('base[href]')?.getAttribute('href') ?? '/', origin).href
  for (const element of document.querySelectorAll('[src], video[poster], object[data]')) {
    for (const attribute of ['src', 'poster', 'data']) {
      const value = element.getAttribute(attribute)
      if (value) localFile(value, base)
    }
  }
  for (const link of document.querySelectorAll('link[href]')) {
    const relations = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/)
    if (!relations.some((rel) => ['icon', 'apple-touch-icon', 'apple-touch-icon-precomposed',
      'mask-icon', 'manifest', 'stylesheet', 'preload', 'modulepreload'].includes(rel))) continue
    const asset = localFile(link.getAttribute('href')!, base)
    if (!asset || !relations.includes('manifest')) continue
    const manifest = JSON.parse(readFileSync(asset.file, 'utf8'))
    const icons = [...(manifest.icons ?? []),
      ...(manifest.shortcuts ?? []).flatMap((shortcut: { icons?: { src: string }[] }) => shortcut.icons ?? [])]
    for (const icon of icons) localFile(icon.src, asset.url)
  }
}

describe('public asset references', () => {
  it('resolves every asset in source HTML, including linked manifest icons', () => {
    checkAssets(readFileSync(join(root, 'index.html'), 'utf8'), [join(root, 'public'), root])
  })

  it('resolves every asset in a fresh production artifact', () => {
    const outDir = join(temporary, 'dist')
    execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'),
      'build', '--outDir', outDir, '--emptyOutDir'], { cwd: root, stdio: 'pipe' })
    checkAssets(readFileSync(join(outDir, 'index.html'), 'utf8'), [outDir])
  }, 30_000)

  it('rejects the original missing Vite favicon, including URL query/hash suffixes', () => {
    expect(() => checkAssets('<link rel="icon" href="/vite.svg?v=1#icon">', [temporary]))
      .toThrow('Missing public asset: /vite.svg')
  })

  it('rejects missing linked manifests', () => {
    expect(() => checkAssets('<link rel="manifest" href="/missing.webmanifest">', [temporary]))
      .toThrow('Missing public asset: /missing.webmanifest')
  })

  it('resolves manifest-relative and root-relative icons, including shortcut icons', () => {
    const directory = join(temporary, 'manifest-fixture')
    mkdirSync(join(directory, 'app'), { recursive: true })
    writeFileSync(join(directory, 'app/icon.svg'), '<svg/>')
    writeFileSync(join(directory, 'app/site.webmanifest'), JSON.stringify({
      icons: [{ src: './icon.svg?v=1' }],
      shortcuts: [{ icons: [{ src: '/app/icon.svg#shortcut' }] }],
    }))
    const html = '<link rel="manifest" href="/app/site.webmanifest">'
    expect(() => checkAssets(html, [directory])).not.toThrow()
    rmSync(join(directory, 'app/icon.svg'))
    expect(() => checkAssets(html, [directory])).toThrow('Missing public asset: /app/icon.svg')
  })

  it('ignores external and embedded assets without making network requests', () => {
    expect(() => checkAssets('<link rel="icon" href="https://example.com/icon.svg"><img src="data:image/png;base64,AA==">', [temporary]))
      .not.toThrow()
  })
})
