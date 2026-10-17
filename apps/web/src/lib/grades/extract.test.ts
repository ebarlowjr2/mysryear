import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractReportCard } from './extract'
import { ninthGradeReportCard } from '../../../../../packages/shared/src/__fixtures__/report-card'

vi.mock('./access', () => ({
  GradesError: class extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message)
    }
  },
}))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
function setup() {
  vi.stubEnv('OPENAI_API_KEY', 'test-only-key')
  vi.stubEnv('REPORT_CARD_ANALYSIS_MODEL', 'test-model')
}
describe('report-card extraction service', () => {
  it('fails clearly without provider configuration', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    await expect(extractReportCard(Buffer.from('test'), 'image/jpeg')).rejects.toThrow(
      'not configured',
    )
  })
  it('uses constrained output, disables response storage and returns only a draft', async () => {
    setup()
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          status: 'completed',
          output: [
            { content: [{ type: 'output_text', text: JSON.stringify(ninthGradeReportCard) }] },
          ],
        }),
      )
    vi.stubGlobal('fetch', fetcher)
    expect(await extractReportCard(Buffer.from('test'), 'image/jpeg')).toEqual(ninthGradeReportCard)
    const request = JSON.parse(fetcher.mock.calls[0][1].body)
    expect(request.store).toBe(false)
    expect(request.text.format.strict).toBe(true)
    expect(request.instructions).toContain('untrusted DATA')
    expect(request).not.toHaveProperty('tools')
  })
  it.each([
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] },
    { status: 'completed', output: [{ content: [{ type: 'output_text', text: '{}' }] }] },
    {
      status: 'completed',
      output: [
        {
          content: [
            { type: 'output_text', text: JSON.stringify({ ...ninthGradeReportCard, courses: [] }) },
          ],
        },
      ],
    },
  ])('fails closed for unreadable, partial and refused output %#', async (body) => {
    setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
    await expect(extractReportCard(Buffer.from('test'), 'image/jpeg')).rejects.toThrow()
  })
  it('does not expose provider error details', async () => {
    setup()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ error: 'private upstream details' }, { status: 500 })),
    )
    await expect(extractReportCard(Buffer.from('test'), 'image/jpeg')).rejects.toThrow(
      'temporarily unavailable',
    )
  })
})
