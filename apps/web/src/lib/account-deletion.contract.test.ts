import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '../..')
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('account deletion contract', () => {
  const route = read('src/app/api/account/delete/route.ts')
  const webPanel = read('src/app/profile/ui/DeleteAccountPanel.tsx')
  const mobileHelper = read('../mobile/src/data/account.ts')
  const mobileProfile = read('../mobile/app/(app)/profile.tsx')

  it('requires an authenticated cookie or bearer session before admin deletion', () => {
    expect(route).toContain("request.headers.get('authorization')")
    expect(route).toContain('admin.auth.getUser(bearerToken)')
    expect(route).toContain('supabase.auth.getUser()')
    expect(route).toContain("{ error: 'Unauthorized' }")
  })

  it('keeps the service-role key server-side and deletes owned storage', () => {
    expect(route).toContain('createServiceRoleClient')
    expect(route).toContain("admin.storage.from('user-uploads').remove(filePaths)")
    expect(route).toContain('admin.auth.admin.deleteUser(user.id)')
    expect(mobileHelper).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('requires deliberate confirmation on web and mobile', () => {
    expect(webPanel).toContain("confirmation.trim().toUpperCase() === 'DELETE'")
    expect(mobileProfile).toContain("'Permanently delete account'")
    expect(mobileProfile).toContain("'Delete Permanently'")
  })

  it('uses a bearer token for the mobile deletion request', () => {
    expect(mobileHelper).toContain('Authorization: `Bearer ${session.access_token}`')
    expect(mobileHelper).toContain("method: 'DELETE'")
  })
})
