# scripts/create_user.py
import sys
import os
from getpass import getpass

# Add project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.db.session import SessionLocal
from backend.app.models.user import User
from backend.app.core.security import get_password_hash
from backend.app.models.branch import Branch

def main():
    db = SessionLocal()
    try:
        print("--- Create Admin User ---")
        username = input("Enter username: ")
        
        # Check if user already exists
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"Error: User '{username}' already exists.")
            return

        password = getpass("Enter password: ")
        password_confirm = getpass("Confirm password: ")

        if password != password_confirm:
            print("Error: Passwords do not match.")
            return

        hashed_password = get_password_hash(password)
        
        # For the first user, we'll make them a global admin
        user = User(
            username=username,
            hashed_password=hashed_password,
            role="admin",
            is_active=True
        )
        
        db.add(user)
        db.commit()
        print(f"\n✅ Admin user '{username}' created successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    main()