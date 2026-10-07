import { NextRequest, NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import { createServiceRoleClient, hasServiceRoleConfig } from '@/lib/scholarships/service-role'

async function authenticatedUser(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

  if (bearerToken) {
    const admin = createServiceRoleClient()
    const { data, error } = await admin.auth.getUser(bearerToken)
    if (error) return null
    return data.user
  }

  const supabase = await createNextServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

export async function DELETE(request: NextRequest) {
  if (!hasServiceRoleConfig()) {
    return NextResponse.json(
      { error: 'Account deletion is temporarily unavailable.' },
      { status: 503 },
    )
  }

  const user = await authenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceRoleClient()

  const [
    { data: claimedProfiles, error: claimedError },
    { data: managedProfiles, error: managedError },
  ] = await Promise.all([
    admin.from('student_profiles').select('id').eq('student_user_id', user.id),
    admin
      .from('student_profiles')
      .select('id')
      .eq('managed_by_user_id', user.id)
      .is('student_user_id', null),
  ])

  if (claimedError || managedError) {
    return NextResponse.json({ error: 'Could not prepare account deletion.' }, { status: 500 })
  }

  const studentProfileIds = Array.from(
    new Set([...(claimedProfiles || []), ...(managedProfiles || [])].map((row) => row.id)),
  )

  if (studentProfileIds.length > 0) {
    const { data: files, error: filesError } = await admin
      .from('uploaded_files')
      .select('file_path')
      .in('student_profile_id', studentProfileIds)

    if (filesError) {
      return NextResponse.json(
        { error: 'Could not prepare uploaded-file deletion.' },
        { status: 500 },
      )
    }

    const filePaths = (files || [])
      .map((file) => file.file_path)
      .filter((path): path is string => Boolean(path))

    if (filePaths.length > 0) {
      const { error: storageError } = await admin.storage.from('user-uploads').remove(filePaths)
      if (storageError) {
        return NextResponse.json({ error: 'Could not remove uploaded files.' }, { status: 500 })
      }
    }

    const { error: profileDeleteError } = await admin
      .from('student_profiles')
      .delete()
      .in('id', studentProfileIds)

    if (profileDeleteError) {
      return NextResponse.json({ error: 'Could not remove student profile data.' }, { status: 500 })
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteUserError) {
    return NextResponse.json({ error: 'Could not delete the account.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
