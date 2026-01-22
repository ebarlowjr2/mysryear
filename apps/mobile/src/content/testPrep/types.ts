export type TestId =
  | 'sat'
  | 'act'
  | 'psat'
  | 'ap'
  | 'asvab'
  | 'accuplacer'
  | 'state_grad'

export type TestMilestone = {
  id: string
  label: string           // button text
  taskTitle: string       // planner task title template
  offsetDays?: number     // create due_date = today + offsetDays
  fixedMonth?: number     // for generic seasonal reminders (optional)
  fixedDay?: number
  notes?: string
}

export type TestPrepItem = {
  id: TestId
  name: string
  shortDescription: string
  whatItIs: string
  whoShouldTake: string
  whyItMatters: string
  whenToTake: string        // plain English timeline
  links?: { label: string; url: string }[]
  milestones: TestMilestone[]
  icon: string              // Ionicons name
  color: string             // accent color
  bgColor: string           // background color for icon
}
