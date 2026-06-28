export const opportunityTypes = [
  'internship',
  'volunteer',
  'job_shadowing',
  'apprenticeship',
  'mentorship',
  'workshop',
  'summer_program',
  'part_time_job',
  'career_event',
] as const

export const opportunityStatuses = ['draft', 'pending', 'active', 'closed', 'archived'] as const

export type BusinessProfile = {
  id: string
  owner_user_id: string
  organization_name: string
  contact_name: string | null
  contact_email: string | null
  phone: string | null
  website: string | null
  industry: string | null
  description: string | null
  address_city: string | null
  address_state: string | null
  verified: boolean | null
  status: string | null
}

export type BusinessOpportunity = {
  id: string
  business_profile_id: string
  created_by_user_id: string
  title: string
  opportunity_type: string
  description: string
  location_type: string | null
  city: string | null
  state: string | null
  remote_available: boolean | null
  age_min: number | null
  grade_min: string | null
  grade_max: string | null
  career_category: string | null
  related_career_ids: string[] | null
  skills: string[] | null
  application_url: string | null
  contact_email: string | null
  deadline: string | null
  start_date: string | null
  end_date: string | null
  paid: boolean | null
  compensation: string | null
  hours_required: string | null
  status: string | null
  created_at: string | null
}

export function labelFromValue(value: string) {
  return value.replaceAll('_', ' ').replace(/\w/g, (c) => c.toUpperCase())
}
