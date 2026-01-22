// Career Paths - Static list for mentor profile selection
// This is a preset list that mentors can select from when creating their profile

export type CareerPath = {
  id: string
  name: string
  description: string
  icon: string // Ionicons name
}

export const CAREER_PATHS: CareerPath[] = [
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Protecting systems, networks, and data from digital attacks',
    icon: 'shield-checkmark',
  },
  {
    id: 'software-engineering',
    name: 'Software Engineering',
    description: 'Designing, developing, and maintaining software applications',
    icon: 'code-slash',
  },
  {
    id: 'it-help-desk',
    name: 'IT / Help Desk',
    description: 'Technical support and IT infrastructure management',
    icon: 'desktop',
  },
  {
    id: 'data-ai',
    name: 'Data / AI',
    description: 'Data analysis, machine learning, and artificial intelligence',
    icon: 'analytics',
  },
  {
    id: 'skilled-trades',
    name: 'Skilled Trades',
    description: 'Electrician, plumber, HVAC, construction, and other trades',
    icon: 'construct',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Medical, nursing, allied health, and healthcare administration',
    icon: 'medkit',
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Banking, accounting, financial planning, and investments',
    icon: 'cash',
  },
  {
    id: 'entrepreneurship',
    name: 'Entrepreneurship',
    description: 'Starting and running your own business',
    icon: 'rocket',
  },
  {
    id: 'military',
    name: 'Military (General)',
    description: 'Armed forces careers and military service paths',
    icon: 'flag',
  },
]

// Helper function to get career path by ID
export function getCareerPathById(id: string): CareerPath | undefined {
  return CAREER_PATHS.find((path) => path.id === id)
}

// Helper function to get career paths by IDs
export function getCareerPathsByIds(ids: string[]): CareerPath[] {
  return CAREER_PATHS.filter((path) => ids.includes(path.id))
}

// Helper function to get career path names from IDs
export function getCareerPathNames(ids: string[]): string[] {
  return ids
    .map((id) => getCareerPathById(id)?.name)
    .filter((name): name is string => name !== undefined)
}
