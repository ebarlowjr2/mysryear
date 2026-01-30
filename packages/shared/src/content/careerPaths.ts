// Career paths for mentor matching
export type CareerPath = {
  id: string
  name: string
  description: string
  icon: string
}

export const CAREER_PATHS: CareerPath[] = [
  {
    id: 'cybersecurity',
    name: 'Cybersecurity',
    description: 'Protect systems and data from cyber threats',
    icon: 'shield'
  },
  {
    id: 'software-engineering',
    name: 'Software Engineering',
    description: 'Build applications and software systems',
    icon: 'code'
  },
  {
    id: 'it-help-desk',
    name: 'IT / Help Desk',
    description: 'Support users and maintain IT infrastructure',
    icon: 'headphones'
  },
  {
    id: 'data-ai',
    name: 'Data & AI',
    description: 'Work with data analytics and artificial intelligence',
    icon: 'brain'
  },
  {
    id: 'skilled-trades',
    name: 'Skilled Trades',
    description: 'Electrical, plumbing, HVAC, and construction',
    icon: 'wrench'
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Medical, nursing, and health services',
    icon: 'heart'
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Banking, accounting, and financial services',
    icon: 'dollar-sign'
  },
  {
    id: 'entrepreneurship',
    name: 'Entrepreneurship',
    description: 'Start and grow your own business',
    icon: 'rocket'
  },
  {
    id: 'military',
    name: 'Military',
    description: 'Armed forces and defense careers',
    icon: 'star'
  }
]

export function getCareerPath(id: string): CareerPath | undefined {
  return CAREER_PATHS.find(p => p.id === id)
}

export function getCareerPathNames(ids: string[]): string[] {
  return ids.map(id => getCareerPath(id)?.name || id)
}
