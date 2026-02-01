// ============ USER & PROFILE TYPES ============

export type UserRole = 'student' | 'parent' | 'teacher' | 'business' | 'mentor' | 'recruiter'

export type Profile = {
  id: string
  user_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  role: UserRole | null
  school: string | null
  graduation_year: number | null
  graduation_date: string | null
  state: string | null
  county: string | null
  org_name: string | null
  website: string | null
  notifications_tasks: boolean
  notifications_deadlines: boolean
  waitlist_ai_aura: boolean
  waitlist_drive: boolean
  waitlist_onedrive: boolean
  onboarding_complete: boolean
  // Business profile fields
  org_state: string | null
  org_counties: string[] | null
  // Teacher profile fields
  job_title: string | null
  department: string | null
  // Push notification preferences
  notify_link_requests: boolean
  notify_deadlines: boolean
  notify_parent_updates: boolean
  deadline_lead_days: number
  // Verification
  verification_status: 'unverified' | 'pending' | 'verified'
  verification_requested_at: string | null
  created_at: string
  updated_at: string
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ============ TASK/PLANNER TYPES ============

export type TaskCategory = 
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

export type TaskStatus = 'todo' | 'doing' | 'done'

export type Task = {
  id: string
  user_id: string
  title: string
  category: TaskCategory
  status: TaskStatus
  month: string
  due_date: string | null
  notes: string | null
  pinned: boolean
  assigned_by_user_id: string | null
  assigned_by_role: string | null
  created_at: string
  updated_at: string
}

export type CreateTaskInput = {
  title: string
  category?: TaskCategory
  month?: string
  due_date?: string | null
  notes?: string | null
}

export type UpdateTaskInput = Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ============ APPLICATION TYPES ============

export type ApplicationType = 'college' | 'scholarship' | 'program' | 'internship'
export type ApplicationStatus = 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted' | 'deferred'
export type EssayStatus = 'not_started' | 'draft' | 'completed'

export type Application = {
  id: string
  user_id: string
  college_name: string
  program_name: string | null
  application_type: ApplicationType
  status: ApplicationStatus
  deadline: string | null
  date_applied: string | null
  portal_url: string | null
  contact_email: string | null
  essay_status: EssayStatus
  recommendation_count: number
  fee_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CreateApplicationInput = {
  college_name: string
  program_name?: string | null
  application_type?: ApplicationType
  status?: ApplicationStatus
  deadline?: string | null
  date_applied?: string | null
  portal_url?: string | null
  contact_email?: string | null
  essay_status?: EssayStatus
  recommendation_count?: number
  fee_amount?: number | null
  notes?: string | null
}

export type UpdateApplicationInput = Partial<Omit<Application, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ============ DASHBOARD TYPES ============

export type DashboardMetrics = {
  scholarshipsCount: number
  upcomingDeadlines: number
  pendingTasks: number
  completedTasks: number
  applicationsCount: number
}

export type NextDeadline = {
  title: string
  dueDate: string
  category: string
  type: 'task' | 'application'
} | null

// ============ PARENT-STUDENT TYPES ============

export type LinkStatus = 'pending' | 'accepted' | 'declined'

export type ParentStudentLink = {
  id: string
  parent_user_id: string
  student_user_id: string
  status: LinkStatus
  created_at: string
  updated_at: string
}

export type LinkedStudent = {
  id: string
  student_user_id: string
  student_name: string
  student_email: string
  status: LinkStatus
}

export type ParentStudentSummary = {
  metrics: {
    pendingTasks: number
    completedTasks: number
    applicationsCount: number
    scholarshipsCount: number
  }
  upcomingDeadlines: Array<{
    title: string
    dueDate: string
    type: 'task' | 'application'
  }>
  recentTasks: Array<{
    id: string
    title: string
    status: TaskStatus
    dueDate: string | null
  }>
  recentApplications: Array<{
    id: string
    collegeName: string
    status: ApplicationStatus
    deadline: string | null
  }>
}

// ============ SCHOOL TYPES ============

export type School = {
  id: string
  name: string
  city: string | null
  state: string | null
  nces_id: string | null
  created_at: string
}

export type SchoolMembership = {
  school_id: string
  school_name: string
  role: 'student' | 'teacher'
  joined_at: string
}

// ============ OPPORTUNITY TYPES ============

export type OpportunityType = 'internship' | 'apprenticeship' | 'job_shadow' | 'volunteer' | 'workshop' | 'other'

export type Opportunity = {
  id: string
  business_user_id: string
  title: string
  description: string | null
  opportunity_type: OpportunityType
  location: string | null
  is_remote: boolean
  deadline: string | null
  spots_available: number | null
  requirements: string | null
  contact_email: string | null
  external_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  business_name?: string
  business_state?: string
}

export type CreateOpportunityInput = {
  title: string
  description?: string | null
  opportunity_type?: OpportunityType
  location?: string | null
  is_remote?: boolean
  deadline?: string | null
  spots_available?: number | null
  requirements?: string | null
  contact_email?: string | null
  external_url?: string | null
}

export type UpdateOpportunityInput = Partial<Omit<Opportunity, 'id' | 'business_user_id' | 'created_at' | 'updated_at' | 'business_name' | 'business_state'>>

// ============ JOB TYPES ============

export type JobType = 'full_time' | 'part_time' | 'internship' | 'contract' | 'seasonal'
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'any'

export type Job = {
  id: string
  recruiter_user_id: string
  title: string
  company_name: string
  description: string | null
  job_type: JobType
  experience_level: ExperienceLevel
  location: string | null
  is_remote: boolean
  salary_min: number | null
  salary_max: number | null
  deadline: string | null
  requirements: string | null
  contact_email: string | null
  external_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreateJobInput = {
  title: string
  company_name: string
  description?: string | null
  job_type?: JobType
  experience_level?: ExperienceLevel
  location?: string | null
  is_remote?: boolean
  salary_min?: number | null
  salary_max?: number | null
  deadline?: string | null
  requirements?: string | null
  contact_email?: string | null
  external_url?: string | null
}

export type UpdateJobInput = Partial<Omit<Job, 'id' | 'recruiter_user_id' | 'created_at' | 'updated_at'>>

// ============ MENTOR TYPES ============

export type MentorProfile = {
  id: string
  user_id: string
  headline: string
  bio: string | null
  career_paths: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined fields
  full_name?: string
  org_name?: string
}

export type CreateMentorProfileInput = {
  headline: string
  bio?: string | null
  career_paths?: string[] | null
}

export type UpdateMentorProfileInput = Partial<Omit<MentorProfile, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'full_name' | 'org_name'>>

// ============ MENTOR AVAILABILITY TYPES ============

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type MentorAvailability = {
  id: string
  mentor_user_id: string
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

export type CreateAvailabilityInput = {
  day_of_week: DayOfWeek
  start_time: string
  end_time: string
}

export type UpdateAvailabilityInput = Partial<Omit<MentorAvailability, 'id' | 'mentor_user_id' | 'created_at'>>
