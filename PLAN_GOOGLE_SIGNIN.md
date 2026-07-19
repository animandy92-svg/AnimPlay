# Google Sign-In Implementation Plan for AnimPlay

## User Feedback
- **Image error**: The current model does not support image input. You cannot upload or process `image.png` through this interface.
- **Account creation difficulty**: Adding Google Sign-In will make account creation much easier.

## Tech Stack
- Backend: Express 4 + Mongoose + JWT + bcrypt
- Frontend: React 18 + Vite + React Router 7 + Tailwind CSS
- No existing OAuth/social login

## Changes Required

### 1. Backend Dependencies
- Add `google-auth-library` to `server/package.json`

### 2. Database Model (`server/src/models.ts`)
- Make `password` optional in `IHost` interface and `hostSchema`
- Add `googleId: { type: String, unique: true, sparse: true }` to `IHost` and schema
- Add `provider: { type: String, default: 'local' }` to `IHost` and schema

### 3. Auth Route (`server/src/routes/auth.ts`)
- Add `POST /api/auth/google` endpoint
- Verify Google ID token server-side using `google-auth-library`
- Extract `sub` (Google user ID), `email`, `name`, `picture`
- If `googleId` exists → log in
- Else if email matches local account → link Google to existing account (upgrade to Google provider)
- Else → create new Host with random username (`g_<googleId>`), no password, provider='google'
- Return same JWT shape `{ token, host: { id, username, email } }`

### 4. Environment Config
- Add `GOOGLE_CLIENT_ID` to `server/.env.example`

### 5. Frontend Dependencies
- Add `@react-oauth/google` to `client/package.json`

### 6. API Service (`client/src/services/api.ts`)
- Add `api.auth.google(idToken)` method

### 7. Login Page (`client/src/pages/Login.tsx`)
- Add Google Sign-In button below the login form
- On success, store token + host in localStorage and navigate to `/dashboard`

### 8. Register Page (`client/src/pages/Register.tsx`)
- Add Google Sign-In button below the register form
- On success, store token + host in localStorage and navigate to `/dashboard`

## Notes
- Google users without a set username will get `g_<googleId>` as username; they can update it later if needed.
- The existing `authenticateToken` middleware requires no changes since JWT format stays the same.
- The user will still need to set up a Google Cloud OAuth Client ID and add it to their `.env`.
