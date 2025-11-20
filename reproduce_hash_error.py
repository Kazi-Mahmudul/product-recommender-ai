from passlib.context import CryptContext
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "testpassword"
# Simulate the fallback hash from app/utils/auth.py
fallback_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()

print(f"Fallback hash: {fallback_hash}")

try:
    result = pwd_context.verify(password, fallback_hash)
    print(f"Verification result: {result}")
except Exception as e:
    print(f"Verification failed with error: {str(e)}")
