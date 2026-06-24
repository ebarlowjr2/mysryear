import { computeAcademicHealth, normalizeGradeLevel, templatesForGrade, type AcademicHealthResult, type GradeLevel } from '@mysryear/shared'
import { supabase } from '../lib/supabase'
import { getActiveStudentProfile } from './identity'

export type UploadedFile = {
  id: string
  student_profile_id: string | null
  uploaded_by_user_id: string | null
  file_name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  upload_context: string | null
  created_at: string
}

export type AcademicRecord = {
  id: string
  student_profile_id: string
  uploaded_file_id: string | null
  uploaded_by_user_id: string | null
  document_type: string | null
  school_year: string | null
  grading_period: string | null
  grade_level: string | null
  gpa: number | null
  notes: string | null
  created_at: string
  updated_at?: string | null
}

export type StudentSuccessTask = {
  id: string
  student_profile_id: string
  title: string
  description: string | null
  grade_level: string | null
  school_year: string | null
  category: string | null
  status: 'not_started' | 'in_progress' | 'done'
  upload_required: boolean | null
  uploaded_file_id: string | null
  created_at: string
  updated_at?: string | null
}

export type StudentSuccessSummary = {
  studentProfileId: string | null
  gradeLevel: GradeLevel
  latestAcademicRecordAt: string | null
  academicRecords: AcademicRecord[]
  uploadedFiles: UploadedFile[]
  tasks: StudentSuccessTask[]
  checklist: { done: number; total: number }
  academicHealth: AcademicHealthResult
  lifepath: { selectedCareersCount: number }
  reportCardStatus: 'updated' | 'missing'
}

export async function getAcademicRecords(studentProfileId: string): Promise<AcademicRecord[]> {
  const { data, error } = await supabase
    .from('academic_records')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    console.warn('Failed to load academic records:', error.message)
    return []
  }
  return (data || []) as AcademicRecord[]
}

export async function getUploadedFiles(studentProfileId: string): Promise<UploadedFile[]> {
  const { data, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })
    .limit(25)

  if (error) {
    console.warn('Failed to load uploaded files:', error.message)
    return []
  }
  return (data || []) as UploadedFile[]
}

async function ensureStudentSuccessTasks(studentProfileId: string, gradeLevel: GradeLevel): Promise<StudentSuccessTask[]> {
  const templates = templatesForGrade(gradeLevel)
  const existing = await supabase
    .from('student_success_tasks')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .limit(200)

  const existingTasks = (existing.data || []) as StudentSuccessTask[]
  const existingByTitle = new Set(existingTasks.map((task) => task.title))
  const toInsert = templates
    .filter((template) => !existingByTitle.has(template.title))
    .map((template) => ({
      student_profile_id: studentProfileId,
      title: template.title,
      description: template.description,
      grade_level: template.grade_level,
      category: template.category,
      upload_required: Boolean(template.upload_required),
      status: 'not_started',
    }))

  if (toInsert.length > 0) {
    await supabase.from('student_success_tasks').insert(toInsert)
  }

  const { data, error } = await supabase
    .from('student_success_tasks')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    console.warn('Failed to load student success tasks:', error.message)
    return existingTasks
  }
  return (data || []) as StudentSuccessTask[]
}

export async function getStudentSuccessSummary(userId: string): Promise<StudentSuccessSummary> {
  const studentProfile = await getActiveStudentProfile(userId)
  if (!studentProfile?.id) {
    const health = computeAcademicHealth({ gpa: null, hasRecentRecord: false, checklistDone: 0, checklistTotal: 0 })
    return {
      studentProfileId: null,
      gradeLevel: '9',
      latestAcademicRecordAt: null,
      academicRecords: [],
      uploadedFiles: [],
      tasks: [],
      checklist: { done: 0, total: 0 },
      academicHealth: health,
      lifepath: { selectedCareersCount: 0 },
      reportCardStatus: 'missing',
    }
  }

  const gradeLevel = normalizeGradeLevel(studentProfile.grade_level || undefined)
  const [academicRecords, uploadedFiles, tasks, interests] = await Promise.all([
    getAcademicRecords(studentProfile.id),
    getUploadedFiles(studentProfile.id),
    ensureStudentSuccessTasks(studentProfile.id, gradeLevel),
    supabase.from('student_career_interests').select('career_id').eq('student_profile_id', studentProfile.id).limit(10),
  ])

  const latestGpa = academicRecords.find((record) => typeof record.gpa === 'number')?.gpa ?? null
  const latestAcademicRecordAt = academicRecords[0]?.created_at ?? null
  const done = tasks.filter((task) => task.status === 'done').length
  const total = tasks.length

  return {
    studentProfileId: studentProfile.id,
    gradeLevel,
    latestAcademicRecordAt,
    academicRecords,
    uploadedFiles,
    tasks,
    checklist: { done, total },
    academicHealth: computeAcademicHealth({
      gpa: latestGpa,
      hasRecentRecord: academicRecords.length > 0,
      checklistDone: done,
      checklistTotal: total,
    }),
    lifepath: { selectedCareersCount: interests.data?.length || 0 },
    reportCardStatus: academicRecords.length > 0 ? 'updated' : 'missing',
  }
}

export async function updateStudentSuccessTaskStatus(
  taskId: string,
  status: StudentSuccessTask['status'],
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('student_success_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
  return { success: !error, error: error?.message || null }
}

export type MobileDocumentType =
  | 'report_card'
  | 'progress_report'
  | 'transcript'
  | 'test_score'
  | 'certification'
  | 'resume'
  | 'general'

export type MobileUploadContext =
  | 'academic_report_card'
  | 'academic_progress_report'
  | 'academic_transcript'
  | 'academic_test_score'
  | 'lifepath_certification'
  | 'student_resume'
  | 'general_document'

export const DOCUMENT_TYPE_OPTIONS: Array<{ value: MobileDocumentType; label: string; context: MobileUploadContext; academic: boolean }> = [
  { value: 'report_card', label: 'Report Card', context: 'academic_report_card', academic: true },
  { value: 'progress_report', label: 'Progress Report', context: 'academic_progress_report', academic: true },
  { value: 'transcript', label: 'Transcript', context: 'academic_transcript', academic: true },
  { value: 'test_score', label: 'Test Score', context: 'academic_test_score', academic: true },
  { value: 'certification', label: 'Certification', context: 'lifepath_certification', academic: false },
  { value: 'resume', label: 'Resume', context: 'student_resume', academic: false },
  { value: 'general', label: 'General Document', context: 'general_document', academic: false },
]

export type UploadStudentDocumentInput = {
  userId: string
  studentProfileId: string
  fileUri: string
  fileName: string
  fileType?: string | null
  fileSize?: number | null
  documentType: MobileDocumentType
  schoolYear?: string | null
  gradingPeriod?: string | null
  gradeLevel?: string | null
  gpa?: number | null
  notes?: string | null
}

function safeFileName(name: string) {
  return (name || 'uploaded.file').replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function uploadContextForDocumentType(documentType: MobileDocumentType): MobileUploadContext {
  return DOCUMENT_TYPE_OPTIONS.find((option) => option.value === documentType)?.context || 'general_document'
}

export function isAcademicDocumentType(documentType: MobileDocumentType) {
  return DOCUMENT_TYPE_OPTIONS.find((option) => option.value === documentType)?.academic || false
}

export async function createAcademicRecordForUpload(input: {
  studentProfileId: string
  uploadedFileId: string
  uploadedByUserId: string
  documentType: MobileDocumentType
  schoolYear?: string | null
  gradingPeriod?: string | null
  gradeLevel?: string | null
  gpa?: number | null
  notes?: string | null
}): Promise<{ record: AcademicRecord | null; error: string | null }> {
  const record = {
    student_profile_id: input.studentProfileId,
    uploaded_file_id: input.uploadedFileId,
    uploaded_by_user_id: input.uploadedByUserId,
    document_type: input.documentType,
    subject: uploadContextForDocumentType(input.documentType),
    school_year: input.schoolYear || null,
    grading_period: input.gradingPeriod || null,
    grade_level: input.gradeLevel || null,
    gpa: typeof input.gpa === 'number' && !Number.isNaN(input.gpa) ? input.gpa : null,
    notes: input.notes || null,
  }

  const { data, error } = await supabase.from('academic_records').insert(record as never).select('*').single()
  if (!error) return { record: data as AcademicRecord, error: null }

  if (/column .*subject.* does not exist/i.test(error.message)) {
    const { subject: _subject, ...withoutSubject } = record
    const retry = await supabase.from('academic_records').insert(withoutSubject as never).select('*').single()
    return { record: (retry.data as AcademicRecord) || null, error: retry.error?.message || null }
  }

  return { record: null, error: error.message }
}

export async function uploadStudentDocument(input: UploadStudentDocumentInput): Promise<{ file: UploadedFile | null; error: string | null }> {
  const context = uploadContextForDocumentType(input.documentType)
  const cleanName = safeFileName(input.fileName)
  const path = `${input.studentProfileId}/${Date.now()}-${cleanName}`

  const response = await fetch(input.fileUri)
  const blob = await response.blob()

  const upload = await supabase.storage
    .from('user-uploads')
    .upload(path, blob, { contentType: input.fileType || undefined, upsert: false })

  if (upload.error) return { file: null, error: upload.error.message }

  const metadata = await supabase
    .from('uploaded_files')
    .insert({
      user_id: input.userId,
      student_profile_id: input.studentProfileId,
      uploaded_by_user_id: input.userId,
      file_name: input.fileName,
      file_path: path,
      file_type: input.fileType || null,
      file_size: input.fileSize || null,
      upload_context: context,
    })
    .select('*')
    .single()

  if (metadata.error) {
    await supabase.storage.from('user-uploads').remove([path])
    return { file: null, error: metadata.error.message }
  }

  const file = metadata.data as UploadedFile
  if (isAcademicDocumentType(input.documentType)) {
    const academic = await createAcademicRecordForUpload({
      studentProfileId: input.studentProfileId,
      uploadedFileId: file.id,
      uploadedByUserId: input.userId,
      documentType: input.documentType,
      schoolYear: input.schoolYear,
      gradingPeriod: input.gradingPeriod,
      gradeLevel: input.gradeLevel,
      gpa: input.gpa,
      notes: input.notes,
    })
    if (academic.error) console.warn('Document uploaded but academic record insert failed:', academic.error)
  }

  return { file, error: null }
}

export async function listStudentDocuments(studentProfileId: string): Promise<UploadedFile[]> {
  return getUploadedFiles(studentProfileId)
}

export async function deleteStudentDocument(fileId: string): Promise<{ success: boolean; error: string | null }> {
  const existing = await supabase.from('uploaded_files').select('id,file_path').eq('id', fileId).single()
  if (existing.error || !existing.data) return { success: false, error: existing.error?.message || 'File not found' }

  const storage = await supabase.storage.from('user-uploads').remove([existing.data.file_path])
  if (storage.error) return { success: false, error: storage.error.message }

  const deleted = await supabase.from('uploaded_files').delete().eq('id', fileId)
  return { success: !deleted.error, error: deleted.error?.message || null }
}
