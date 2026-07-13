# 🚀 Yegara Bingo - Deployment Guide

## Quick Deploy to Render (Recommended)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/yegara-bingo.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click **New +** → **Web Service**
4. Connect your GitHub repo
5. Configure:
   - **Name**: yegara-bingo
   - **Runtime**: Docker
   - **Plan**: Free
6. Add Environment Variables:
   ```
   BOT_TOKEN=8969362242:AAGuXZOrsDndXYbxfq3AMjGZ5QB-bxOxXY8
   FIREBASE_API_KEY=AIzaSyBzemnXChPIBwCSCBIT2TgfMVhYiHc_JrY
   FIREBASE_AUTH_DOMAIN=bingo-bot-5c708.firebaseapp.com
   FIREBASE_PROJECT_ID=bingo-bot-5c708
   FIREBASE_STORAGE_BUCKET=bingo-bot-5c708.firebasestorage.app
   FIREBASE_MESSAGING_SENDER_ID=988357359269
   FIREBASE_APP_ID=1:988357359269:web:eb8ce31819d6853c717f4c
   FIREBASE_MEASUREMENT_ID=G-2P5YYZWKF1
   ```
7. Click **Create Web Service**

### Step 3: Your bot is live!
- **Bot**: t.me/yegarabingobot
- **API**: https://yegara-bingo.onrender.com/api/health
- **Dashboard**: https://yegara-bingo.onrender.com/dashboard/index.html

---

## Alternative: Docker Local

```bash
# Build and run
docker-compose up --build

# Or just build
docker build -t yegara-bingo .
docker run -p 8000:8000 --env-file .env yegara-bingo
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| BOT_TOKEN | Telegram bot token | ✅ Yes |
| FIREBASE_API_KEY | Firebase API key | ✅ Yes |
| FIREBASE_AUTH_DOMAIN | Firebase auth domain | ✅ Yes |
| FIREBASE_PROJECT_ID | Firebase project ID | ✅ Yes |
| FIREBASE_STORAGE_BUCKET | Firebase storage bucket | ✅ Yes |
| FIREBASE_MESSAGING_SENDER_ID | Firebase sender ID | ✅ Yes |
| FIREBASE_APP_ID | Firebase app ID | ✅ Yes |
| FIREBASE_MEASUREMENT_ID | Firebase measurement ID | ✅ Yes |

---

## Troubleshooting

### Bot not responding?
1. Check logs in Render dashboard
2. Verify BOT_TOKEN is correct
3. Check Firebase credentials

### API not accessible?
1. Check if port 8000 is exposed
2. Verify /api/health endpoint
3. Check Render service status

---

## Free Tier Limitations
- Service spins down after 15 min of inactivity
- First request after sleep takes ~30s
- 750 hours/month free

**Upgrade to paid plan for 24/7 availability**
