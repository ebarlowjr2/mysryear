import { NextRequest, NextResponse } from 'next/server';
import { ScholarshipScraper } from '../../../../lib/scrapers/scholarship-scraper';
import { ScholarshipDB } from '../../../../lib/scrapers/scholarship-db';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    console.log('Starting scholarship scraping...');
    const scraper = new ScholarshipScraper();
    const scrapedData = await scraper.scrapeAll();
    
    if (scrapedData.length > 0) {
      const db = new ScholarshipDB();
      await db.storeScrapedData(scrapedData);
      console.log(`Successfully scraped ${scrapedData.length} scholarships`);
    }
    
    return NextResponse.json({ 
      success: true, 
      count: scrapedData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scraping error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
