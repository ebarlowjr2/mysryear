import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  CAREERS,
  calculateParentSimulation,
  DEFAULT_PARENT_SIMULATION_ASSUMPTIONS,
  normalizeParentSimulationAssumptions,
  scoreCareerHealth,
  type ParentSimulationAssumptions,
  type ParentSimulationSummary,
} from '@mysryear/shared'
import { useSession } from '../../../src/hooks/useSession'
import {
  getActiveStudentProfile,
  getCurrentProfile,
  getLinkedStudentProfiles,
  setActiveStudentProfile,
  type AccountProfile,
  type StudentProfile,
} from '../../../src/data/identity'
import {
  averageCareerHealth,
  clearParentSimulation,
  formatCurrencyRange,
  listParentSimulationCareerIdsBySimulation,
  listParentSimulationScenarios,
  listSelectedLifePathCareers,
  listSelectedParentSimulationCareers,
  nextLifePathAction,
  saveParentSimulationScenario,
  shareParentSimulationWithStudent,
  type LifePathMode,
  type ParentSimulationScenario,
  type SelectedCareer,
} from '../../../src/data/lifepath'
import LifePathFeedbackPanel from '../../../src/components/LifePathFeedbackPanel'
import { colors, radius, shadow, ui } from '../../../src/theme'

function riskColor(risk: string) {
  if (risk === 'low') return colors.success
  if (risk === 'medium') return colors.warning
  return colors.error
}

function goBack(fallback: string) {
  if (router.canGoBack()) router.back()
  else router.push(fallback as never)
}

function isFamilyRole(role: AccountProfile['role']) {
  return role === 'parent' || role === 'guardian'
}

function studentName(studentProfile: StudentProfile | null) {
  if (!studentProfile) return 'No active student selected'
  return (
    [studentProfile.first_name, studentProfile.last_name].filter(Boolean).join(' ') || 'Student'
  )
}

function selectedCareersFromIds(careerIds: string[]): SelectedCareer[] {
  const selected: SelectedCareer[] = []
  careerIds.forEach((careerId, index) => {
    const career = CAREERS.find((item) => item.id === careerId)
    if (!career) return
    selected.push({ ...career, rank: index + 1, health: scoreCareerHealth(career, 'baseline') })
  })
  return selected
}

export default function LifePathScreen() {
  const { mode } = useLocalSearchParams<{ mode?: LifePathMode }>()
  const { user, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [linkedStudents, setLinkedStudents] = useState<StudentProfile[]>([])
  const [careers, setCareers] = useState<SelectedCareer[]>([])
  const [simulationScenarios, setSimulationScenarios] = useState<ParentSimulationScenario[]>([])
  const [activeSimulation, setActiveSimulation] = useState<ParentSimulationScenario | null>(null)
  const [simulationTitle, setSimulationTitle] = useState('Parent Simulation')
  const [simulationAssumptions, setSimulationAssumptions] = useState<ParentSimulationAssumptions>(
    DEFAULT_PARENT_SIMULATION_ASSUMPTIONS,
  )
  const [simulationSummary, setSimulationSummary] = useState<ParentSimulationSummary | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [savingSimulation, setSavingSimulation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const role = profile?.role || null
  const isSimulation = mode === 'parent-simulation'
  const isLinkedStudentView =
    mode === 'linked-student' || (Boolean(mode) && role !== 'student' && !isSimulation)
  const readOnlyOfficial = role === 'parent' || role === 'guardian' || role === 'counselor'

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const [account, active, linked] = await Promise.all([
      getCurrentProfile(user.id),
      getActiveStudentProfile(user.id),
      getLinkedStudentProfiles(user.id),
    ])
    setProfile(account)
    setLinkedStudents(linked)
    const validActive =
      active?.id && linked.some((student) => student.id === active.id) ? active : linked[0] || null
    setStudentProfile(validActive)

    if (account?.role === 'business') {
      setLoading(false)
      router.replace('/' as never)
      return
    }

    if (mode === 'parent-simulation') {
      const scenarios = await listParentSimulationScenarios(user.id)
      setSimulationScenarios(scenarios)
      const activeScenario = scenarios[0] || null
      setActiveSimulation(activeScenario)
      setSimulationTitle(activeScenario?.title || 'Parent Simulation')
      const nextAssumptions = normalizeParentSimulationAssumptions(activeScenario?.assumptions)
      setSimulationAssumptions(nextAssumptions)
      const ids = activeScenario?.id
        ? await listParentSimulationCareerIdsBySimulation(activeScenario.id)
        : []
      const fallbackCareers = await listSelectedParentSimulationCareers(user.id)
      setCareers(ids.length ? selectedCareersFromIds(ids) : fallbackCareers)
      setSimulationSummary(
        activeScenario?.results || calculateParentSimulation(ids, nextAssumptions),
      )
    } else {
      setCareers(validActive?.id ? await listSelectedLifePathCareers(validActive.id) : [])
    }
    setLoading(false)
  }, [mode, user?.id])

  useEffect(() => {
    if (!sessionLoading) void load()
  }, [sessionLoading, load])

  async function switchStudent(studentId: string) {
    if (!user?.id || studentProfile?.id === studentId) return
    setLoading(true)
    const result = await setActiveStudentProfile(user.id, studentId)
    if (!result.success) {
      setLoading(false)
      setError(result.error || 'Could not switch active student')
      return
    }
    const nextStudent = linkedStudents.find((student) => student.id === studentId) || null
    setStudentProfile(nextStudent)
    setCareers(nextStudent?.id ? await listSelectedLifePathCareers(nextStudent.id) : [])
    setLoading(false)
  }

  async function restartSimulation() {
    if (!user?.id) return
    const result = await clearParentSimulation(user.id)
    if (!result.success) {
      Alert.alert('Could not restart simulation', result.error || 'Please try again.')
      return
    }
    await load()
  }

  async function saveSimulation(status: 'draft' | 'completed') {
    if (!user?.id) return
    setSavingSimulation(true)
    const result = await saveParentSimulationScenario({
      userId: user.id,
      simulationId: activeSimulation?.id,
      title: simulationTitle,
      careerIds: careers.map((career) => career.id),
      assumptions: simulationAssumptions,
      status,
    })
    setSavingSimulation(false)
    if (!result.success) {
      Alert.alert('Could not save simulation', result.error || 'Please try again.')
      return
    }
    setSimulationSummary(result.summary || null)
    Alert.alert(
      status === 'completed' ? 'Simulation complete' : 'Draft saved',
      'Your Parent Simulation was saved without changing the student LifePath.',
    )
    await load()
  }

  async function shareSimulation() {
    if (!user?.id || !activeSimulation?.id || !studentProfile?.id) return
    const result = await shareParentSimulationWithStudent({
      simulationId: activeSimulation.id,
      studentProfileId: studentProfile.id,
      userId: user.id,
      message: shareMessage,
    })
    if (!result.success) {
      Alert.alert('Could not share recommendation', result.error || 'Please try again.')
      return
    }
    Alert.alert(
      'Recommendation shared',
      'The student can view this as a read-only parent-created recommendation.',
    )
  }

  function setAssumptionNumber(
    key: 'scholarshipsAndGrants' | 'familyContribution' | 'studentEarnings' | 'expectedBorrowing',
    value: string,
  ) {
    const parsed = Number(value)
    setSimulationAssumptions({
      ...simulationAssumptions,
      [key]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    })
  }

  if (sessionLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ui.primary} />
      </View>
    )
  }

  if (isFamilyRole(role) && !mode) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backLink} onPress={() => goBack('/aura')}>
          <Ionicons name="chevron-back" size={18} color={ui.primary} />
          <Text style={styles.backText}>Back to A.U.R.A</Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>A.U.R.A LifePath for Families</Text>
        <Text style={styles.title}>How would you like to use LifePath?</Text>
        <Text style={styles.subtitle}>
          Review your student’s official LifePath or try the experience yourself in a separate
          Parent Simulation.
        </Text>

        <View style={styles.selectorCard}>
          <View style={styles.selectorHeader}>
            <View style={styles.optionIcon}>
              <Ionicons name="people-outline" size={24} color={ui.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>View My Student’s LifePath</Text>
              <Text style={styles.cardText}>
                Choose which linked student to review without leaving A.U.R.A.
              </Text>
            </View>
          </View>

          {linkedStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No linked student yet</Text>
              <Text style={styles.emptyText}>
                Invite or link a student from Profile. You can still use Parent Simulation now.
              </Text>
            </View>
          ) : (
            <View style={styles.studentList}>
              {linkedStudents.map((student) => {
                const active = student.id === studentProfile?.id
                return (
                  <TouchableOpacity
                    key={student.id}
                    style={[styles.studentChoice, active && styles.studentChoiceActive]}
                    onPress={() => void switchStudent(student.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.studentChoiceName, active && styles.studentChoiceNameActive]}
                      >
                        {studentName(student)}
                      </Text>
                      <Text style={styles.studentChoiceMeta}>
                        {student.graduation_year
                          ? `Class of ${student.graduation_year}`
                          : 'Graduation year not set'}
                        {student.schools?.name ? ` • ${student.schools.name}` : ''}
                      </Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={22} color={ui.primary} />
                    ) : null}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, linkedStudents.length === 0 && styles.disabled]}
            disabled={linkedStudents.length === 0}
            onPress={() => router.push('/aura/lifepath?mode=linked-student' as never)}
          >
            <Text style={styles.primaryButtonText}>Open Student LifePath</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => router.push('/aura/lifepath?mode=parent-simulation' as never)}
        >
          <View style={styles.optionIcon}>
            <Ionicons name="sparkles-outline" size={24} color={ui.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Try A.U.R.A LifePath</Text>
            <Text style={styles.cardText}>
              Save choices as a Parent Simulation. This never changes your student’s official
              LifePath.
            </Text>
            <Text style={styles.cardAction}>Start or continue simulation</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  if (!isSimulation && !studentProfile?.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>A.U.R.A LifePath</Text>
        <Text style={styles.subtitle}>Create or select an active student profile first.</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(app)/profile' as never)}
        >
          <Text style={styles.secondaryButtonText}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!careers.length) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => goBack(isSimulation ? '/aura/lifepath' : '/aura')}
        >
          <Ionicons name="chevron-back" size={18} color={ui.primary} />
          <Text style={styles.backText}>
            {isSimulation ? 'Back to LifePath Options' : 'Back to A.U.R.A'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.kicker}>{isSimulation ? 'Parent Simulation' : 'A.U.R.A LifePath'}</Text>
        <Text style={styles.title}>
          {isSimulation ? 'Try LifePath safely.' : 'Map your future before senior year.'}
        </Text>
        <Text style={styles.subtitle}>
          {isSimulation
            ? 'Choose up to five careers in a private simulation. These choices do not affect your student’s official plan.'
            : readOnlyOfficial
              ? 'This student has not selected LifePath careers yet. Editing is disabled for this role.'
              : 'Choose up to five career interests and compare timeline, cost, debt risk, and Career Health.'}
        </Text>
        {!readOnlyOfficial || isSimulation ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() =>
              router.push(
                (isSimulation
                  ? '/aura/lifepath/select?mode=parent-simulation'
                  : '/aura/lifepath/select') as never,
              )
            }
          >
            <Text style={styles.primaryButtonText}>
              {isSimulation ? 'Start Parent Simulation' : 'Start My LifePath'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {readOnlyOfficial && !isSimulation && user?.id ? (
          <LifePathFeedbackPanel userId={user.id} role={role} studentProfile={studentProfile} />
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.backLink}
        onPress={() => goBack(isSimulation || isLinkedStudentView ? '/aura/lifepath' : '/aura')}
      >
        <Ionicons name="chevron-back" size={18} color={ui.primary} />
        <Text style={styles.backText}>
          {isSimulation || isLinkedStudentView ? 'Back to LifePath Options' : 'Back to A.U.R.A'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.kicker}>
        {isSimulation
          ? 'Parent Simulation'
          : readOnlyOfficial
            ? 'Linked Student LifePath'
            : 'A.U.R.A LifePath'}
      </Text>
      <Text style={styles.title}>
        {isSimulation ? 'Parent Simulation Dashboard' : 'LifePath Dashboard'}
      </Text>
      <Text style={styles.subtitle}>
        {careers.length} selected careers • Avg Career Health {averageCareerHealth(careers)}%
      </Text>
      {readOnlyOfficial && !isSimulation && linkedStudents.length > 1 ? (
        <View style={styles.inlineSelector}>
          <Text style={styles.inlineSelectorTitle}>Active linked student</Text>
          {linkedStudents.map((student) => {
            const active = student.id === studentProfile?.id
            return (
              <TouchableOpacity
                key={student.id}
                style={[styles.studentChoice, active && styles.studentChoiceActive]}
                onPress={() => void switchStudent(student.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.studentChoiceName, active && styles.studentChoiceNameActive]}
                  >
                    {studentName(student)}
                  </Text>
                  <Text style={styles.studentChoiceMeta}>
                    {student.graduation_year
                      ? `Class of ${student.graduation_year}`
                      : 'Graduation year not set'}
                  </Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={ui.primary} /> : null}
              </TouchableOpacity>
            )
          })}
        </View>
      ) : null}

      <Text style={styles.nextAction}>
        {isSimulation
          ? 'Simulation choices stay separate from student tasks, scholarships, and dashboard progress.'
          : nextLifePathAction(careers)}
      </Text>
      {!readOnlyOfficial || isSimulation ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.actionButton]}
            onPress={() =>
              router.push(
                (isSimulation
                  ? '/aura/lifepath/select?mode=parent-simulation'
                  : '/aura/lifepath/select') as never,
              )
            }
          >
            <Text style={styles.secondaryButtonText}>
              {isSimulation ? 'Edit Simulation' : 'Edit Career Choices'}
            </Text>
          </TouchableOpacity>
          {isSimulation ? (
            <TouchableOpacity
              style={[styles.secondaryButton, styles.actionButton]}
              onPress={() => void restartSimulation()}
            >
              <Text style={styles.secondaryButtonText}>Restart</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {isSimulation ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scenario Assumptions</Text>
          {simulationScenarios.length > 1 ? (
            <View style={styles.scenarioList}>
              {simulationScenarios.map((scenario) => (
                <TouchableOpacity
                  key={scenario.id}
                  style={[
                    styles.scenarioPill,
                    scenario.id === activeSimulation?.id && styles.scenarioPillActive,
                  ]}
                  onPress={async () => {
                    setActiveSimulation(scenario)
                    setSimulationTitle(scenario.title || 'Parent Simulation')
                    const nextAssumptions = normalizeParentSimulationAssumptions(
                      scenario.assumptions,
                    )
                    setSimulationAssumptions(nextAssumptions)
                    const ids = await listParentSimulationCareerIdsBySimulation(scenario.id)
                    setCareers(selectedCareersFromIds(ids))
                    setSimulationSummary(
                      scenario.results || calculateParentSimulation(ids, nextAssumptions),
                    )
                  }}
                >
                  <Text style={styles.scenarioPillText}>
                    {scenario.title || 'Simulation'} • {scenario.status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <TextInput
            style={styles.input}
            value={simulationTitle}
            onChangeText={setSimulationTitle}
            placeholder="Scenario name"
          />
          <View style={styles.twoCol}>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() =>
                setSimulationAssumptions({
                  ...simulationAssumptions,
                  pathway: simulationAssumptions.pathway === 'degree' ? 'certification' : 'degree',
                })
              }
            >
              <Text style={styles.choiceLabel}>Pathway</Text>
              <Text style={styles.choiceText}>
                {simulationAssumptions.pathway.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.choiceButton}
              onPress={() =>
                setSimulationAssumptions({
                  ...simulationAssumptions,
                  institution:
                    simulationAssumptions.institution === 'public'
                      ? 'community_college'
                      : simulationAssumptions.institution === 'community_college'
                        ? 'trade_school'
                        : 'public',
                })
              }
            >
              <Text style={styles.choiceLabel}>Route</Text>
              <Text style={styles.choiceText}>
                {simulationAssumptions.institution.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.twoCol}>
            <TextInput
              style={styles.inputHalf}
              keyboardType="numeric"
              value={String(simulationAssumptions.scholarshipsAndGrants)}
              onChangeText={(value) => setAssumptionNumber('scholarshipsAndGrants', value)}
              placeholder="Scholarships"
            />
            <TextInput
              style={styles.inputHalf}
              keyboardType="numeric"
              value={String(simulationAssumptions.familyContribution)}
              onChangeText={(value) => setAssumptionNumber('familyContribution', value)}
              placeholder="Family contribution"
            />
            <TextInput
              style={styles.inputHalf}
              keyboardType="numeric"
              value={String(simulationAssumptions.studentEarnings)}
              onChangeText={(value) => setAssumptionNumber('studentEarnings', value)}
              placeholder="Student earnings"
            />
            <TextInput
              style={styles.inputHalf}
              keyboardType="numeric"
              value={
                simulationAssumptions.expectedBorrowing == null
                  ? ''
                  : String(simulationAssumptions.expectedBorrowing)
              }
              onChangeText={(value) =>
                setSimulationAssumptions({
                  ...simulationAssumptions,
                  expectedBorrowing: value ? Number(value) : null,
                })
              }
              placeholder="Borrowing, optional"
            />
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.actionButton]}
              disabled={savingSimulation}
              onPress={() => void saveSimulation('draft')}
            >
              <Text style={styles.secondaryButtonText}>
                {savingSimulation ? 'Saving...' : 'Save Draft'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButtonSmall, styles.actionButton]}
              disabled={savingSimulation}
              onPress={() => void saveSimulation('completed')}
            >
              <Text style={styles.primaryButtonText}>Complete</Text>
            </TouchableOpacity>
          </View>
          {simulationSummary ? (
            <View style={styles.resultsBox}>
              <Text style={styles.resultText}>
                Average Career Health: {simulationSummary.averageCareerHealthScore}/100
              </Text>
              <Text style={styles.resultText}>
                Estimated total cost: ${simulationSummary.totalEstimatedCost.toLocaleString()}
              </Text>
              <Text style={styles.resultText}>
                Estimated debt: ${simulationSummary.totalEstimatedDebt.toLocaleString()}
              </Text>
            </View>
          ) : null}
          {activeSimulation?.status === 'completed' && studentProfile?.id ? (
            <View style={styles.shareBox}>
              <Text style={styles.cardTitle}>Share with {studentName(studentProfile)}</Text>
              <TextInput
                style={styles.input}
                value={shareMessage}
                onChangeText={setShareMessage}
                placeholder="Optional recommendation note"
              />
              <TouchableOpacity
                style={styles.primaryButtonSmall}
                onPress={() => void shareSimulation()}
              >
                <Text style={styles.primaryButtonText}>Share Read-Only Recommendation</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      {careers.map((career) => (
        <View key={career.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{career.category}</Text>
              <Text style={styles.cardTitle}>{career.title}</Text>
            </View>
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>{career.health.score}</Text>
            </View>
          </View>
          <View style={styles.metaGrid}>
            <Text style={styles.meta}>
              Salary: {formatCurrencyRange(career.startingSalaryMin, career.startingSalaryMax)}
            </Text>
            <Text style={styles.meta}>
              Cost: {formatCurrencyRange(career.estimatedCostMin, career.estimatedCostMax)}
            </Text>
            <Text style={[styles.meta, { color: riskColor(career.debtRisk) }]}>
              Debt risk: {career.debtRisk}
            </Text>
            {career.certifications?.length ? (
              <Text style={styles.meta}>Certification friendly</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.primaryButtonSmall}
            onPress={() =>
              router.push(
                `/aura/lifepath/career/${career.id}${isSimulation ? '?mode=parent-simulation' : readOnlyOfficial ? '?mode=linked-student' : ''}` as never,
              )
            }
          >
            <Text style={styles.primaryButtonText}>View Path</Text>
          </TouchableOpacity>
        </View>
      ))}

      {readOnlyOfficial && !isSimulation && user?.id ? (
        <LifePathFeedbackPanel userId={user.id} role={role} studentProfile={studentProfile} />
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: ui.background,
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backText: { color: ui.primary, fontWeight: '800' },
  kicker: { color: ui.primary, fontWeight: '800', marginBottom: 8 },
  title: { color: ui.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: {
    color: ui.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 14,
  },
  nextAction: {
    color: ui.text,
    backgroundColor: ui.primaryLight,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 12,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonSmall: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryButtonText: { color: colors.white, fontWeight: '800' },
  secondaryButton: {
    borderColor: ui.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: { color: ui.primary, fontWeight: '800' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  actionButton: { flex: 1, minWidth: 145 },
  selectorCard: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    ...shadow.card,
  },
  selectorHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 12 },
  studentList: { gap: 10, marginBottom: 12 },
  studentChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: ui.backgroundSecondary,
  },
  studentChoiceActive: { borderColor: ui.primary, backgroundColor: ui.primaryLight },
  studentChoiceName: { color: ui.text, fontWeight: '900' },
  studentChoiceNameActive: { color: ui.primary },
  studentChoiceMeta: { color: ui.textSecondary, fontSize: 12, marginTop: 2 },
  emptyState: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 12,
  },
  emptyTitle: { color: ui.text, fontWeight: '900' },
  emptyText: { color: ui.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  inlineSelector: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    gap: 10,
    ...shadow.card,
  },
  inlineSelectorTitle: { color: ui.text, fontWeight: '900' },
  optionCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    ...shadow.card,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: ui.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  category: { color: ui.textSecondary, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: ui.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  cardText: { color: ui.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  cardAction: { color: ui.primary, fontWeight: '800', marginTop: 10 },
  scorePill: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ui.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { color: ui.primary, fontSize: 20, fontWeight: '900' },
  metaGrid: { marginTop: 12, gap: 5 },
  meta: { color: ui.textSecondary, fontSize: 13, fontWeight: '600' },
  scenarioList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 10 },
  scenarioPill: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  scenarioPillActive: { borderColor: ui.primary, backgroundColor: ui.primaryLight },
  scenarioPillText: { color: ui.text, fontWeight: '800', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 10,
    color: ui.text,
    backgroundColor: colors.white,
  },
  inputHalf: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: radius.md,
    padding: 12,
    color: ui.text,
    backgroundColor: colors.white,
    flex: 1,
    minWidth: 140,
  },
  twoCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  choiceButton: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: radius.md,
    padding: 12,
    flex: 1,
    minWidth: 140,
  },
  choiceLabel: { color: ui.textSecondary, fontSize: 12, fontWeight: '700' },
  choiceText: { color: ui.text, fontWeight: '900', marginTop: 3, textTransform: 'capitalize' },
  resultsBox: {
    backgroundColor: ui.primaryLight,
    borderRadius: radius.md,
    padding: 12,
    gap: 5,
    marginTop: 12,
  },
  resultText: { color: ui.text, fontWeight: '800' },
  shareBox: { borderTopWidth: 1, borderTopColor: ui.border, marginTop: 16, paddingTop: 12 },
  errorText: { color: colors.error, marginTop: 12, textAlign: 'center' },
  disabled: { opacity: 0.55 },
})
