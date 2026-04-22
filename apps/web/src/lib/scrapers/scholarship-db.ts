import { createClient } from '@supabase/supabase-js'
import { ScrapedScholarship } from './scholarship-scraper'
import { getSupabaseEnv } from '@mysryear/shared'

export class ScholarshipDB {
  private supabase = (() => {
    const { url, anonKey } = getSupabaseEnv()
    return createClient(url, anonKey)
  })()

  async storeScrapedData(scholarships: ScrapedScholarship[]): Promise<void> {
    await this.supabase
      .from('scraped_scholarships')
      .update({ is_active: false })
      .eq('is_active', true)

    const { error } = await this.supabase.from('scraped_scholarships').insert(
      scholarships.map((s) => ({
        name: s.name,
        amount: s.amount,
        deadline: s.deadline,
        link: s.link,
        state: s.state,
        tags: s.tags,
        source: s.source,
        is_active: true,
      })),
    )

    if (error) throw error
  }

  async getActiveScholarships(): Promise<(ScrapedScholarship & { id: string })[]> {
    const { data, error } = await this.supabase
      .from('scraped_scholarships')
      .select('*')
      .eq('is_active', true)
      .order('scraped_at', { ascending: false })

    if (error) throw error
    return data || []
  }
}
