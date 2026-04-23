import type { CareerPath } from '../lib/types'

export const CAREERS: CareerPath[] = [
  {
    id: 'cybersecurity-analyst',
    title: 'Cybersecurity Analyst',
    category: 'Technology',
    description:
      'Protect systems and data by monitoring threats, improving security controls, and responding to incidents.',
    pathwayType: 'mixed',
    timelineYears: 2.5,
    estimatedCostMin: 8000,
    estimatedCostMax: 45000,
    startingSalaryMin: 65000,
    startingSalaryMax: 90000,
    debtRisk: 'medium',
    certifications: ['CompTIA Security+', 'Google Cybersecurity Certificate', 'Network+ (optional)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Build technical readiness',
        description: 'Take CS/IT classes, learn basic networking, and practice safe online habits.',
      },
      {
        stage: 'Training',
        title: 'Earn a starter credential',
        description: 'Complete a certificate program and/or Security+ to prove baseline security knowledge.',
      },
      {
        stage: 'Experience',
        title: 'Get hands-on experience',
        description: 'Join a cyber club, do labs (TryHackMe/HTB), and land an IT help desk or internship role.',
      },
      {
        stage: 'Entry Role',
        title: 'First security job',
        description: 'Target SOC analyst, junior security analyst, or security operations roles.',
      },
      {
        stage: 'Growth',
        title: 'Specialize',
        description: 'Choose a lane: cloud security, incident response, GRC, or application security.',
      },
    ],
    recommendations: [
      'Start with a certification-first path to reduce cost while proving skills.',
      'Build a small portfolio: writeups of labs, a home lab, and a few security projects.',
      'Aim for an internship or help desk role within 6–12 months to build momentum.',
      'Join a cohort or local cyber club to improve support and accountability.',
    ],
    cohorts: [
      {
        name: 'Cyber Club / CTF Team',
        type: 'student cohort',
        description: 'Weekly practice, team challenges, and mentorship from older students.',
      },
      {
        name: 'Security+ Study Sprint',
        type: 'online community',
        description: 'Short, structured plan to pass your first certification.',
      },
    ],
    tags: ['security', 'IT', 'networking', 'CTF'],
  },
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    category: 'Technology',
    description:
      'Design and build apps and systems using programming languages, teamwork, and problem-solving.',
    pathwayType: 'degree',
    timelineYears: 4,
    estimatedCostMin: 25000,
    estimatedCostMax: 180000,
    startingSalaryMin: 70000,
    startingSalaryMax: 120000,
    debtRisk: 'high',
    certifications: ['Optional: AWS Cloud Practitioner', 'Optional: Meta Front-End Certificate'],
    milestones: [
      {
        stage: 'High School',
        title: 'Start building',
        description: 'Learn a language (JS/Python), build 2–3 small projects, and join a CS club.',
      },
      {
        stage: 'Postsecondary',
        title: 'Degree or strong equivalent',
        description: 'Computer Science or Software Engineering program, or an accelerated alternative.',
      },
      {
        stage: 'Experience',
        title: 'Internships',
        description: 'Apply early; one internship can dramatically improve readiness and job prospects.',
      },
      {
        stage: 'Entry Role',
        title: 'First full-time role',
        description: 'Target junior SWE roles; keep learning on the job and through side projects.',
      },
      {
        stage: 'Growth',
        title: 'Specialize',
        description: 'Choose a track: backend, frontend, mobile, data, or cloud infrastructure.',
      },
    ],
    recommendations: [
      'If cost is a concern, consider community college first then transfer to a 4-year program.',
      'Build a portfolio with 3–5 projects (not just tutorials).',
      'Practice interview basics: data structures, system thinking, and communication.',
      'Work with a cohort for accountability and mentorship.',
    ],
    cohorts: [
      {
        name: 'App Builders Cohort',
        type: 'student cohort',
        description: 'Build a project every two weeks with peer feedback.',
      },
      {
        name: 'Local Hack Club',
        type: 'online community',
        description: 'Meet other builders and find project partners.',
      },
    ],
    tags: ['coding', 'apps', 'teamwork', 'portfolio'],
  },
  {
    id: 'cloud-engineer',
    title: 'Cloud Engineer',
    category: 'Technology',
    description:
      'Build and operate cloud infrastructure so applications can run reliably, securely, and at scale.',
    pathwayType: 'mixed',
    timelineYears: 3,
    estimatedCostMin: 12000,
    estimatedCostMax: 80000,
    startingSalaryMin: 75000,
    startingSalaryMax: 110000,
    debtRisk: 'medium',
    certifications: ['AWS Solutions Architect Associate', 'Azure Fundamentals', 'Terraform (skills)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Learn core IT',
        description: 'Understand networks, Linux basics, and scripting.',
      },
      {
        stage: 'Training',
        title: 'Cloud foundation',
        description: 'Earn a fundamentals cert and practice deploying simple apps.',
      },
      {
        stage: 'Experience',
        title: 'Projects + internship',
        description: 'Build a portfolio: a static site, a small API, and monitoring/logging.',
      },
      {
        stage: 'Entry Role',
        title: 'Cloud/DevOps junior role',
        description: 'Target junior cloud engineer, DevOps associate, or SRE intern roles.',
      },
      {
        stage: 'Growth',
        title: 'Reliability + security',
        description: 'Improve automation, cost controls, and security posture.',
      },
    ],
    recommendations: [
      'Start with certification-first to reduce cost and show momentum.',
      'Build 2–3 cloud projects and document them clearly.',
      'Learn cost controls early—cloud bills are part of the job.',
    ],
    cohorts: [
      {
        name: 'Cloud Study Group',
        type: 'online community',
        description: 'Weekly study and project check-ins for AWS/Azure learners.',
      },
    ],
    tags: ['cloud', 'devops', 'linux', 'automation'],
  },
  {
    id: 'data-analyst',
    title: 'Data Analyst',
    category: 'Business/Analytics',
    description:
      'Turn data into insights using spreadsheets, SQL, dashboards, and storytelling.',
    pathwayType: 'mixed',
    timelineYears: 2,
    estimatedCostMin: 3000,
    estimatedCostMax: 40000,
    startingSalaryMin: 55000,
    startingSalaryMax: 80000,
    debtRisk: 'low',
    certifications: ['Google Data Analytics Certificate', 'SQL (skills)', 'Tableau/Power BI (skills)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Strengthen math + communication',
        description: 'Take stats if available; practice writing clear explanations.',
      },
      {
        stage: 'Training',
        title: 'Learn SQL + dashboards',
        description: 'Build 2 dashboards and 1 analysis project with a clean writeup.',
      },
      {
        stage: 'Experience',
        title: 'Internship or volunteer analytics',
        description: 'Help a club or nonprofit analyze results and present findings.',
      },
      {
        stage: 'Entry Role',
        title: 'Analyst role',
        description: 'Target junior analyst roles and keep improving portfolio + business context.',
      },
    ],
    recommendations: [
      'Start with a certificate and 2 portfolio projects before deciding on a 4-year path.',
      'Practice explaining insights—communication boosts readiness.',
      'Use real datasets and show your reasoning, not just charts.',
    ],
    cohorts: [
      {
        name: 'Data Project Sprint',
        type: 'student cohort',
        description: 'Build one case study per month with peer reviews.',
      },
    ],
    tags: ['sql', 'dashboards', 'analysis', 'communication'],
  },
  {
    id: 'nurse',
    title: 'Nurse (RN)',
    category: 'Healthcare',
    description:
      'Provide patient care, coordinate treatment, and support health outcomes in clinics and hospitals.',
    pathwayType: 'degree',
    timelineYears: 3,
    estimatedCostMin: 18000,
    estimatedCostMax: 120000,
    startingSalaryMin: 65000,
    startingSalaryMax: 95000,
    debtRisk: 'medium',
    certifications: ['CPR/BLS', 'NCLEX-RN'],
    milestones: [
      {
        stage: 'High School',
        title: 'Prepare for healthcare track',
        description: 'Take biology/anatomy if available and volunteer in healthcare settings.',
      },
      {
        stage: 'Postsecondary',
        title: 'RN program',
        description: 'Choose ADN (2-year) or BSN (4-year) depending on goals and cost.',
      },
      {
        stage: 'Clinical',
        title: 'Clinical rotations',
        description: 'Build confidence, network, and pick a specialization interest.',
      },
      {
        stage: 'Licensure',
        title: 'Pass NCLEX',
        description: 'Complete exam and onboarding into your first RN role.',
      },
    ],
    recommendations: [
      'Consider ADN → employer tuition support → BSN to lower debt risk.',
      'Get a healthcare job (CNA/MA) while studying if feasible for momentum.',
      'Join a cohort for exam prep and support.',
    ],
    cohorts: [
      {
        name: 'NCLEX Prep Group',
        type: 'student cohort',
        description: 'Structured practice + accountability leading up to exam.',
      },
    ],
    tags: ['healthcare', 'patient care', 'clinical', 'licensure'],
  },
  {
    id: 'medical-assistant',
    title: 'Medical Assistant',
    category: 'Healthcare',
    description:
      'Support clinicians by handling patient intake, basic procedures, and office workflows.',
    pathwayType: 'certification',
    timelineYears: 1,
    estimatedCostMin: 2000,
    estimatedCostMax: 18000,
    startingSalaryMin: 32000,
    startingSalaryMax: 45000,
    debtRisk: 'low',
    certifications: ['CMA (Certified Medical Assistant)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Explore healthcare roles',
        description: 'Volunteer, shadow, and strengthen communication + organization.',
      },
      {
        stage: 'Training',
        title: 'MA program',
        description: 'Complete a certificate program and practice clinical + admin skills.',
      },
      {
        stage: 'Entry Role',
        title: 'Clinic role',
        description: 'Build experience and decide if you want to advance to nursing or another specialty.',
      },
    ],
    recommendations: [
      'Use MA as a lower-cost entry into healthcare while you explore nursing or allied health.',
      'Look for clinics with tuition assistance if you plan to keep studying.',
    ],
    cohorts: [
      {
        name: 'Healthcare Career Ladder Group',
        type: 'online community',
        description: 'Mentorship and advice on moving from MA → RN or other roles.',
      },
    ],
    tags: ['healthcare', 'clinic', 'certification', 'patient intake'],
  },
  {
    id: 'teacher',
    title: 'Teacher',
    category: 'Education',
    description:
      'Help students learn skills and confidence through instruction, planning, and mentorship.',
    pathwayType: 'degree',
    timelineYears: 4,
    estimatedCostMin: 18000,
    estimatedCostMax: 140000,
    startingSalaryMin: 38000,
    startingSalaryMax: 55000,
    debtRisk: 'medium',
    certifications: ['State teaching credential/licensure'],
    milestones: [
      {
        stage: 'High School',
        title: 'Build leadership experience',
        description: 'Tutor, volunteer, and practice speaking/presenting.',
      },
      {
        stage: 'Postsecondary',
        title: 'Education degree',
        description: 'Complete teacher prep program and required coursework.',
      },
      {
        stage: 'Clinical',
        title: 'Student teaching',
        description: 'Learn classroom management and instruction planning.',
      },
      {
        stage: 'Licensure',
        title: 'Credential exams',
        description: 'Complete licensing requirements and start teaching.',
      },
    ],
    recommendations: [
      'Consider lower-cost state schools or scholarship programs for education majors.',
      'Get classroom exposure early (tutoring) to boost readiness.',
    ],
    cohorts: [
      {
        name: 'Future Educators Network',
        type: 'student cohort',
        description: 'Peer support + classroom observation opportunities.',
      },
    ],
    tags: ['education', 'mentorship', 'leadership', 'licensure'],
  },
  {
    id: 'electrician',
    title: 'Electrician',
    category: 'Skilled Trades',
    description:
      'Install and maintain electrical systems in homes, businesses, and industrial settings.',
    pathwayType: 'apprenticeship',
    timelineYears: 4,
    estimatedCostMin: 1500,
    estimatedCostMax: 12000,
    startingSalaryMin: 42000,
    startingSalaryMax: 60000,
    debtRisk: 'low',
    certifications: ['Apprenticeship program', 'Journeyman license (varies by state)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Hands-on readiness',
        description: 'Take shop/math, learn safety basics, and explore union/local programs.',
      },
      {
        stage: 'Training',
        title: 'Apprenticeship entry',
        description: 'Apply to apprenticeship; start earning while learning.',
      },
      {
        stage: 'Experience',
        title: 'On-the-job training',
        description: 'Log hours, learn codes, and build practical skills.',
      },
      {
        stage: 'Credential',
        title: 'Journeyman pathway',
        description: 'Complete exams/requirements and increase earning power.',
      },
    ],
    recommendations: [
      'Choose apprenticeship-first to keep debt low and momentum high.',
      'Build a simple budget plan for tools and fees.',
    ],
    cohorts: [
      {
        name: 'Local Apprenticeship Info Session',
        type: 'cohort',
        description: 'Meet program coordinators and learn application steps.',
      },
    ],
    tags: ['trade', 'apprenticeship', 'hands-on', 'low debt'],
  },
  {
    id: 'hvac-technician',
    title: 'HVAC Technician',
    category: 'Skilled Trades',
    description:
      'Install and repair heating, ventilation, and air conditioning systems.',
    pathwayType: 'mixed',
    timelineYears: 2,
    estimatedCostMin: 2000,
    estimatedCostMax: 25000,
    startingSalaryMin: 38000,
    startingSalaryMax: 55000,
    debtRisk: 'low',
    certifications: ['EPA 608', 'State/local certs (varies)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Explore the trade',
        description: 'Learn safety, basic tools, and mechanical reasoning.',
      },
      {
        stage: 'Training',
        title: 'Technical program',
        description: 'Complete a short program and earn EPA certification.',
      },
      {
        stage: 'Experience',
        title: 'Apprentice / helper role',
        description: 'Work with experienced techs and learn real job workflows.',
      },
      {
        stage: 'Entry Role',
        title: 'HVAC tech',
        description: 'Take on service calls, build reputation, and specialize.',
      },
    ],
    recommendations: [
      'Certification-first can get you working quickly with low cost.',
      'Focus on customer communication—strong service skills improve growth.',
    ],
    cohorts: [
      {
        name: 'Trade Skills Mentorship',
        type: 'mentorship group',
        description: 'Connect with working techs to learn the career ladder.',
      },
    ],
    tags: ['hvac', 'trade', 'certification', 'fast entry'],
  },
  {
    id: 'welder',
    title: 'Welder',
    category: 'Skilled Trades',
    description:
      'Join metal parts using heat and specialized equipment across many industries.',
    pathwayType: 'certification',
    timelineYears: 1.5,
    estimatedCostMin: 2000,
    estimatedCostMax: 20000,
    startingSalaryMin: 36000,
    startingSalaryMax: 52000,
    debtRisk: 'low',
    certifications: ['AWS welding cert (varies)', 'Safety training'],
    milestones: [
      {
        stage: 'High School',
        title: 'Safety + basics',
        description: 'Try a shop class and learn safety, measurement, and tools.',
      },
      {
        stage: 'Training',
        title: 'Welding program',
        description: 'Learn MIG/TIG/Stick and complete certification tests.',
      },
      {
        stage: 'Entry Role',
        title: 'Shop role',
        description: 'Build experience and specialize in a welding type.',
      },
    ],
    recommendations: ['Budget for equipment/tools and start with a low-cost program.', 'Practice consistently—skill grows fast with reps.'],
    cohorts: [
      {
        name: 'Trade School Cohort',
        type: 'student cohort',
        description: 'Peer practice time and certification prep.',
      },
    ],
    tags: ['welding', 'trade', 'hands-on', 'certification'],
  },
  {
    id: 'mechanic',
    title: 'Auto Mechanic',
    category: 'Skilled Trades',
    description:
      'Diagnose and repair vehicles using mechanical and electronic troubleshooting.',
    pathwayType: 'mixed',
    timelineYears: 2,
    estimatedCostMin: 2500,
    estimatedCostMax: 30000,
    startingSalaryMin: 35000,
    startingSalaryMax: 52000,
    debtRisk: 'low',
    certifications: ['ASE (optional)', 'Safety training'],
    milestones: [
      {
        stage: 'High School',
        title: 'Build fundamentals',
        description: 'Explore automotive classes and learn safe tool use.',
      },
      {
        stage: 'Training',
        title: 'Tech program',
        description: 'Complete auto tech training and begin hands-on work.',
      },
      {
        stage: 'Entry Role',
        title: 'Shop role',
        description: 'Work under a senior tech; earn certifications as you grow.',
      },
    ],
    recommendations: ['Work while training to reduce debt and build momentum.', 'Specialize over time (EVs, diagnostics) to improve pay.'],
    cohorts: [
      {
        name: 'Auto Tech Mentorship',
        type: 'mentorship group',
        description: 'Learn from experienced mechanics about certifications and specialties.',
      },
    ],
    tags: ['automotive', 'repair', 'hands-on', 'diagnostics'],
  },
  {
    id: 'ux-designer',
    title: 'UX Designer',
    category: 'Design',
    description:
      'Design user-friendly products by researching needs, prototyping, and testing experiences.',
    pathwayType: 'mixed',
    timelineYears: 2,
    estimatedCostMin: 5000,
    estimatedCostMax: 60000,
    startingSalaryMin: 60000,
    startingSalaryMax: 90000,
    debtRisk: 'medium',
    certifications: ['Google UX Design Certificate', 'Figma (skills)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Build design thinking',
        description: 'Practice writing, problem-solving, and basic design tools.',
      },
      {
        stage: 'Training',
        title: 'Portfolio first',
        description: 'Create 2–3 case studies with research, wireframes, and prototypes.',
      },
      {
        stage: 'Experience',
        title: 'Real users',
        description: 'Test with real people; show what you learned and changed.',
      },
      {
        stage: 'Entry Role',
        title: 'Junior UX role',
        description: 'Target internships and junior roles; keep building case studies.',
      },
    ],
    recommendations: [
      'Focus on a portfolio with case studies rather than only visuals.',
      'Consider community college or certificate-first to lower cost.',
    ],
    cohorts: [
      {
        name: 'UX Portfolio Studio',
        type: 'student cohort',
        description: 'Monthly critiques and accountability to ship case studies.',
      },
    ],
    tags: ['ux', 'design', 'research', 'portfolio'],
  },
  {
    id: 'graphic-designer',
    title: 'Graphic Designer',
    category: 'Design',
    description:
      'Create visual designs for brands, marketing, and digital experiences.',
    pathwayType: 'mixed',
    timelineYears: 2,
    estimatedCostMin: 3000,
    estimatedCostMax: 50000,
    startingSalaryMin: 38000,
    startingSalaryMax: 55000,
    debtRisk: 'medium',
    certifications: ['Adobe tools (skills)', 'Branding fundamentals'],
    milestones: [
      {
        stage: 'High School',
        title: 'Build a portfolio',
        description: 'Create posters, logos, and small brand kits with feedback.',
      },
      {
        stage: 'Training',
        title: 'Learn tools + fundamentals',
        description: 'Typography, layout, color, and design systems.',
      },
      {
        stage: 'Experience',
        title: 'Client-like projects',
        description: 'Do projects for clubs or local businesses to build real experience.',
      },
    ],
    recommendations: ['Get feedback often; iteration improves readiness.', 'Use low-cost tools at first if budget is tight.'],
    cohorts: [
      {
        name: 'Design Crit Circle',
        type: 'online community',
        description: 'Weekly critique and challenges to build momentum.',
      },
    ],
    tags: ['design', 'branding', 'portfolio', 'creative'],
  },
  {
    id: 'accountant',
    title: 'Accountant',
    category: 'Business/Finance',
    description:
      'Manage financial records, reporting, and compliance for individuals or organizations.',
    pathwayType: 'degree',
    timelineYears: 4,
    estimatedCostMin: 18000,
    estimatedCostMax: 140000,
    startingSalaryMin: 52000,
    startingSalaryMax: 75000,
    debtRisk: 'medium',
    certifications: ['CPA (later)', 'Bookkeeping (optional)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Strengthen math + organization',
        description: 'Take accounting/business if offered; build attention to detail.',
      },
      {
        stage: 'Postsecondary',
        title: 'Accounting degree',
        description: 'Complete core courses and internships.',
      },
      {
        stage: 'Experience',
        title: 'Internships',
        description: 'Public accounting internships can boost readiness quickly.',
      },
      {
        stage: 'Growth',
        title: 'CPA pathway',
        description: 'Optional credential that can increase long-term earning potential.',
      },
    ],
    recommendations: ['Start at a lower-cost school if possible; internships matter a lot.', 'Build spreadsheet and communication skills early.'],
    cohorts: [
      {
        name: 'Finance Study Pod',
        type: 'student cohort',
        description: 'Weekly practice and internship application support.',
      },
    ],
    tags: ['finance', 'accounting', 'detail', 'compliance'],
  },
  {
    id: 'digital-marketer',
    title: 'Digital Marketer',
    category: 'Business/Marketing',
    description:
      'Grow audiences and sales using content, ads, analytics, and experimentation.',
    pathwayType: 'mixed',
    timelineYears: 2,
    estimatedCostMin: 1000,
    estimatedCostMax: 40000,
    startingSalaryMin: 40000,
    startingSalaryMax: 60000,
    debtRisk: 'low',
    certifications: ['Google Analytics', 'Meta Ads (optional)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Build a small project',
        description: 'Grow a club account, a newsletter, or a small site.',
      },
      {
        stage: 'Training',
        title: 'Learn funnels + analytics',
        description: 'Run small experiments and track results.',
      },
      {
        stage: 'Experience',
        title: 'Internship / freelance',
        description: 'Document wins and lessons for your portfolio.',
      },
    ],
    recommendations: ['Start with a portfolio of campaigns and measurable results.', 'Certificates can help you get interviews quickly.'],
    cohorts: [
      {
        name: 'Marketing Experiment Lab',
        type: 'student cohort',
        description: 'Ship one campaign per month and review results with peers.',
      },
    ],
    tags: ['marketing', 'analytics', 'content', 'growth'],
  },
  {
    id: 'project-manager',
    title: 'Project Manager',
    category: 'Business/Operations',
    description:
      'Plan and coordinate projects across teams, timelines, and budgets to deliver outcomes.',
    pathwayType: 'mixed',
    timelineYears: 3,
    estimatedCostMin: 5000,
    estimatedCostMax: 80000,
    startingSalaryMin: 55000,
    startingSalaryMax: 85000,
    debtRisk: 'medium',
    certifications: ['CAPM (optional)', 'Agile fundamentals'],
    milestones: [
      {
        stage: 'High School',
        title: 'Lead something',
        description: 'Run a club project and practice planning + communication.',
      },
      {
        stage: 'Training',
        title: 'Learn PM basics',
        description: 'Scope, timelines, risks, and stakeholder updates.',
      },
      {
        stage: 'Experience',
        title: 'Coordinator role',
        description: 'Start as a project coordinator; grow into PM responsibilities.',
      },
    ],
    recommendations: ['Build a portfolio of projects you led (school/community counts).', 'Focus on communication—support and readiness improve fast.'],
    cohorts: [
      {
        name: 'Leadership & PM Cohort',
        type: 'student cohort',
        description: 'Practice planning, presentations, and teamwork.',
      },
    ],
    tags: ['planning', 'leadership', 'operations', 'communication'],
  },
  {
    id: 'social-worker',
    title: 'Social Worker',
    category: 'Community',
    description:
      'Support individuals and families by connecting them to resources and helping navigate challenges.',
    pathwayType: 'degree',
    timelineYears: 4,
    estimatedCostMin: 18000,
    estimatedCostMax: 140000,
    startingSalaryMin: 38000,
    startingSalaryMax: 55000,
    debtRisk: 'medium',
    certifications: ['State licensure (varies)', 'MSW (optional for advanced roles)'],
    milestones: [
      {
        stage: 'High School',
        title: 'Volunteer and explore',
        description: 'Get involved with community programs and learn about resources.',
      },
      {
        stage: 'Postsecondary',
        title: 'Social work degree',
        description: 'Complete coursework and supervised field hours.',
      },
      {
        stage: 'Experience',
        title: 'Field placement',
        description: 'Learn how to support clients and document care plans.',
      },
    ],
    recommendations: ['Choose a lower-cost program when possible; consider scholarships for service fields.', 'Build support—this work is emotionally demanding.'],
    cohorts: [
      {
        name: 'Community Care Cohort',
        type: 'student cohort',
        description: 'Peer support and mentorship for service careers.',
      },
    ],
    tags: ['community', 'support', 'service', 'care'],
  },
  {
    id: 'physical-therapist',
    title: 'Physical Therapist',
    category: 'Healthcare',
    description:
      'Help patients recover mobility and strength through treatment plans and guided exercises.',
    pathwayType: 'degree',
    timelineYears: 7,
    estimatedCostMin: 70000,
    estimatedCostMax: 250000,
    startingSalaryMin: 75000,
    startingSalaryMax: 100000,
    debtRisk: 'high',
    certifications: ['DPT licensure'],
    milestones: [
      {
        stage: 'High School',
        title: 'Prepare academically',
        description: 'Strong science track; volunteer or shadow in PT settings.',
      },
      {
        stage: 'Postsecondary',
        title: 'Undergrad + prerequisites',
        description: 'Complete prerequisites and maintain competitive GPA.',
      },
      {
        stage: 'Graduate',
        title: 'DPT program',
        description: 'Doctor of Physical Therapy program + clinical rotations.',
      },
      {
        stage: 'Licensure',
        title: 'Start practice',
        description: 'Complete boards and begin clinical work.',
      },
    ],
    recommendations: ['Consider community college for prerequisites to lower cost.', 'Plan a realistic borrowing cap and scholarship search early.'],
    cohorts: [
      {
        name: 'Pre-Health Mentorship',
        type: 'mentorship group',
        description: 'Guidance on prerequisites, shadowing, and application strategy.',
      },
    ],
    tags: ['healthcare', 'rehab', 'graduate school', 'high debt'],
  },
  {
    id: 'lawyer',
    title: 'Lawyer',
    category: 'Law/Public Service',
    description:
      'Advise clients and represent cases by researching, writing, negotiating, and advocating.',
    pathwayType: 'degree',
    timelineYears: 7,
    estimatedCostMin: 60000,
    estimatedCostMax: 300000,
    startingSalaryMin: 60000,
    startingSalaryMax: 140000,
    debtRisk: 'high',
    certifications: ['Bar exam'],
    milestones: [
      {
        stage: 'High School',
        title: 'Build writing + debate skills',
        description: 'Take debate/mock trial and practice structured writing.',
      },
      {
        stage: 'Postsecondary',
        title: 'Undergraduate degree',
        description: 'Choose a major you can excel in; build strong GPA and leadership.',
      },
      {
        stage: 'Graduate',
        title: 'Law school',
        description: 'Complete JD program and internships/clinics.',
      },
      {
        stage: 'Licensure',
        title: 'Bar exam',
        description: 'Pass the bar and begin practice.',
      },
    ],
    recommendations: ['If debt risk is high, consider lower-cost schools and scholarships early.', 'Gain exposure via internships at legal aid or local firms.'],
    cohorts: [
      {
        name: 'Mock Trial Team',
        type: 'student cohort',
        description: 'Practice argumentation and public speaking.',
      },
    ],
    tags: ['law', 'writing', 'advocacy', 'high debt'],
  },
  {
    id: 'entrepreneur',
    title: 'Entrepreneur',
    category: 'Entrepreneurship',
    description:
      'Start and grow a business by solving real problems, validating ideas, and building a team.',
    pathwayType: 'mixed',
    timelineYears: 2,
    estimatedCostMin: 500,
    estimatedCostMax: 25000,
    startingSalaryMin: 0,
    startingSalaryMax: 60000,
    debtRisk: 'low',
    milestones: [
      {
        stage: 'High School',
        title: 'Pick a problem',
        description: 'Find a real pain point and talk to potential customers.',
      },
      {
        stage: 'Build',
        title: 'Launch a first version',
        description: 'Start small: service business, product MVP, or local offering.',
      },
      {
        stage: 'Momentum',
        title: 'Get paying customers',
        description: 'Learn marketing, sales, and customer support.',
      },
      {
        stage: 'Growth',
        title: 'Scale carefully',
        description: 'Improve operations, margins, and long-term strategy.',
      },
    ],
    recommendations: [
      'Start with a low-cost, cash-flow friendly idea to reduce risk.',
      'Join a mentorship group for support and faster learning.',
      'Track finances early—small mistakes compound.',
    ],
    cohorts: [
      {
        name: 'Student Startup Studio',
        type: 'student cohort',
        description: 'Weekly progress check-ins, pitch practice, and customer interviews.',
      },
    ],
    tags: ['business', 'startup', 'sales', 'problem-solving'],
  },
]

export const CATEGORIES = Array.from(new Set(CAREERS.map((c) => c.category))).sort()
