import { supabase } from '../lib/supabase'

export type Scholarship = {
  id: string
  name: string
  amount: string
  deadline: string
  link: string
  state: string | null
  tags: string[] | null
  source: string | null
}

export type SavedScholarship = {
  id: string
  scholarshipId: string
  status: 'saved' | 'applied'
}

export async function getScholarships(): Promise<Scholarship[]> {
  const { data, error } = await supabase
    .from('scraped_scholarships')
    .select('id, name, amount, deadline, link, state, tags, source')
    .eq('is_active', true)
    .order('deadline', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getScholarshipById(id: string): Promise<Scholarship | null> {
  const { data, error } = await supabase
    .from('scraped_scholarships')
    .select('id, name, amount, deadline, link, state, tags, source')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getSavedScholarshipIds(userId: string): Promise<Map<string, 'saved' | 'applied'>> {
  const { data, error } = await supabase
    .from('user_saved_scholarships')
    .select('scholarship_id, status')
    .eq('user_id', userId)

  if (error) {
    console.warn('user_saved_scholarships table may not exist:', error.message)
    return new Map()
  }

  const map = new Map<string, 'saved' | 'applied'>()
  for (const row of data ?? []) {
    map.set(row.scholarship_id, row.status)
  }
  return map
}

export async function saveScholarship(userId: string, scholarshipId: string): Promise<void> {
  const { error } = await supabase
    .from('user_saved_scholarships')
    .upsert({
      user_id: userId,
      scholarship_id: scholarshipId,
      status: 'saved'
    }, {
      onConflict: 'user_id,scholarship_id'
    })

  if (error) throw error
}

export async function unsaveScholarship(userId: string, scholarshipId: string): Promise<void> {
  const { error } = await supabase
    .from('user_saved_scholarships')
    .delete()
    .eq('user_id', userId)
    .eq('scholarship_id', scholarshipId)

  if (error) throw error
}

export async function markScholarshipApplied(userId: string, scholarshipId: string): Promise<void> {
  const { error } = await supabase
    .from('user_saved_scholarships')
    .upsert({
      user_id: userId,
      scholarship_id: scholarshipId,
      status: 'applied'
    }, {
      onConflict: 'user_id,scholarship_id'
    })

  if (error) throw error
}

export function searchScholarships(
  scholarships: Scholarship[],
  query: string,
  filters: {
    state?: string | null
    minAmount?: number | null
  }
): Scholarship[] {
  return scholarships.filter(s => {
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || 
      s.name.toLowerCase().includes(q) || 
      (s.tags?.join(' ') || '').toLowerCase().includes(q)

    const matchesState = !filters.state || 
      (s.state?.toUpperCase() === filters.state.toUpperCase())

    const amountNum = parseInt((s.amount || '').replace(/[^0-9]/g, '')) || 0
    const matchesAmount = !filters.minAmount || amountNum >= filters.minAmount

    return matchesQuery && matchesState && matchesAmount
  })
}

export function sortByDeadline(scholarships: Scholarship[]): Scholarship[] {
  return [...scholarships].sort((a, b) => {
    const dateA = normalizeDeadline(a.deadline)
    const dateB = normalizeDeadline(b.deadline)
    return dateA.localeCompare(dateB)
  })
}

function normalizeDeadline(d: string): string {
  try {
    if (/\d{4}-\d{2}-\d{2}/.test(d)) return d
    const date = new Date(d + ' ' + new Date().getFullYear())
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  } catch {}
  return d
}

export function formatDeadline(deadline: string): string {
  try {
    const normalized = normalizeDeadline(deadline)
    if (/\d{4}-\d{2}-\d{2}/.test(normalized)) {
      const date = new Date(normalized + 'T00:00:00')
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  } catch {}
  return deadline
}
