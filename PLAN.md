# Plan: Migrate AnimPlay server from sql.js (SQLite) to MongoDB (mongoose)

## Goal
Replace the local SQLite (`sql.js`) data layer with MongoDB via mongoose, reading
`MONGO_URI` from environment variables. Preserve all existing REST + Socket.io API
contracts so the existing React client keeps working without changes.

## Key decision: keep NUMERIC ids (no client breakage)
The client (`client/src/services/api.ts`) and socket events use numeric `id`/`quizId`/
`folderId`/`groupId`/`questionId`/`hostId`/`gameId`. To avoid touching the frontend, each
mongoose model stores BOTH the Mongo `_id` (internal) AND a unique auto-incrementing
integer `id` field used as the public id. A small counter model provides the next integer.

## Data model — `server/src/models.ts` (new)
- `Counter`: `{ name, seq }` + `nextId(name)` helper (findOneAndUpdate `$inc`).
- `Host`: `{ id, username, email, password, createdAt }` (username/email unique).
- `Quiz`: `{ id, hostId, title, description, coverImage, isPublic, category, playCount,
  status, isFavorite, folderId, deletedAt, createdAt, updatedAt }`.
- `Question`: `{ id, quizId, questionText, imageUrl, timerSeconds, points,
  pointsMultiplier, sortOrder, correctIndex }`.
- `Answer`: `{ id, questionId, sortIndex, text, color }`.
- `Game`: `{ id, gamePin, quizId, hostId, status, currentQuestion, startedAt, endedAt }`.
- `GameResult`: `{ id, gameId, nickname, score, correct, total, streak, rank }`.
- `Folder`: `{ id, hostId, name }`.
- `Group`: `{ id, ownerId, name, description, inviteCode }` (inviteCode unique).
- `GroupMember`: `{ id, groupId, hostId, role, joinedAt }`.
- `Assignment`: `{ id, groupId, quizId, title, dueDate, createdBy }`.
- `AssignmentCompletion`: `{ id, assignmentId, hostId, completedAt, score }`.

`gameId`/`quizId`/etc. remain stored as **numbers** (the existing integer ids), so socket
and URL params keep working.

## Files to change
1. `server/package.json`: add `mongoose` + `dotenv`; remove `sql.js`; add `@types/...` not
   needed (mongoose ships types). Keep `bcrypt`, `cors`, `express`, `jsonwebtoken`,
   `socket.io`, `uuid`.
2. `server/src/db.ts`: replace sql.js init with `connectDb()` (mongoose.connect) +
   `seedDiscoverContent()` (port existing seed using models) + `disconnectDb()`. Keep
   exporting `getDb` removed; routes import models from `models.ts` directly.
3. `server/src/models.ts`: as above.
4. `server/src/index.ts`: load dotenv; `connectDb().then(...)`; drop `saveDatabase`
   interval + SIGINT file save (keep SIGINT `mongoose.disconnect`).
5. `server/src/routes/auth.ts`: Host model.
6. `server/src/routes/quizzes.ts`: Quiz/Question/Answer models; clone via docs.
7. `server/src/routes/games.ts`: Game model + pin-uniqueness loop.
8. `server/src/routes/discover.ts`: public Quiz queries (`$regex` for search, populate
   creator username, count questions via aggregation/`$size`).
9. `server/src/routes/reports.ts`: Game + GameResult models.
10. `server/src/routes/groups.ts`: Group + GroupMember models.
11. `server/src/routes/learning.ts`: Assignment + AssignmentCompletion models.
12. `server/src/routes/folders.ts`: Folder model + set `quiz.folderId` on assign.
13. `server/src/socket/gameSocket.ts`: load quiz/questions/answers + game via models;
    persist game status + insert GameResult docs on `endGame`.

## Config / secrets (IMPORTANT)
- Add `server/.env.example`: `MONGO_URI=`, `JWT_SECRET=`, `PORT=3001`.
- Add root `.gitignore`: `.env`, `node_modules`, `dist`, `data/`, `*.log`.
- The Atlas password was pasted in chat → **rotate it in MongoDB Atlas**; only put the new
  URI in your local `.env` (never committed). I will NOT commit any real secret.
- Old `data/animplay.db` is abandoned; no row migration (out of scope).

## Verification
- `cd server && npm install && npm run build` (tsc strict) must pass.
- Run with `.env`; smoke test: `/api/health`, register/login, create+clone quiz, start game
  via socket, confirm results persist in Atlas.
- Frontend `client/` is untouched (numeric ids preserved).

## Risks
- No automated tests; verification is manual (build + manual API/socket smoke test).
- Aggregation for `question_count` and `player_count`/`top_score` in reports needs care to
  match prior SQL output shapes.
