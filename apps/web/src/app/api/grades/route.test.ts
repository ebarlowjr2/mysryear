import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ninthGradeReportCard } from '../../../../../../packages/shared/src/__fixtures__/report-card'

const mocks = vi.hoisted(() => ({ session: vi.fn(), access: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/grades/access', () => ({
  gradesSession: mocks.session,
  requireGradeAccess: mocks.access,
  UUID: /^[0-9a-f-]{36}$/i,
  GradesError: class extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message)
    }
  },
  gradesError: (error: { message: string; status?: number }) =>
    Response.json({ error: error.message }, { status: error.status || 500 }),
  validatePhoto: vi.fn(),
}))
import { POST } from './route'
const student = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
function request(reviewed = true, data: unknown = ninthGradeReportCard) {
  const form = new FormData()
  form.set('studentId', student)
  form.set('id', id)
  form.set('reviewed', String(reviewed))
  form.set('data', JSON.stringify(data))
  return new Request('http://localhost/api/grades', { method: 'POST', body: form })
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.session.mockResolvedValue({
    db: { rpc: mocks.rpc, from: mocks.from },
    user: { id: 'parent' },
  })
  mocks.access.mockResolvedValue(undefined)
  mocks.from.mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
  })
  mocks.rpc.mockResolvedValue({ data: id, error: null })
})
describe('reviewed report-card save API', () => {
  it('requires explicit review before saving', async () => {
    expect((await POST(request(false))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('rechecks authorization for the explicitly selected student', async () => {
    mocks.access.mockRejectedValue(Object.assign(new Error('Revoked'), { status: 403 }))
    expect((await POST(request())).status).toBe(403)
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('saves normalized grades through the atomic RPC', async () => {
    expect(
      (
        await POST(
          request(true, {
            ...ninthGradeReportCard,
            student_profile_id: 'attacker',
            student_name: 'Private',
          }),
        )
      ).status,
    ).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('save_student_report_card', {
      p_id: id,
      p_student_id: student,
      p_data: ninthGradeReportCard,
      p_source_path: null,
    })
  })
  it('rejects incomplete grades without database writes', async () => {
    expect((await POST(request(true, { ...ninthGradeReportCard, courses: [] }))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('does not claim success when the transaction fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'revoked after photo upload' } })
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect(await response.json()).not.toHaveProperty('ok', true)
  })
  it('returns an existing request result without duplicate writes', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id, student_profile_id: student, created_by_user_id: 'parent' },
          }),
        }),
      }),
    })
    expect((await POST(request())).status).toBe(200)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
