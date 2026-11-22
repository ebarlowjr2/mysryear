import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The web TypeScript program (and `next build` type-checking) must never pull
 * in Expo/React Native sources: their native-only dependencies are not
 * installed for the web deployment. Tests may still exercise the real native
 * modules, but only through a runtime (non-literal) specifier.
 */
const WEB_ROOT = join(__dirname, '..', '..', '..')
const LITERAL_NATIVE_IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"][^'"]*(?:\.\.\/)+mobile\//

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules' || name === '.next') return []
    if (statSync(path).isDirectory()) return files(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('web ↔ native project boundary', () => {
  it('no web file statically imports apps/mobile sources', () => {
    const offenders = [...files(join(WEB_ROOT, 'src')), ...files(join(WEB_ROOT, 'tests'))]
      .filter((path) => LITERAL_NATIVE_IMPORT.test(readFileSync(path, 'utf8')))
      .map((path) => relative(WEB_ROOT, path))
    expect(offenders).toEqual([])
  })
})
