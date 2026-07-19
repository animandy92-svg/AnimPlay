# AnimPlay Deployment Guide

## Prerequisites
- GitHub account
- Firebase account (free)
- Render account (free)
- MongoDB Atlas account (free)

## Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git remote add origin https://github.com/yourusername/animplay.git
git push -u origin main
```

## Step 2: Set Up MongoDB Atlas
1. Go to https://www.mongodb.com/atlas/database
2. Create a free M0 cluster
3. Create a database user (username + password)
4. Whitelist all IPs: `0.0.0.0/0`
5. Get your connection string: `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/animplay_db?retryWrites=true&w=majority`

## Step 3: Deploy Backend to Render
1. Go to https://render.com and sign up
2. Click **New +** → **Blueprint**
3. Connect your GitHub repo
4. Render will detect `render.yaml` and set up the service automatically
5. Update the `MONGO_URI` and `GOOGLE_CLIENT_ID` environment variables in Render dashboard
6. Click **Apply** and wait for deployment

Your backend will be live at: `https://animplay-backend.onrender.com`

**Note:** Render free tier spins down after 15 minutes of inactivity. First request after idle takes ~30 seconds.

## Step 4: Deploy Frontend to Firebase
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Run `firebase login`
3. Run `firebase init hosting` in the project root:
   - Select existing project or create new
   - Set public folder to: `client/dist`
   - Configure as single-page app: No
   - Don't overwrite `index.html`
4. Update `firebase.json` rewrite destination to your actual Render URL:
   ```json
   {
     "hosting": {
       "public": "client/dist",
       "rewrites": [
         { "source": "/api/**", "destination": "https://YOUR-ACTUAL-RENDER-URL.onrender.com/api/$1" },
         { "source": "**", "destination": "/index.html" }
       ]
     }
   }
   ```
5. Build the frontend: `cd client && npm run build`
6. Deploy: `firebase deploy`

Your frontend will be live at: `https://your-project-id.web.app`

## Step 5: Update Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Add your Firebase domain to **Authorized JavaScript origins**:
   - `https://your-project-id.web.app`
   - `https://animplay-backend.onrender.com` (if using Google Sign-In)
3. Add redirect URIs if needed

## Step 6: Test
1. Open your Firebase URL
2. Register a new account
3. Host a game and share the PIN
4. Open in another browser/incognito to join as player

## Environment Variables Summary

### Render (Backend)
| Variable | Value |
|----------|-------|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Random long string |
| `GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `PORT` | 3001 |

### Firebase (Frontend)
Set in `client/.env` before building:
| Variable | Value |
|----------|-------|
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID |
| `VITE_SOCKET_URL` | `https://animplay-backend.onrender.com` |

## Troubleshooting
- **CORS errors:** Ensure Render backend allows your Firebase domain (CORS is already set to `*` in code)
- **Socket.io won't connect:** Check that `VITE_SOCKET_URL` matches your Render URL exactly
- **MongoDB connection failed:** Check Atlas IP whitelist and credentials
- **Google Sign-In fails:** Verify Client ID matches in both backend and frontend
