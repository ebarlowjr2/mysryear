export type TenThingsTopic = {
  title: string
  description: string
  status: 'open' | 'coming_soon'
}

export type SchoolResourceCheck = {
  title: string
  description: string
}

export const TEN_THINGS_TOPICS: TenThingsTopic[] = [
  {
    title: '10 Things to Check at Your School',
    description: 'A practical guide to resources college students may already be paying for.',
    status: 'open',
  },
  {
    title: '10 Things to Check for Research',
    description: 'Coming soon: how to verify colleges, careers, programs, and costs.',
    status: 'coming_soon',
  },
  {
    title: '10 Places to Check for Grants',
    description: 'Coming soon: public, local, employer, school, and nonprofit grant sources.',
    status: 'coming_soon',
  },
]

export const SCHOOL_RESOURCE_CHECKS: SchoolResourceCheck[] = [
  {
    title: 'Online library access',
    description:
      'Check for research databases, academic journals, ebooks, newspapers, industry reports, and professional publications that may be included with tuition.',
  },
  {
    title: 'Newspaper and magazine subscriptions',
    description:
      'Look for free student access to publications like The New York Times, The Wall Street Journal, Financial Times, The Washington Post, Harvard Business Review, and industry journals.',
  },
  {
    title: 'Free or discounted software',
    description:
      'Before buying software, check whether your school provides Microsoft 365, Adobe Creative Cloud, MATLAB, SPSS, SAS, Tableau, ArcGIS, AutoCAD, JetBrains tools, or field-specific licenses.',
  },
  {
    title: 'Cloud computing credits',
    description:
      'Students in computer science, data science, engineering, AI, or cybersecurity may have access to AWS, Microsoft Azure, Google Cloud, or university-hosted cloud environments.',
  },
  {
    title: 'GPU and high-performance computing access',
    description:
      'Some schools offer GPU clusters, supercomputers, research computing systems, or virtual computing labs that would be expensive to access independently.',
  },
  {
    title: 'AI tools and student plans',
    description:
      'Check school-provided AI tools and company student plans. Some platforms offer free or discounted access after verifying a college email address.',
  },
  {
    title: 'Training platforms and certificates',
    description:
      'Your school may already pay for LinkedIn Learning, Coursera, edX, Udemy Business, Skillsoft, or certification-prep platforms.',
  },
  {
    title: 'Career services beyond resume reviews',
    description:
      'Ask about mock interviews, career coaching, internship databases, employer introductions, job fairs, professional headshots, salary negotiation help, and alumni networking.',
  },
  {
    title: 'Entrepreneurship, startup, and research resources',
    description:
      'Look for incubators, innovation centers, research labs, pitch competitions, grant programs, patent support, mentorship, and prototype funding.',
  },
  {
    title: 'Hardware, equipment, and facilities',
    description:
      'Check for access to 3D printers, makerspaces, cameras, podcast studios, recording equipment, electronics labs, VR gear, computer labs, research hardware, or equipment checkout.',
  },
]
