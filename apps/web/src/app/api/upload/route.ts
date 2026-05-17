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
    const documentType = form.get('document_type')
    const schoolYear = form.get('school_year')
    const gradingPeriod = form.get('grading_period')
    const gradeLevel = form.get('grade_level')
    const gpa = form.get('gpa')
    const notes = form.get('notes')
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
        uploaded_by_user_id: session.user.id,
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

    // If this upload is an academic document, also create an academic_records row.
    const isAcademic = typeof uploadContext === 'string' && uploadContext.startsWith('academic_')
    if (isAcademic) {
      const parsedGpa = typeof gpa === 'string' && gpa.trim() ? Number(gpa) : null
      const record = {
        student_profile_id: studentProfileId,
        uploaded_file_id: row.id,
        uploaded_by_user_id: session.user.id,
        document_type: typeof documentType === 'string' && documentType ? documentType : 'general',
        // Some DBs still have a legacy `subject` column (previous schema). We populate it when present.
        subject: typeof uploadContext === 'string' ? uploadContext : 'general',
        school_year: typeof schoolYear === 'string' ? schoolYear : null,
        grading_period: typeof gradingPeriod === 'string' ? gradingPeriod : null,
        grade_level: typeof gradeLevel === 'string' ? gradeLevel : null,
        gpa: typeof parsedGpa === 'number' && !Number.isNaN(parsedGpa) ? parsedGpa : null,
        notes: typeof notes === 'string' ? notes : null,
      }

      // Best-effort. If the environment doesn't have academic_records yet or doesn't have `subject`,
      // we still want the upload to succeed.
      const { error: recError } = await supabase.from('academic_records').insert(record as never)
      if (recError && /column .*subject.* does not exist/i.test(recError.message)) {
        // Retry without subject
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { subject: _ignoredSubject, ...withoutSubject } = record
        await supabase.from('academic_records').insert(withoutSubject as never)
      }
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

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) {
    // No linked/active student profile means there is no planning container to scope uploads to.
    return NextResponse.json({ ok: true, files: [] })
  }

  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('student_profile_id', studentProfileId)
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
