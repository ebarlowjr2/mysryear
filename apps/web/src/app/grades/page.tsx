import { redirect } from 'next/navigation'
import { gradesSession, GradesError } from '@/lib/grades/access'
import GradesClient from './GradesClient'

export const metadata = { title: 'Grades & Report Cards' }
export default async function GradesPage() {
  try {
    await gradesSession()
  } catch (error) {
    if (error instanceof GradesError && error.status === 401) redirect('/login?redirectTo=/grades')
    if (error instanceof GradesError && error.status === 403) redirect('/dashboard')
    throw error
  }
  return <GradesClient />
}
