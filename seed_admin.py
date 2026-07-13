import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os

# Initialize Firebase
cred = credentials.Certificate(os.path.join(os.path.dirname(__file__), "bingo-bot-5c708-firebase-adminsdk-fbsvc-c5d4b699f3.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()

admins = [
    {
        "username": "paradox",
        "password": "12345678",
        "role": "super_admin",
        "displayName": "Paradox",
        "email": "admin@yegarabingo.com",
        "isActive": True,
    },
    {
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "displayName": "Admin",
        "email": "admin2@yegarabingo.com",
        "isActive": True,
    }
]

admins_ref = db.collection("admins")

for admin in admins:
    # Check if already exists
    existing = admins_ref.where("username", "==", admin["username"]).get()
    if list(existing):
        print(f"Admin '{admin['username']}' already exists, skipping.")
        continue

    admin["createdAt"] = datetime.utcnow()
    admins_ref.add(admin)
    print(f"Admin '{admin['username']}' created successfully!")

print("\nDone! Admin users seeded.")
