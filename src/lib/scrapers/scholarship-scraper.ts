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
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('stem') || lowerText.includes('science') || lowerText.includes('technology') || lowerText.includes('engineering') || lowerText.includes('math')) tags.push('STEM');
    if (lowerText.includes('business') || lowerText.includes('entrepreneur')) tags.push('business');
    if (lowerText.includes('art') || lowerText.includes('creative') || lowerText.includes('design')) tags.push('arts');
    if (lowerText.includes('medical') || lowerText.includes('health') || lowerText.includes('nursing')) tags.push('healthcare');
    if (lowerText.includes('education') || lowerText.includes('teaching')) tags.push('education');
    if (lowerText.includes('law') || lowerText.includes('legal')) tags.push('law');
    
    if (lowerText.includes('merit') || lowerText.includes('academic')) tags.push('merit');
    if (lowerText.includes('need') || lowerText.includes('financial')) tags.push('financial need');
    if (lowerText.includes('community') || lowerText.includes('service') || lowerText.includes('volunteer')) tags.push('community service');
    if (lowerText.includes('leadership') || lowerText.includes('leader')) tags.push('leadership');
    if (lowerText.includes('minority') || lowerText.includes('diversity')) tags.push('diversity');
    if (lowerText.includes('first') && lowerText.includes('generation')) tags.push('first-generation');
    if (lowerText.includes('veteran') || lowerText.includes('military')) tags.push('military');
    if (lowerText.includes('women') || lowerText.includes('female')) tags.push('women');
    
    if (lowerText.includes('local') || lowerText.includes('state')) tags.push('local');
    if (lowerText.includes('national') || lowerText.includes('nationwide')) tags.push('national');
    if (lowerText.includes('international') || lowerText.includes('global')) tags.push('international');
    
    if (lowerText.includes('high school') || lowerText.includes('senior')) tags.push('high school');
    if (lowerText.includes('undergraduate') || lowerText.includes('college')) tags.push('undergraduate');
    if (lowerText.includes('graduate') || lowerText.includes('masters') || lowerText.includes('phd')) tags.push('graduate');
    
    return [...new Set(tags)]; // Remove duplicates
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
      const titlePatterns = [
        /<[^>]*class="[^"]*(?:title|scholarship-title|scholarship-name|award-title|grant-title)[^"]*"[^>]*>([^<]+)</gi,
        /<h[1-6][^>]*>([^<]*(?:scholarship|award|grant)[^<]*)</gi,
        /<[^>]*data-testid="[^"]*(?:title|name)[^"]*"[^>]*>([^<]+)</gi,
        /<[^>]*class="[^"]*(?:card-title|item-title|listing-title)[^"]*"[^>]*>([^<]+)</gi
      ];
      
      const amountRegex = /\$[\d,]+(?:\.\d{2})?/g;
      const linkPatterns = [
        /<a[^>]*href="([^"]*(?:scholarship|apply|award|grant)[^"]*)"[^>]*>/gi,
        /<a[^>]*href="([^"]*)"[^>]*>[^<]*(?:scholarship|apply|award|grant)[^<]*<\/a>/gi
      ];
      
      for (const titleRegex of titlePatterns) {
        let titleMatch;
        while ((titleMatch = titleRegex.exec(html)) !== null) {
          const name = titleMatch[1].trim();
          if (name && name.length > 5 && name.length < 200) {
            const contextStart = Math.max(0, titleMatch.index - 800);
            const contextEnd = Math.min(html.length, titleMatch.index + 800);
            const context = html.slice(contextStart, contextEnd);
            
            const amountMatch = context.match(amountRegex);
            
            let linkMatch = null;
            for (const linkRegex of linkPatterns) {
              linkMatch = linkRegex.exec(context);
              if (linkMatch) break;
            }
            
            const deadlinePatterns = [
              /(?:deadline|due|expires?)[:\s]*([A-Za-z]+\s+\d{1,2}(?:,\s*\d{4})?)/gi,
              /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
              /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}/gi
            ];
            
            let deadlineMatch = null;
            for (const deadlineRegex of deadlinePatterns) {
              deadlineMatch = context.match(deadlineRegex);
              if (deadlineMatch) break;
            }
            
            scholarships.push({
              name,
              amount: amountMatch ? amountMatch[0] : null,
              deadline: deadlineMatch ? deadlineMatch[0] : null,
              link: linkMatch ? linkMatch[1] : null
            });
          }
        }
      }
      
      const uniqueScholarships = scholarships.filter((scholarship, index, self) => 
        index === self.findIndex(s => 
          s.name.toLowerCase().trim() === scholarship.name.toLowerCase().trim()
        )
      );
      
      return uniqueScholarships;
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

  async scrapeCollegeBoard(): Promise<ScrapedScholarship[]> {
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      console.log('Scraping College Board...');
      const html = await this.makeRequest('https://bigfuture.collegeboard.org/scholarships-and-grants');
      
      await this.randomDelay(2000, 4000);
      
      const scholarshipMatches = this.extractScholarshipsFromHTML(html);
      
      for (const match of scholarshipMatches.slice(0, 10)) {
        if (match.name && match.link) {
          scholarships.push({
            name: match.name.trim(),
            amount: this.parseAmount(match.amount || '$0'),
            deadline: this.parseDeadline(match.deadline || 'TBD'),
            link: this.normalizeUrl(match.link, 'https://bigfuture.collegeboard.org'),
            source: 'collegeboard',
            tags: this.extractTags(match.name + ' ' + (match.amount || ''))
          });
        }
      }
    } catch (error) {
      console.error('Error scraping College Board:', error);
    }
    
    return scholarships;
  }

  async scrapeScholarshipOwl(): Promise<ScrapedScholarship[]> {
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      console.log('Scraping ScholarshipOwl...');
      const html = await this.makeRequest('https://scholarshipowl.com/awards');
      
      await this.randomDelay(2000, 4000);
      
      const scholarshipMatches = this.extractScholarshipsFromHTML(html);
      
      for (const match of scholarshipMatches.slice(0, 10)) {
        if (match.name && match.link) {
          scholarships.push({
            name: match.name.trim(),
            amount: this.parseAmount(match.amount || '$0'),
            deadline: this.parseDeadline(match.deadline || 'TBD'),
            link: this.normalizeUrl(match.link, 'https://scholarshipowl.com'),
            source: 'scholarshipowl',
            tags: this.extractTags(match.name + ' ' + (match.amount || ''))
          });
        }
      }
    } catch (error) {
      console.error('Error scraping ScholarshipOwl:', error);
    }
    
    return scholarships;
  }

  async scrapeUnigo(): Promise<ScrapedScholarship[]> {
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      console.log('Scraping Unigo...');
      const html = await this.makeRequest('https://www.unigo.com/scholarships');
      
      await this.randomDelay(2000, 4000);
      
      const scholarshipMatches = this.extractScholarshipsFromHTML(html);
      
      for (const match of scholarshipMatches.slice(0, 10)) {
        if (match.name && match.link) {
          scholarships.push({
            name: match.name.trim(),
            amount: this.parseAmount(match.amount || '$0'),
            deadline: this.parseDeadline(match.deadline || 'TBD'),
            link: this.normalizeUrl(match.link, 'https://www.unigo.com'),
            source: 'unigo',
            tags: this.extractTags(match.name + ' ' + (match.amount || ''))
          });
        }
      }
    } catch (error) {
      console.error('Error scraping Unigo:', error);
    }
    
    return scholarships;
  }

  async scrapeNiche(): Promise<ScrapedScholarship[]> {
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      console.log('Scraping Niche...');
      const html = await this.makeRequest('https://www.niche.com/colleges/scholarships/');
      
      await this.randomDelay(2000, 4000);
      
      const scholarshipMatches = this.extractScholarshipsFromHTML(html);
      
      for (const match of scholarshipMatches.slice(0, 10)) {
        if (match.name && match.link) {
          scholarships.push({
            name: match.name.trim(),
            amount: this.parseAmount(match.amount || '$0'),
            deadline: this.parseDeadline(match.deadline || 'TBD'),
            link: this.normalizeUrl(match.link, 'https://www.niche.com'),
            source: 'niche',
            tags: this.extractTags(match.name + ' ' + (match.amount || ''))
          });
        }
      }
    } catch (error) {
      console.error('Error scraping Niche:', error);
    }
    
    return scholarships;
  }

  async scrapeCapitalOne(): Promise<ScrapedScholarship[]> {
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      console.log('Scraping Capital One Scholarships...');
      const html = await this.makeRequest('https://www.capitalone.com/about/community/scholarships/');
      
      await this.randomDelay(2000, 4000);
      
      const scholarshipMatches = this.extractScholarshipsFromHTML(html);
      
      for (const match of scholarshipMatches.slice(0, 5)) {
        if (match.name && match.link) {
          scholarships.push({
            name: match.name.trim(),
            amount: this.parseAmount(match.amount || '$0'),
            deadline: this.parseDeadline(match.deadline || 'TBD'),
            link: this.normalizeUrl(match.link, 'https://www.capitalone.com'),
            source: 'capitalone',
            tags: this.extractTags(match.name + ' ' + (match.amount || ''))
          });
        }
      }
    } catch (error) {
      console.error('Error scraping Capital One:', error);
    }
    
    return scholarships;
  }

  async scrapeAll(): Promise<ScrapedScholarship[]> {
    if (!this.apiKey) {
      console.warn('ScrapingBee API key not configured, skipping scraping');
      return [];
    }
    
    try {
      console.log('Starting comprehensive scholarship scraping...');
      
      const fastwebData = await this.scrapeFastweb();
      await this.randomDelay();
      
      const scholarshipsComData = await this.scrapeScholarshipsCom();
      await this.randomDelay();
      
      const collegeBoardData = await this.scrapeCollegeBoard();
      await this.randomDelay();
      
      const scholarshipOwlData = await this.scrapeScholarshipOwl();
      await this.randomDelay();
      
      const unigoData = await this.scrapeUnigo();
      await this.randomDelay();
      
      const nicheData = await this.scrapeNiche();
      await this.randomDelay();
      
      const capitalOneData = await this.scrapeCapitalOne();
      
      const allScholarships = [
        ...fastwebData,
        ...scholarshipsComData,
        ...collegeBoardData,
        ...scholarshipOwlData,
        ...unigoData,
        ...nicheData,
        ...capitalOneData
      ];
      
      console.log(`Successfully scraped ${allScholarships.length} scholarships from ${7} sources`);
      console.log(`Source breakdown:`, {
        fastweb: fastwebData.length,
        scholarshipsCom: scholarshipsComData.length,
        collegeBoard: collegeBoardData.length,
        scholarshipOwl: scholarshipOwlData.length,
        unigo: unigoData.length,
        niche: nicheData.length,
        capitalOne: capitalOneData.length
      });
      
      return allScholarships;
    } catch (error) {
      console.error('Error in scrapeAll:', error);
      return [];
    }
  }
}
