# Gameplay update and verification

## Delivered

- Classic speed scoring, Accuracy scoring, and Relaxed rounds without a countdown.
- Extra thinking time, optional shared rankings, optional teams, keyboard answers, and read-aloud controls.
- Solo practice, explanations, personal answer reviews, and detailed host reports with CSV export.
- Atomic PIN and nickname reservations, saved seats, refresh recovery, single accepted answers, and scoring once per round.
- Host-only answer keys and Firestore rules preventing player score changes.

## Verification (October 1, 2026)

- Unit/UI suite: 16 passing tests, including report CSV generation and formula escaping.
- Firebase Auth and Firestore emulator suite: seven passing integration tests using actual SDK clients and security rules.
- Integration coverage: separate host/player identities, concurrent nickname claims, teams, refresh/reconnect, scoring, private answer keys, score tampering, typed-answer review, invalid PINs, late joins, duplicate advancement, expired rounds, and nickname-based seat recovery.
- Browser walkthrough: host registration, included quiz hosting, Relaxed mode, team creation and selection, join link, player refresh, two rounds, host refresh, retained scores, early finish, and learning report.
- The player recap and missed-answer filter were checked at a phone-sized viewport with no horizontal overflow. Browser download-event capture timed out; CSV generation and the download filename were verified in the component test.
- Production build succeeds. Vite reports the existing large Firebase bundle warning.

## Run locally

Install client dependencies with `npm ci` in `client`. Start the Firebase Auth and Firestore emulators from the repository root using the Firebase CLI:

```powershell
firebase emulators:start --only auth,firestore --project demo-animplay
```

In another PowerShell terminal:

```powershell
cd client
$env:VITE_USE_FIREBASE_EMULATORS = 'true'
npm run dev
```

For integration tests, leave the emulators running:

```powershell
cd client
$env:ANIMPLAY_EMULATOR_TESTS = '1'
npm test -- tests/game-session.emulator.test.ts
```

The normal `npm test` command skips the emulator suite unless that flag is set. The emulator flag in the frontend only applies to development builds.

## Release requirements and limits

These changes are local and have not been deployed. Deploy the frontend and `firestore.rules` together during a break between games. New game documents use version 2 and private answer-key documents; restart rooms created by the previous client after rollout.

The host browser coordinates timers and scoring. Keep its tab open; refreshing restores the room. A closed or disconnected host must return for rounds to continue. Server-owned game orchestration would be needed to remove this dependency.

The room limit is 100 players. This update has functional checks with a small number of clients, not a 100-player load benchmark. Production network behaviour and target devices still require a release smoke check.
