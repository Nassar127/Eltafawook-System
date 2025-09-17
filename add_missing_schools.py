import csv
import os
import sys
from sqlalchemy import create_engine, insert, select
from sqlalchemy.orm import Session
from backend.app.models.school import School
from backend.app.models.branch import Branch

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# --- Configuration ---
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not set in your .env file.")
# --- End Configuration ---

def run_school_seed():
    print("Connecting to the production database...")
    engine = create_engine(DATABASE_URL)
    
    with Session(engine) as db:
        print("Loading existing schools from database...")
        existing_schools_db = db.execute(select(School)).scalars().all()
        # Create a set of lowercase names for fast lookup
        existing_school_names = {s.name.strip().lower() for s in existing_schools_db}
        print(f"Found {len(existing_school_names)} existing schools.")

        # Get the Banha branch ID to set the city
        banha_branch = db.execute(select(Branch).where(Branch.code == 'BAN')).scalar_one()
        if not banha_branch:
            print("ERROR: Banha (BAN) branch not found.")
            return

        csv_school_names = set()
        try:
            with open('backend/students.csv', 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    school_name = row.get("School", "").strip()
                    if school_name: # Only add if the name is not blank
                        csv_school_names.add(school_name)
        except FileNotFoundError:
            print("Error: students.csv not found in 'backend' directory.")
            return

        print(f"Found {len(csv_school_names)} unique school names in CSV.")
        
        # Find which schools are new
        new_school_names = {name for name in csv_school_names if name.lower() not in existing_school_names}

        if not new_school_names:
            print("All schools from the CSV already exist in the database. Nothing to add.")
            return
            
        print(f"Found {len(new_school_names)} new schools to add. Preparing to insert...")
        
        schools_to_insert = []
        for name in new_school_names:
            schools_to_insert.append({
                "name": name,
                "city": banha_branch.name # Assigning all to Banha as requested
            })

        # Insert all new schools at once
        db.execute(insert(School), schools_to_insert)
        db.commit()
        
        print(f"✅ Success! Added {len(new_school_names)} new schools to the database.")

if __name__ == "__main__":
    run_school_seed()