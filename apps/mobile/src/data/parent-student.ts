// Legacy compatibility wrapper.
// The recovered mobile app originally used parent_student_links. The canonical rebuild model is now:
// student_profiles + family_relationships + student_profile_relationship_invites.
// Do not add new primary logic to parent_student_links.

import {
  acceptRelationshipInvite,
  createRelationshipInvite,
  declineRelationshipInvite,
  getLinkedStudentProfiles,
  requestStudentAccessByProfileId,
  type StudentProfile,
} from './identity'

export type ParentStudentLink = {
  id: string
  parent_user_id: string
  student_user_id: string
  relationship: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type LinkedStudent = {
  id: string
  link_id: string
  user_id: string
  full_name: string | null
  school: string | null
  graduation_year: number | null
  status: 'pending' | 'accepted' | 'declined'
}

function toLinkedStudent(profile: StudentProfile): LinkedStudent {
  return {
    id: profile.id,
    link_id: profile.id,
    user_id: profile.student_user_id || profile.id,
    full_name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
    school: profile.schools?.name || null,
    graduation_year: profile.graduation_year,
    status: 'accepted',
  }
}

export async function getLinkedStudents(parentUserId: string): Promise<LinkedStudent[]> {
  return (await getLinkedStudentProfiles(parentUserId)).map(toLinkedStudent)
}

export async function getPendingLinkRequests(_studentUserId: string): Promise<ParentStudentLink[]> {
  // Pending requests now live in student_profile_relationship_invites and are loaded in identity helpers.
  return []
}

export async function sendLinkRequest(
  parentUserId: string,
  studentProfileId: string,
  relationship?: string,
): Promise<{ success: boolean; error: string | null }> {
  return requestStudentAccessByProfileId({
    userId: parentUserId,
    studentProfileId,
    relationshipRole: relationship === 'guardian' ? 'guardian' : 'parent',
  })
}

export async function respondToLinkRequest(
  linkId: string,
  accept: boolean,
): Promise<{ success: boolean; error: string | null }> {
  return accept ? acceptRelationshipInvite(linkId) : declineRelationshipInvite(linkId)
}

export async function removeLinkRequest(linkId: string): Promise<{ success: boolean; error: string | null }> {
  return declineRelationshipInvite(linkId)
}

export async function getStudentTasks(_studentUserId: string) {
  // Legacy user-owned task reads intentionally disabled for parent links.
  return []
}

export async function getStudentSavedScholarships(_studentUserId: string) {
  // Future sprint: replace with student-profile-owned scholarship saves.
  return []
}

export async function assignTaskToStudent(): Promise<{ success: boolean; error: string | null }> {
  return { success: false, error: 'Parent-assigned tasks must be rebuilt on student_profiles before use.' }
}

export { createRelationshipInvite }
