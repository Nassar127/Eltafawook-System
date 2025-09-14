from passlib.context import CryptContext
import getpass

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

if __name__ == "__main__":
    password = getpass.getpass("Enter the new password you want to use: ")
    hashed_password = get_password_hash(password)
    print("\n✅ Your new hashed password is:\n")
    print(hashed_password)
    print("\nCopy the line above and paste it into the database.")