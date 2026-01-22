import { createTask } from '../data/planner'

type CreatePlannerTaskInput = {
  title: string
  dueDate?: string
  notes?: string
  category?: 'Applications' | 'Essays' | 'Testing' | 'Scholarships' | 'Financial Aid' | 'Campus Visits' | 'Housing' | 'Enrollment' | 'Documents' | 'Admin/Other'
}

/**
 * Creates a task in the planner from a template (e.g., test prep milestone)
 * 
 * @param userId - The user's ID
 * @param input - Task details (title required, dueDate/notes/category optional)
 * @returns The created task
 */
export async function createPlannerTask(
  userId: string,
  input: CreatePlannerTaskInput
) {
  return createTask(userId, {
    title: input.title,
    category: input.category ?? 'Testing',
    dueDate: input.dueDate,
    notes: input.notes,
  })
}

/**
 * Calculates a due date by adding days to today
 * 
 * @param offsetDays - Number of days from today
 * @returns Date string in YYYY-MM-DD format
 */
export function calculateDueDate(offsetDays: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().split('T')[0]
}

/**
 * Creates a task from a test prep milestone
 * 
 * @param userId - The user's ID
 * @param milestone - The milestone object with taskTitle, offsetDays, notes
 * @param testName - The name of the test (for notes)
 * @returns The created task
 */
export async function createTaskFromMilestone(
  userId: string,
  milestone: {
    taskTitle: string
    offsetDays?: number
    notes?: string
  },
  testName: string
) {
  const dueDate = milestone.offsetDays 
    ? calculateDueDate(milestone.offsetDays) 
    : undefined

  const notes = milestone.notes || `Source: Test Prep - ${testName}`

  return createPlannerTask(userId, {
    title: milestone.taskTitle,
    dueDate,
    notes,
    category: 'Testing',
  })
}
