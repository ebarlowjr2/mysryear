import { Builder, By, WebDriver, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';

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
  private driver: WebDriver | null = null;

  async initDriver(): Promise<void> {
    const options = new chrome.Options();
    options.addArguments(
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    this.driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  }

  async closeDriver(): Promise<void> {
    if (this.driver) {
      await this.driver.quit();
      this.driver = null;
    }
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
    if (!this.driver) throw new Error('Driver not initialized');
    
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      await this.driver.get('https://www.fastweb.com/college-scholarships');
      
      await this.driver.wait(until.titleContains('Scholarships'), 30000);
      await this.randomDelay(3000, 6000);
      
      const scholarshipElements = await this.driver.findElements(By.css('.scholarship-item, .result-item, .search-result'));
      
      for (const element of scholarshipElements.slice(0, 20)) {
        try {
          const nameEl = await element.findElement(By.css('.title, h3, .scholarship-title')).catch(() => null);
          const amountEl = await element.findElement(By.css('.amount, .award, .scholarship-amount')).catch(() => null);
          const deadlineEl = await element.findElement(By.css('.deadline, .due-date, .scholarship-deadline')).catch(() => null);
          const linkEl = await element.findElement(By.css('a')).catch(() => null);
          
          if (nameEl && linkEl) {
            const name = await nameEl.getText();
            const amount = amountEl ? await amountEl.getText() : '$0';
            const deadline = deadlineEl ? await deadlineEl.getText() : 'TBD';
            const link = await linkEl.getAttribute('href');
            
            scholarships.push({
              name: name.trim(),
              amount: this.parseAmount(amount),
              deadline: this.parseDeadline(deadline),
              link: link,
              source: 'fastweb',
              tags: this.extractTags(name + ' ' + amount)
            });
          }
        } catch (err) {
          console.warn('Failed to parse scholarship element:', err);
        }
      }
    } catch (error) {
      console.error('Error scraping Fastweb:', error);
    }
    
    return scholarships;
  }

  async scrapeScholarshipsCom(): Promise<ScrapedScholarship[]> {
    if (!this.driver) throw new Error('Driver not initialized');
    
    const scholarships: ScrapedScholarship[] = [];
    
    try {
      await this.driver.get('https://www.scholarships.com/financial-aid/college-scholarships');
      
      await this.driver.wait(until.titleContains('Scholarships'), 30000);
      await this.randomDelay(3000, 6000);
      
      const scholarshipElements = await this.driver.findElements(By.css('.scholarship-item, .result-item, .search-result'));
      
      for (const element of scholarshipElements.slice(0, 20)) {
        try {
          const nameEl = await element.findElement(By.css('.title, h3, .scholarship-title')).catch(() => null);
          const amountEl = await element.findElement(By.css('.amount, .award, .scholarship-amount')).catch(() => null);
          const deadlineEl = await element.findElement(By.css('.deadline, .due-date, .scholarship-deadline')).catch(() => null);
          const linkEl = await element.findElement(By.css('a')).catch(() => null);
          
          if (nameEl && linkEl) {
            const name = await nameEl.getText();
            const amount = amountEl ? await amountEl.getText() : '$0';
            const deadline = deadlineEl ? await deadlineEl.getText() : 'TBD';
            const link = await linkEl.getAttribute('href');
            
            scholarships.push({
              name: name.trim(),
              amount: this.parseAmount(amount),
              deadline: this.parseDeadline(deadline),
              link: link,
              source: 'scholarships.com',
              tags: this.extractTags(name + ' ' + amount)
            });
          }
        } catch (err) {
          console.warn('Failed to parse scholarship element:', err);
        }
      }
    } catch (error) {
      console.error('Error scraping Scholarships.com:', error);
    }
    
    return scholarships;
  }

  async scrapeAll(): Promise<ScrapedScholarship[]> {
    await this.initDriver();
    
    try {
      const fastwebData = await this.scrapeFastweb();
      await this.randomDelay();
      
      const scholarshipsComData = await this.scrapeScholarshipsCom();
      
      return [...fastwebData, ...scholarshipsComData];
    } finally {
      await this.closeDriver();
    }
  }
}
