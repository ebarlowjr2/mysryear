import { NextResponse } from 'next/server'
import {
  createNextServerSupabaseClient,
  isValidFamilyLinkCode,
  normalizeFamilyLinkCode,
} from '@mysryear/shared'

type FamilyLinkAction = 'create_code' | 'revoke_code' | 'request_by_code' | 'request_by_email'

const genericEmailRequestMessage =
  'If that student can receive requests, they will see your connection request when they sign in.'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return jsonError('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as {
    action?: FamilyLinkAction
    code?: string
    studentEmail?: string
  } | null
  if (!body?.action) return jsonError('Invalid request')

  if (body.action === 'create_code') {
    const { data, error } = await supabase.rpc('create_student_family_link_code', {
      p_expires_minutes: 15,
    })
    if (error) return jsonError(error.message)

    const row = Array.isArray(data) ? data[0] : null
    if (!row?.code || !row?.expires_at) return jsonError('Could not create a family link code')

    return NextResponse.json({ ok: true, code: row.code, expiresAt: row.expires_at })
  }

  if (body.action === 'revoke_code') {
    const { error } = await supabase.rpc('revoke_student_family_link_codes')
    if (error) return jsonError(error.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'request_by_code') {
    const code = normalizeFamilyLinkCode(body.code || '')
    if (!isValidFamilyLinkCode(code)) {
      return jsonError('Enter the full 16-character family link code.')
    }

    const { data, error } = await supabase.rpc('request_student_family_link_by_code', {
      p_code: code,
    })
    if (error) return jsonError(error.message)

    return NextResponse.json({ ok: true, result: data || 'requested' })
  }

  if (body.action === 'request_by_email') {
    if (!isEmail(body.studentEmail)) return jsonError('Enter a valid student email address.')

    const { error } = await supabase.rpc('request_student_family_link_by_email', {
      p_student_email: body.studentEmail.trim().toLowerCase(),
    })
    if (error) return jsonError(error.message)

    // Do not expose whether this email maps to a MySRYear student account.
    return NextResponse.json({ ok: true, message: genericEmailRequestMessage })
  }

  return jsonError('Unsupported family link action')
}
