import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")

# Firebase Web Config (for dashboard/frontend)
FIREBASE_CONFIG = {
    "apiKey": os.getenv("FIREBASE_API_KEY"),
    "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
    "projectId": os.getenv("FIREBASE_PROJECT_ID"),
    "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
    "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
    "appId": os.getenv("FIREBASE_APP_ID"),
    "measurementId": os.getenv("FIREBASE_MEASUREMENT_ID"),
}

# Firebase Admin SDK (for Python backend)
private_key = os.getenv("FIREBASE_PRIVATE_KEY", "")
if private_key:
    private_key = private_key.replace("\\n", "\n")

cred = credentials.Certificate({
    "type": os.getenv("FIREBASE_TYPE", "service_account"),
    "project_id": FIREBASE_CONFIG["projectId"],
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
    "private_key": private_key,
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL", ""),
    "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI", "https://accounts.google.com/o/oauth2/auth"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI", "https://oauth2.googleapis.com/token"),
    "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL", "https://www.googleapis.com/oauth2/v1/certs"),
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL", ""),
})

firebase_admin.initialize_app(cred)
db = firestore.client()

# Game settings
DEFAULT_STAKE_10 = int(os.getenv("DEFAULT_STAKE_10", 10))
DEFAULT_STAKE_20 = int(os.getenv("DEFAULT_STAKE_20", 20))
GAME_TIMER_SECONDS = int(os.getenv("GAME_TIMER_SECONDS", 60))
MAX_PLAYERS_PER_GAME = int(os.getenv("MAX_PLAYERS_PER_GAME", 500))
