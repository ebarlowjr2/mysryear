export interface ScrapedScholarship {
  name: string;
  amount: string;
  deadline: string;
  link: string;
  state?: string | null;
  tags?: string[];
  source: string;
}

export class ScholarshipScraper {
  private apiKey: string;
  private baseUrl = 'https://app.scrapingbee.com/api/v1/';

  constructor() {
    this.apiKey = process.env.SCRAPINGBEE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('SCRAPINGBEE_API_KEY not found, scraping will fail');
    }
  }

  private async makeRequest(url: string, options: Record<string, string> = {}): Promise<string> {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      url: url,
      render_js: 'true',
      wait: '3000',
      premium_proxy: 'true',
      country_code: 'us',
      ...options
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`ScrapingBee API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.text();
  }

  private async randomDelay(min: number = 2000, max: number = 5000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private parseAmount(amountText: string): string {
    const match = amountText.match(/\$[\d,]+/);
    return match ? match[0] : '$0';
  }

  private parseDeadline(deadlineText: string): string {
    const dateMatch = deadlineText.match(/(\w+)\s+(\d{1,2})/);
    if (dateMatch) {
      const [, month, day] = dateMatch;
      return `${month} ${day}`;
    }
    return deadlineText.trim();
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
    if (text.toLowerCase().includes('stem')) tags.push('STEM');
    if (text.toLowerCase().includes('merit')) tags.push('merit');
    if (text.toLowerCase().includes('need')) tags.push('financial need');
    if (text.toLowerCase().includes('community')) tags.push('community');
    if (text.toLowerCase().includes('leadership')) tags.push('leadership');
    return tags;
  }

  async scrapeFastweb(): Promise<ScrapedScholarship[]> {
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      console.log('Scraping Fastweb...');
      const html = await this.makeRequest('https://www.fastweb.com/college-scholarships');
      
      await this.randomDelay(2000, 4000);
      
      const scholarshipMatches = this.extractScholarshipsFromHTML(html);
      
      for (const match of scholarshipMatches.slice(0, 15)) {
        if (match.name && match.link) {
          scholarships.push({
            name: match.name.trim(),
            amount: this.parseAmount(match.amount || '$0'),
            deadline: this.parseDeadline(match.deadline || 'TBD'),
            link: this.normalizeUrl(match.link, 'https://www.fastweb.com'),
            source: 'fastweb',
            tags: this.extractTags(match.name + ' ' + (match.amount || ''))
          });
        }
      }
    } catch (error) {
      console.error('Error scraping Fastweb:', error);
    }
    
    return scholarships;
  }

  async scrapeScholarshipsCom(): Promise<ScrapedScholarship[]> {
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      console.log('Scraping Scholarships.com...');
      const html = await this.makeRequest('https://www.scholarships.com/financial-aid/college-scholarships');
      
      await this.randomDelay(2000, 4000);
      
      const scholarshipMatches = this.extractScholarshipsFromHTML(html);
      
      for (const match of scholarshipMatches.slice(0, 15)) {
        if (match.name && match.link) {
          scholarships.push({
            name: match.name.trim(),
            amount: this.parseAmount(match.amount || '$0'),
            deadline: this.parseDeadline(match.deadline || 'TBD'),
            link: this.normalizeUrl(match.link, 'https://www.scholarships.com'),
            source: 'scholarships.com',
            tags: this.extractTags(match.name + ' ' + (match.amount || ''))
          });
        }
      }
    } catch (error) {
      console.error('Error scraping Scholarships.com:', error);
    }
    
    return scholarships;
  }

  private extractScholarshipsFromHTML(html: string): Array<{name: string; amount: string | null; deadline: string | null; link: string | null}> {
    const scholarships: Array<{name: string; amount: string | null; deadline: string | null; link: string | null}> = [];
    
    try {
      const titleRegex = /<[^>]*class="[^"]*(?:title|scholarship-title|scholarship-name)[^"]*"[^>]*>([^<]+)</gi;
      const amountRegex = /\$[\d,]+(?:\.\d{2})?/g;
      const linkRegex = /<a[^>]*href="([^"]*(?:scholarship|apply)[^"]*)"[^>]*>/gi;
      
      let titleMatch;
      while ((titleMatch = titleRegex.exec(html)) !== null) {
        const name = titleMatch[1].trim();
        if (name && name.length > 5) {
          const contextStart = Math.max(0, titleMatch.index - 500);
          const contextEnd = Math.min(html.length, titleMatch.index + 500);
          const context = html.slice(contextStart, contextEnd);
          
          const amountMatch = context.match(amountRegex);
          const linkMatch = linkRegex.exec(context);
          
          scholarships.push({
            name,
            amount: amountMatch ? amountMatch[0] : null,
            deadline: null,
            link: linkMatch ? linkMatch[1] : null
          });
        }
      }
    } catch (error) {
      console.warn('Error parsing HTML:', error);
    }
    
    return scholarships;
  }

  private normalizeUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return baseUrl + url;
    return baseUrl + '/' + url;
  }

  async scrapeAll(): Promise<ScrapedScholarship[]> {
    if (!this.apiKey) {
      console.warn('ScrapingBee API key not configured, skipping scraping');
      return [];
    }
    
    try {
      const fastwebData = await this.scrapeFastweb();
      await this.randomDelay();
      
      const scholarshipsComData = await this.scrapeScholarshipsCom();
      
      const allScholarships = [...fastwebData, ...scholarshipsComData];
      console.log(`Successfully scraped ${allScholarships.length} scholarships`);
      
      return allScholarships;
    } catch (error) {
      console.error('Error in scrapeAll:', error);
      return [];
    }
  }
}
