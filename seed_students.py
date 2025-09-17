import csv
import os
import sys
from sqlalchemy import create_engine, insert, select
from sqlalchemy.orm import Session
from backend.app.models.student import Student
from backend.app.models.school import School
from backend.app.models.branch import Branch

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.utils.phone import normalize_eg_phone
from backend.app.utils.validators import normalize_phone as normalize_phone_search

from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or "localhost" in DATABASE_URL:
    raise ValueError("DATABASE_URL is not set or is pointing to localhost. Please set it to your production Render URL.")


def run_seed():
    print("Connecting to the production database...")
    engine = create_engine(DATABASE_URL)
    
    with Session(engine) as db:
        print("Loading all schools from the database for mapping...")
        schools = db.execute(select(School)).scalars().all()
        school_map = {s.name.strip().lower(): s.id for s in schools}
        print(f"Loaded {len(school_map)} schools into memory.")

        try:
            with open('backend/students.csv', 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                student_data = list(reader)
            print(f"Loaded {len(student_data)} students from students.csv")
        except FileNotFoundError:
            print("Error: students.csv not found. Please place it in the 'backend' directory.")
            return

        students_to_insert = []
        for row in student_data:
            full_name = row.get("sName", "").strip()
            phone = row.get("PhoneNo", "").strip()
            parent_phone = row.get("ParentPhoneNo", "").strip()
            school_name = row.get("School", "").strip()
            gender = row.get("Gender", "male").strip().lower()
            grade = row.get("Grade", "1").strip()
            section = row.get("Section", "science").strip().lower()
            public_id = row.get("StudentID")
            is_allowed = row.get("isAllowed", "0").lower()

            if not full_name or not public_id:
                print(f"Skipping row due to missing Name or StudentID: {row}")
                continue

            school_id = school_map.get(school_name.strip().lower())
            if not school_id:
                print(f"⚠️ Warning: School '{school_name}' not found in database. Skipping student '{full_name}'.")
                continue
            
            # --- NEW FIX: Add leading zero to 10-digit numbers ---
            if len(phone) == 10 and phone.startswith('1'):
                phone = '0' + phone
            
            if len(parent_phone) == 10 and parent_phone.startswith('1'):
                parent_phone = '0' + parent_phone
            # --- END FIX ---

            try:
                phone_e164 = normalize_eg_phone(phone)
                phone_norm = normalize_phone_search(phone)
            except ValueError:
                print(f"⚠️ Warning: Invalid student phone '{row.get('PhoneNo')}' for '{full_name}'. Setting to NULL.")
                phone_e164 = None
                phone_norm = None

            try:
                parent_phone_e164 = normalize_eg_phone(parent_phone)
                parent_phone_norm = normalize_phone_search(parent_phone)
            except ValueError:
                print(f"⚠️ Warning: Invalid parent phone '{row.get('ParentPhoneNo')}' for '{full_name}'. Setting to NULL.")
                parent_phone_e164 = None
                parent_phone_norm = None

            students_to_insert.append({
                "full_name": full_name,
                "phone": phone_e164,
                "phone_norm": phone_norm,
                "parent_phone": parent_phone_e164,
                "parent_phone_norm": parent_phone_norm,
                "school_id": school_id,
                "gender": gender if gender in ['male', 'female'] else 'male',
                "grade": int(grade) if grade.isdigit() else 1,
                "section": section if section in ['science', 'math', 'literature'] else 'science',
                "branch_id": "90d1dd77-b474-45db-9d39-f9e29ad67db8", # Banha Branch
                "whatsapp_opt_in": is_allowed in ['true', 'yes', '-1', '1'],
                "public_id": int(public_id),
            })
        
        if not students_to_insert:
            print("No valid students found to insert.")
            return

        print(f"Preparing to insert {len(students_to_insert)} students into the live database...")
        db.execute(insert(Student), students_to_insert)
        db.commit()

        print("✅ Success! All students have been imported.")

if __name__ == "__main__":
    run_seed()