#!/usr/bin/env python3
"""
Download NCES public school data from Urban Institute Education Data Portal
and generate SQL for importing into Supabase schools table.

Usage: python download_nces_schools.py > schools_import.sql
"""

import json
import urllib.request
import sys
import time

BASE_URL = "https://educationdata.urban.org/api/v1/schools/ccd/directory/2023/"

# All US state FIPS codes
STATES = [
    1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41,
    42, 44, 45, 46, 47, 48, 49, 50, 51, 53, 54, 55, 56,
    # Territories
    60, 66, 69, 72, 78
]

# FIPS to state abbreviation mapping
FIPS_TO_STATE = {
    1: 'AL', 2: 'AK', 4: 'AZ', 5: 'AR', 6: 'CA', 8: 'CO', 9: 'CT', 10: 'DE',
    11: 'DC', 12: 'FL', 13: 'GA', 15: 'HI', 16: 'ID', 17: 'IL', 18: 'IN',
    19: 'IA', 20: 'KS', 21: 'KY', 22: 'LA', 23: 'ME', 24: 'MD', 25: 'MA',
    26: 'MI', 27: 'MN', 28: 'MS', 29: 'MO', 30: 'MT', 31: 'NE', 32: 'NV',
    33: 'NH', 34: 'NJ', 35: 'NM', 36: 'NY', 37: 'NC', 38: 'ND', 39: 'OH',
    40: 'OK', 41: 'OR', 42: 'PA', 44: 'RI', 45: 'SC', 46: 'SD', 47: 'TN',
    48: 'TX', 49: 'UT', 50: 'VT', 51: 'VA', 53: 'WA', 54: 'WV', 55: 'WI',
    56: 'WY', 60: 'AS', 66: 'GU', 69: 'MP', 72: 'PR', 78: 'VI'
}

def escape_sql(s):
    """Escape single quotes for SQL"""
    if s is None:
        return None
    return str(s).replace("'", "''")

def fetch_schools_for_state(fips):
    """Fetch all schools for a given state FIPS code"""
    url = f"{BASE_URL}?fips={fips}"
    try:
        with urllib.request.urlopen(url, timeout=120) as response:
            data = json.loads(response.read().decode())
            return data.get('results', [])
    except Exception as e:
        print(f"-- Error fetching state {fips}: {e}", file=sys.stderr)
        return []

def main():
    print("-- NCES Public School Data Import")
    print("-- Generated from Urban Institute Education Data Portal")
    print("-- Source: Common Core of Data (CCD) 2023-24")
    print("-- Run this SQL in Supabase SQL Editor")
    print("")
    print("-- Step 1: Add unique constraint on nces_id if it doesn't exist")
    print("DO $$ BEGIN")
    print("  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schools_nces_id_key') THEN")
    print("    ALTER TABLE schools ADD CONSTRAINT schools_nces_id_key UNIQUE (nces_id);")
    print("  END IF;")
    print("END $$;")
    print("")
    print("-- Step 2: Insert/update schools (upsert)")
    print("-- This preserves manually added schools (those without nces_id)")
    
    total_schools = 0
    
    for fips in STATES:
        state_abbr = FIPS_TO_STATE.get(fips, f"FIPS{fips}")
        print(f"-- Fetching {state_abbr}...", file=sys.stderr)
        
        schools = fetch_schools_for_state(fips)
        
        for school in schools:
            # Skip schools without a name or that are closed
            if not school.get('school_name') or school.get('school_status') != 1:
                continue
            
            nces_id = school.get('ncessch')
            name = escape_sql(school.get('school_name'))
            city = escape_sql(school.get('city_location'))
            state = FIPS_TO_STATE.get(school.get('fips'), escape_sql(school.get('state_location')))
            zip_code = escape_sql(school.get('zip_location'))
            
            if not nces_id or not name:
                continue
            
            # Build INSERT statement
            print(f"INSERT INTO schools (name, city, state, zip, nces_id) VALUES ('{name}', '{city}', '{state}', '{zip_code}', '{nces_id}') ON CONFLICT (nces_id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, state = EXCLUDED.state, zip = EXCLUDED.zip;")
            
            total_schools += 1
        
        print(f"-- {state_abbr}: {len(schools)} schools fetched", file=sys.stderr)
        time.sleep(0.5)  # Be nice to the API
    
    print("")
    print(f"-- Total schools imported: {total_schools}")
    print(f"-- Import complete!", file=sys.stderr)
    print(f"-- Total schools: {total_schools}", file=sys.stderr)

if __name__ == "__main__":
    main()
