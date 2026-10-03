# AnimPlay beginner quiz collection

The default library contains eight easy quizzes with 15 questions each (120 total), revised October 3, 2026. Categories are Cars & Symbols, Bible Characters, Countries & Capitals, Countries & Flags, Accounting Standards, Simple Riddles, Animal Pictures, and Everyday General Knowledge.

Every question in a quiz belongs to that quiz's named category. Bible character and capital quizzes have no unrelated picture or chart bonus rounds. All 15 flag and all 15 animal questions have relevant local pictures. Animal pictures are real photographs from Wikimedia Commons. The car quiz includes three simplified badge pictures. Questions have short wording, four choices, one correct answer, and a 30-second timer. Accounting questions cover definitions and standard subject areas with simple examples, rather than calculations.

## Builder and sources

`client/src/data/library.ts` is the current question bank and category list. The quick-start builder accepts a single category and samples 5, 10, or 15 real questions from that bank, preserving answers, pictures, and credits. Unknown or mixed topic requests fail rather than silently drawing from another topic. All audience choices retain easy difficulty. The optional Express AI generator also instructs its model to keep questions easy and entirely within the requested topic.

Original questions are CC BY-SA 4.0. References are attached per question, including Bible passages and official accounting standard pages. Animal photographs retain their individual photographer credits and CC BY/CC BY-SA licenses in `client/src/data/animal-photos.json`, the credits page, and each question. Earlier drawing references in saved copies are upgraded for display. National flags come from FlagCDN / Flagpedia with public-domain designs. Simplified car symbols are identification illustrations; trademarks belong to their owners. Credits and downloadable question data are in `client/public/quiz-sources.html` and `client/public/quiz-library.json`.

## Existing libraries

An atomic transaction installs new quiz IDs 910200–910207 with the per-user `settings/quiz-library-easy-v2` marker. Installation promises are shared across simultaneous reads, and completed installs are not repeated after a refresh. Deletions remain deleted.

`client/src/data/library-v1.ts` retains the earlier collection solely for detecting untouched originals during the upgrade. Exact content comparison retires untouched earlier defaults from normal library lists without deleting their records, so existing quiz links and assignments still work. Edited, favourited, filed and trashed earlier quizzes are preserved. Permanently removed earlier quizzes are not recreated. Editing or restoring a retired quiz makes it visible again. Games already hold their own question snapshots.

## Validation

```powershell
npm test --prefix client
node server/node_modules/tsx/dist/cli.mjs scripts/verify-library.ts
npm run build --prefix client
npm run build --prefix server
```

The verifier checks all eight topics, 120 unique question IDs, valid answers, per-question topic membership, picture paths and document sizes, and regenerates the downloadable JSON. Tests cover topic isolation, builder sampling, pictures, filters, upgrade preservation, one-time installation, deletion across sessions, cloning, and media retention when saving and hosting. Firebase persistence tests use mocks; emulator gameplay tests require the separately configured emulators.

`scripts/build-quiz-media.mjs` refreshes flags, downloads the specifically selected animal photographs, and creates badge illustrations. It retains legacy chart files for existing quizzes. Production startup and builds need no external content services. `scripts/import-quizzes.mjs` is only for maintaining the archived specialist trivia data; it does not feed the beginner collection.
