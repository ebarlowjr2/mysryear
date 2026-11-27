export type { UserRole } from './types/roles'
export { USER_ROLES } from './types/roles'
export {
  ROLE_LABELS,
  familyActionCenterLabel,
  familyRoleNoun,
  isFamilyRole,
} from './role-presentation'

export { computeAcademicHealth, normalizeGradeLevel, templatesForGrade } from './student-success'
export {
  highSchoolGradeFromGraduationYear,
  mergeParentActionCompletions,
  parentActionTemplatesForGrade,
  parentActionTemplatesForStudent,
} from './parent-actions'
export type {
  ParentActionCompletion,
  ParentActionGrade,
  ParentActionItem,
  ParentActionTemplate,
} from './parent-actions'
export type {
  AcademicHealthInput,
  AcademicHealthResult,
  GradeLevel,
  SuccessTaskTemplate,
} from './student-success'

export { scoreCareerHealth, starterTasksForCareer } from './lifepath'
export type {
  CareerHealthBreakdown,
  CareerHealthResult,
  CareerPathForScoring,
  LifePathStarterTask,
  DebtRisk,
  LifePathScenarioId,
  PathwayType,
} from './lifepath'
export { computePortfolioSummary } from './portfolio'
export type { PortfolioSummary, PortfolioSummaryInput } from './portfolio'

export { CAREERS, CATEGORIES } from './career-catalog'
export type { CareerPath, CareerMilestone, CohortOpportunity } from './career-catalog'

// Scholarship matching + discovery (previously missing from the native entry,
// so Metro builds resolved these imports to undefined).
export {
  buildScholarshipApplicationTaskSeeds,
  computeScholarshipApplicationProgress,
  computeScholarshipReadiness,
  computeScholarshipMatch,
  explainScholarshipMatch,
  identifyMissingRequirements,
} from './scholarships'
export type {
  ScholarshipApplicationProgress,
  ScholarshipApplicationTaskSeed,
  ScholarshipApplicationTaskStatus,
  ScholarshipForMatching,
  ScholarshipMatchResult,
  ScholarshipReadinessResult,
  ScholarshipRequirement,
  ScholarshipRequirementType,
  ScholarshipStatus,
  StudentScholarshipProfile,
} from './scholarships'

export { SCHOOL_RESOURCE_CHECKS, TEN_THINGS_TOPICS } from './resources'
export type { SchoolResourceCheck, TenThingsTopic } from './resources'

export {
  COLLEGE_GUIDES,
  GUIDE_CATEGORIES,
  GUIDE_AUDIENCE_LABELS,
  GUIDE_STAGE_LABELS,
  GUIDE_STAGE_ORDER,
  GUIDE_TIMING_LABELS,
  getGuideBySlug,
  getGuideCategory,
  getGuidesByCategory,
  getRelatedGuides,
  searchGuides,
  filterGuides,
  startHereForStage,
} from './college-guides'
export type {
  CollegeGuide,
  GuideCategory,
  GuideCategorySlug,
  GuideAudience,
  GuideStage,
  GuideTiming,
  GuideFilter,
  OfficialSource,
} from './college-guides'

export {
  FAMILY_LINK_CODE_LENGTH,
  formatFamilyLinkCode,
  isValidFamilyLinkCode,
  normalizeFamilyLinkCode,
} from './family-links'

export {
  canManageReportCards,
  emptyReportCard,
  parseReportCard,
  REPORT_CARD_JSON_SCHEMA,
} from './report-cards'
export type { ReportCardData, ReportCardCourse, ReportCardGrade } from './report-cards'

export {
  CAREER_MATCH_DISCLAIMER,
  CAREER_SCHOLARSHIP_PROFILE,
  DEFAULT_CATALOG_FILTERS,
  SCHOLARSHIP_FIELDS,
  SCHOLARSHIP_FIELD_TAGS,
  SCHOLARSHIP_PAGE_SIZE,
  TRACKED_STATUSES,
  TRACKED_STATUS_LABELS,
  buildScholarshipDetail,
  buildScholarshipDiscovery,
  closingInstantMs,
  compareCatalog,
  dedupeCatalog,
  formatAwardAmount,
  formatCatalogDate,
  formatUsd,
  inferFieldTags,
  isListable,
  matchCareerPlans,
  matchesCatalogFilters,
  normalizeDiscoveryTask,
  opensToHighSchool,
  paginate,
  readinessActions,
  scholarshipAvailability,
  scholarshipGradeLevel,
  toCatalogEntry,
  usZoneOffsetHours,
} from './scholarship-discovery'
export type {
  CareerPlan,
  CareerPlanMatch,
  CatalogCard,
  DiscoveryTask,
  ReadinessActionKey,
  ScholarshipAvailability,
  ScholarshipAvailabilityState,
  ScholarshipCatalogEntry,
  ScholarshipCatalogFilters,
  ScholarshipDiscovery,
  ScholarshipDetail,
  ScholarshipDiscoveryInput,
  ScholarshipFieldTag,
  ScholarshipPage,
  TrackedAward,
  TrackedStatus,
} from './scholarship-discovery'
export {
  loadScholarshipDiscoveryInput,
  loadStudentScholarshipProfile,
  loadVisibleScholarshipCatalog,
} from './scholarship-discovery-data'
