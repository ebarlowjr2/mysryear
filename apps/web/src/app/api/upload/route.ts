import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

export async function POST(req: Request) {
  try {
    const supabase = await createNextServerSupabaseClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file')
    const uploadContext = form.get('upload_context')
    const studentProfileIdFromForm = form.get('student_profile_id')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    const f = file as File
    const originalName = f.name || 'uploaded.file'
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const timestamp = Date.now()

    const studentProfileId =
      (typeof studentProfileIdFromForm === 'string' && studentProfileIdFromForm) ||
      (await getActiveStudentProfileId())

    if (!studentProfileId) {
      return NextResponse.json(
        { error: 'No student profile linked. Link or create a student profile first.' },
        { status: 400 },
      )
    }

    const path = `${studentProfileId}/${timestamp}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(path, f, { contentType: f.type || undefined, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const { data: row, error: insertError } = await supabase
      .from('uploaded_files')
      .insert({
        user_id: session.user.id,
        student_profile_id: studentProfileId,
        file_name: originalName,
        file_path: path,
        file_type: f.type || null,
        file_size: (f as unknown as { size?: number }).size || null,
        upload_context: typeof uploadContext === 'string' ? uploadContext : null,
      })
      .select('*')
      .single()

    if (insertError) {
      // Best-effort cleanup so the bucket doesn't accumulate orphan files.
      await supabase.storage.from('user-uploads').remove([path])
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, file: row })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Upload failed'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, files: data })
}

export async function DELETE(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let payload: { id?: string } | null = null
  try {
    payload = (await req.json()) as { id?: string }
  } catch {
    payload = null
  }

  const id = payload?.id
  if (!id) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 })
  }

  const { data: existing, error: findError } = await supabase
    .from('uploaded_files')
    .select('id,file_path')
    .eq('id', id)
    .single()

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 400 })
  }

  // Remove from storage first, then delete metadata row.
  const { error: storageError } = await supabase.storage
    .from('user-uploads')
    .remove([existing.file_path])

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 400 })
  }

  const { error: deleteError } = await supabase.from('uploaded_files').delete().eq('id', id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
