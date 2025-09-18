const { ScholarshipScraper } = require('./src/lib/scrapers/scholarship-scraper.ts');

async function testExpandedScraper() {
  console.log('Testing expanded scholarship scraper...');
  
  const scraper = new ScholarshipScraper();
  
  try {
    console.log('\n=== Testing individual sources ===');
    
    console.log('\n1. Testing College Board...');
    const cbResults = await scraper.scrapeCollegeBoard();
    console.log(`College Board results: ${cbResults.length} scholarships`);
    if (cbResults.length > 0) {
      console.log('Sample:', cbResults[0]);
    }
    
    console.log('\n2. Testing ScholarshipOwl...');
    const soResults = await scraper.scrapeScholarshipOwl();
    console.log(`ScholarshipOwl results: ${soResults.length} scholarships`);
    if (soResults.length > 0) {
      console.log('Sample:', soResults[0]);
    }
    
    console.log('\n3. Testing Unigo...');
    const unigoResults = await scraper.scrapeUnigo();
    console.log(`Unigo results: ${unigoResults.length} scholarships`);
    if (unigoResults.length > 0) {
      console.log('Sample:', unigoResults[0]);
    }
    
    console.log('\n4. Testing Niche...');
    const nicheResults = await scraper.scrapeNiche();
    console.log(`Niche results: ${nicheResults.length} scholarships`);
    if (nicheResults.length > 0) {
      console.log('Sample:', nicheResults[0]);
    }
    
    console.log('\n5. Testing Capital One...');
    const coResults = await scraper.scrapeCapitalOne();
    console.log(`Capital One results: ${coResults.length} scholarships`);
    if (coResults.length > 0) {
      console.log('Sample:', coResults[0]);
    }
    
    console.log('\n=== Testing scrapeAll method ===');
    const allResults = await scraper.scrapeAll();
    console.log(`Total results from scrapeAll: ${allResults.length} scholarships`);
    
    const bySource = {};
    allResults.forEach(s => {
      bySource[s.source] = (bySource[s.source] || 0) + 1;
    });
    console.log('Results by source:', bySource);
    
  } catch (error) {
    console.error('Error testing scraper:', error);
  }
}

testExpandedScraper();
