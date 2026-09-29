# AnimPlay quiz collection

The My Quizzes workspace installs 30 editable quizzes for each signed-in host: ten text-only quizzes with 15 questions, ten picture quizzes with 17 questions, and ten diagram quizzes with 17 questions. The total is 490 questions across ten subjects.

## Content and provenance

- `client/src/data/internet-questions.json`: 450 distinct questions imported from Open Trivia Database on September 29, 2026 (CC BY-SA 4.0).
- `client/src/data/library.ts`: deterministic quiz IDs, shuffled answer positions, source metadata, and 40 original visual questions.
- `client/public/quiz-media`: ten FlagCDN national flag PNGs and ten original SVG survey charts. Survey data is fictional.
- `client/public/quiz-sources.html`: visible source and licensing information.
- `client/public/quiz-library.json`: downloadable adapted collection, also CC BY-SA 4.0.

Every question has a source record. Imported trivia is community-sourced, and hosts can preview and edit answers before playing. Structural validation does not independently fact-check every source answer.

## Persistence

The Firebase client installs the collection in an atomic transaction with a per-user `settings/quiz-library-v1` marker. Concurrent calls share the installation promise. The marker ensures edits, trash, and permanent deletions are respected on later visits. Existing user-created quizzes are retained. No admin migration or Firestore rule changes are required.

Quiz saving updates the complete question list in one write, preserving question IDs, image/diagram metadata and source credits. Live game payloads include media for both host and player screens.

## Validation and maintenance

```powershell
npm test --prefix client
node server/node_modules/tsx/dist/cli.mjs scripts/verify-library.ts
npm run build --prefix client
```

The verifier checks collection size, unique imported questions and IDs, answer indices, media presence, document sizes, and attribution, and regenerates the downloadable JSON. Tests cover filtering, favorites, previews, one-time installation, preservation of existing quizzes, deletion across sessions, cloning and media retention when saving and hosting. Persistence tests mock Firebase; they do not create production accounts or games.

`scripts/import-quizzes.mjs` is an explicit, resumable internet import with rate-limit delays. `scripts/build-quiz-media.mjs` refreshes flag files and recreates chart SVGs. Normal application startup and production builds do not request either external content service.

Deploy the built frontend using the repository's configured Firebase project:

```powershell
firebase deploy --only hosting --project animplay-872d3
```
