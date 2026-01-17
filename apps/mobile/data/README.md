# NCES School Data Import

This folder contains scripts and data for importing the National Center for Education Statistics (NCES) public school database into Supabase.

## Files

- `nces_schools_import.sql` - Full import file with ~99,000 public schools (25MB)
- `nces_schools_sample.sql` - Sample file with first ~1,000 schools for testing
- `../scripts/download_nces_schools.py` - Script to regenerate the import file

## Initial Import

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/mrereohvorzxzphggzcl/sql
2. Copy and paste the contents of `nces_schools_import.sql` into the SQL Editor
3. Click "Run" to execute (may take 1-2 minutes for the full file)

Note: The SQL file is 25MB. If the Supabase SQL Editor has issues with the file size, you can:
- Import in batches (split the file by state)
- Use the Supabase CLI: `supabase db execute < nces_schools_import.sql`

## Annual Update Process

NCES releases updated school data each fall. To update:

1. Run the download script:
   ```bash
   cd apps/mobile/scripts
   python3 download_nces_schools.py > ../data/nces_schools_import.sql
   ```

2. Import the new SQL file into Supabase (same as initial import)

The script uses "upsert" logic (INSERT ... ON CONFLICT DO UPDATE), so:
- Existing schools are updated with new data
- New schools are added
- Manually added schools (without nces_id) are preserved
- User memberships are not affected (they link by school UUID, not nces_id)

## Data Source

- **Provider**: Urban Institute Education Data Portal
- **Original Source**: NCES Common Core of Data (CCD)
- **Data Year**: 2023-24
- **Coverage**: All US public schools (elementary, middle, high)
- **Fields**: name, city, state, zip, nces_id

## Switching to Live API (Future)

If you want to switch to real-time API queries instead of imported data:

1. Update `src/data/schools.ts` `searchSchools()` function
2. Call the Urban Institute API: `https://educationdata.urban.org/api/v1/schools/ccd/directory/2023/`
3. Filter by school name using the API's query parameters

The database schema stays the same, so this is a drop-in replacement.
