import { NextResponse } from 'next/server'

export async function GET() {
  const hint = [
    'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXT_PUBLIC_BASE_URL.',
    "Redirect to Google's consent screen; handle callback in /api/integrations/google/callback.",
  ].join(' ')

  return NextResponse.json({ error: 'Not configured', hint }, { status: 501 })
}
