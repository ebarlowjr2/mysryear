import { getSession } from './auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'

async function getSupabase() {
  return createNextServerSupabaseClient()
}

export type Path =
  | 'College'
  | 'Trade/Apprenticeship'
  | 'Military'
  | 'Gap Year'
  | 'Workforce'
  | 'Entrepreneurship'
export type Category =
  | 'Applications'
  | 'Essays'
  | 'Testing'
  | 'Scholarships'
  | 'Financial Aid'
  | 'Campus Visits'
  | 'Housing'
  | 'Enrollment'
  | 'Documents'
  | 'Admin/Other'
export type Status = 'todo' | 'doing' | 'done'

export type Profile = {
  state: string
  path: Path
  testing: 'SAT' | 'ACT' | 'Both' | 'None'
  earlyAction: boolean
}

export type Task = {
  id: string
  title: string
  category: Category
  status: Status
  month: string
  due?: string
  notes?: string
  pinned?: boolean
}

export type DocKit = {
  idCard: boolean
  ssnReady: boolean
  fsaId: boolean
  taxDocs: boolean
  transcript: boolean
  testScores: boolean
  resume: boolean
  activitiesList: boolean
  essays: boolean
  recLetters: boolean
  portfolio: boolean
}

export type Recommender = {
  id: string
  name: string
  email?: string
  role?: string
  requested?: string
  submitted?: string
  notes?: string
}

export type Visit = {
  id: string
  name: string
  date?: string
  rating?: number
  notes?: string
}

export async function saveProfile(profile: Profile): Promise<void> {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const supabase = await getSupabase()
  const { error } = await supabase.from('profiles').upsert({
    id: session.user.id,
    state: profile.state,
    path: profile.path,
    testing: profile.testing,
    early_action: profile.earlyAction,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}

export async function loadProfile(): Promise<Profile | null> {
  const session = await getSession()
  if (!session?.user?.id) return null

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  if (!data) return null

  return {
    state: data.state || '',
    path: data.path || 'College',
    testing: data.testing || 'None',
    earlyAction: data.early_action || false,
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const supabase = await getSupabase()
  await supabase.from('user_tasks').delete().eq('user_id', session.user.id)

  if (tasks.length > 0) {
    const { error } = await supabase.from('user_tasks').insert(
      tasks.map((task) => ({
        id: task.id,
        user_id: session.user.id,
        title: task.title,
        category: task.category,
        status: task.status,
        month: task.month,
        due_date: task.due || null,
        notes: task.notes || null,
        pinned: task.pinned || false,
      })),
    )

    if (error) throw error
  }
}

export async function loadTasks(): Promise<Task[]> {
  const session = await getSession()
  if (!session?.user?.id) return []

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at')

  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category as Category,
    status: row.status as Status,
    month: row.month,
    due: row.due_date || undefined,
    notes: row.notes || undefined,
    pinned: row.pinned || false,
  }))
}

export async function saveDocuments(docs: DocKit): Promise<void> {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const docEntries = Object.entries(docs).map(([type, completed]) => ({
    user_id: session.user.id,
    document_type: type,
    completed: completed as boolean,
  }))

  const supabase = await getSupabase()
  await supabase.from('user_documents').delete().eq('user_id', session.user.id)

  const { error } = await supabase.from('user_documents').insert(docEntries)

  if (error) throw error
}

export async function loadDocuments(): Promise<DocKit> {
  const session = await getSession()
  if (!session?.user?.id) {
    return {
      idCard: false,
      ssnReady: false,
      fsaId: false,
      taxDocs: false,
      transcript: false,
      testScores: false,
      resume: false,
      activitiesList: false,
      essays: false,
      recLetters: false,
      portfolio: false,
    }
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('user_documents')
    .select('*')
    .eq('user_id', session.user.id)

  if (error) throw error

  const docs: DocKit = {
    idCard: false,
    ssnReady: false,
    fsaId: false,
    taxDocs: false,
    transcript: false,
    testScores: false,
    resume: false,
    activitiesList: false,
    essays: false,
    recLetters: false,
    portfolio: false,
  }

  data.forEach((row) => {
    if (row.document_type in docs) {
      ;(docs as Record<string, boolean>)[row.document_type] = row.completed
    }
  })

  return docs
}

export async function saveRecommenders(recommenders: Recommender[]): Promise<void> {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const supabase = await getSupabase()
  await supabase.from('user_recommenders').delete().eq('user_id', session.user.id)

  if (recommenders.length > 0) {
    const { error } = await supabase.from('user_recommenders').insert(
      recommenders.map((rec) => ({
        id: rec.id,
        user_id: session.user.id,
        name: rec.name,
        email: rec.email || null,
        role: rec.role || null,
        requested_date: rec.requested || null,
        submitted_date: rec.submitted || null,
        notes: rec.notes || null,
      })),
    )

    if (error) throw error
  }
}

export async function loadRecommenders(): Promise<Recommender[]> {
  const session = await getSession()
  if (!session?.user?.id) return []

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('user_recommenders')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at')

  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    role: row.role || undefined,
    requested: row.requested_date || undefined,
    submitted: row.submitted_date || undefined,
    notes: row.notes || undefined,
  }))
}

export async function saveVisits(visits: Visit[]): Promise<void> {
  const session = await getSession()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const supabase = await getSupabase()
  await supabase.from('user_visits').delete().eq('user_id', session.user.id)

  if (visits.length > 0) {
    const { error } = await supabase.from('user_visits').insert(
      visits.map((visit) => ({
        id: visit.id,
        user_id: session.user.id,
        name: visit.name,
        visit_date: visit.date || null,
        rating: visit.rating || null,
        notes: visit.notes || null,
      })),
    )

    if (error) throw error
  }
}

export async function loadVisits(): Promise<Visit[]> {
  const session = await getSession()
  if (!session?.user?.id) return []

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('user_visits')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at')

  if (error) throw error

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.visit_date || undefined,
    rating: row.rating || undefined,
    notes: row.notes || undefined,
  }))
}
