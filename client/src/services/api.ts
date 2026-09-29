import { QUIZ_LIBRARY_WITH_TOPICS } from '../data/library';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { auth, createUsernameAccount, db, isHostAccount, requireUser, waitForAuth } from './firebase';

type AnyRecord = Record<string, any>;

const now = () => new Date().toISOString();
const makeId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);
const inviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

function friendlyError(error: any): Error {
  const code = String(error?.code || '');
  const messages: Record<string, string> = {
    'auth/configuration-not-found': 'Sign-in is not configured yet. Please contact the site administrator.',
    'auth/admin-restricted-operation': 'Guest host accounts are disabled by the Firebase project administrator. Please contact the site administrator to enable account creation.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact the site administrator.',
    'auth/email-already-in-use': 'An account already exists for that email.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'permission-denied': 'You do not have permission to do that.',
  };
  return new Error(messages[code] || error?.message || 'Something went wrong. Please try again.');
}

async function userContext() {
  const user = await requireUser();
  if (!await isHostAccount(user)) throw new Error('Please register a username to continue.');
  return user;
}

async function syncHost(user: NonNullable<typeof auth.currentUser>, username?: string) {
  const host = {
    id: user.uid,
    username: username || user.displayName || user.email?.split('@')[0] || 'Host',
    email: user.email || '',
    picture: user.photoURL || null,
    isHost: true,
    created_at: user.metadata.creationTime || now(),
  };
  await setDoc(doc(db, 'users', user.uid), host, { merge: true });
  localStorage.setItem('animplay_token', await user.getIdToken());
  localStorage.setItem('animplay_host', JSON.stringify(host));
  return host;
}

function normalizeQuiz(id: number, raw: AnyRecord): AnyRecord {
  const questions = Array.isArray(raw.questions) ? raw.questions : [];
  return {
    id,
    ...raw,
    hostId: raw.hostId || raw.ownerUid,
    is_public: Boolean(raw.isPublic),
    is_favorite: raw.isFavorite ? 1 : 0,
    deleted_at: raw.deletedAt || null,
    created_at: raw.createdAt || raw.created_at || now(),
    updated_at: raw.updatedAt || raw.updated_at || now(),
    play_count: raw.playCount || 0,
    question_count: questions.length,
    questions: questions.map((question: AnyRecord, index: number) => ({
      id: question.id,
      quizId: id,
      question_text: question.question_text || question.questionText,
      questionText: question.question_text || question.questionText,
      timer_seconds: question.timer_seconds || question.timerSeconds || 20,
      timerSeconds: question.timer_seconds || question.timerSeconds || 20,
      points: question.points ?? 1000,
      correct_index: question.correct_index ?? question.correctIndex ?? 0,
      correctIndex: question.correct_index ?? question.correctIndex ?? 0,
      questionType: question.questionType || 'multiple_choice',
      sortOrder: question.sortOrder ?? index,
      answers: question.answers || [],
      ...(question.media ? { media: question.media } : {}),
      ...(question.source ? { source: question.source } : {}),
    })),
  };
}

const STARTER_QUIZZES = QUIZ_LIBRARY_WITH_TOPICS;
// Atomic marker + deterministic IDs make installation safe across tabs and retries.
// A permanent deletion stays deleted; the collection is only installed once per user.
const libraryInstalls = new Map<string, Promise<void>>();
async function ensureLibrary(uid: string) {
  if (!libraryInstalls.has(uid)) {
    const install = runTransaction(db, async transaction => {
      const marker = doc(db, 'users', uid, 'settings', 'quiz-library-v1');
      const topicsMarker = doc(db, 'users', uid, 'settings', 'quiz-topics-v1');
      const topicQuizzes = QUIZ_LIBRARY_WITH_TOPICS.slice(30);
      const [libraryInstalled, topicsInstalled, ...topicSnapshots] = await Promise.all([
        transaction.get(marker), transaction.get(topicsMarker),
        ...topicQuizzes.map(quiz => transaction.get(doc(db, 'users', uid, 'quizzes', String(quiz.id)))),
      ]);
      const timestamp = now();
      if (!libraryInstalled.exists()) for (const quiz of QUIZ_LIBRARY_WITH_TOPICS.slice(0, 30)) {
        transaction.set(doc(db, 'users', uid, 'quizzes', String(quiz.id)), {
          ...quiz, ownerUid: uid, creatorName: quiz.creator_name, isPublic: false,
          isFavorite: false, folderId: null, deletedAt: null, playCount: 0,
          createdAt: timestamp, updatedAt: timestamp,
        });
      }
      if (!topicsInstalled.exists()) {
        topicQuizzes.forEach((quiz, index) => {
          if (!topicSnapshots[index].exists()) transaction.set(doc(db, 'users', uid, 'quizzes', String(quiz.id)), {
            ...quiz, ownerUid: uid, creatorName: quiz.creator_name, isPublic: false,
            isFavorite: false, folderId: null, deletedAt: null, playCount: 0,
            createdAt: timestamp, updatedAt: timestamp,
          });
        });
        transaction.set(topicsMarker, { installedAt: timestamp, count: 3 });
      }
      if (!libraryInstalled.exists()) transaction.set(marker, { installedAt: timestamp, count: 30 });
    }).catch(error => { libraryInstalls.delete(uid); throw error; });
    libraryInstalls.set(uid, install);
  }
  await libraryInstalls.get(uid);
}

async function getOwnedQuiz(id: number) {
  const user = await userContext();
  await ensureLibrary(user.uid);
  const ref = doc(db, 'users', user.uid, 'quizzes', String(id));
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Quiz not found.');
  return { user, ref, raw: snap.data() };
}

export const api: any = {
  auth: {
    register: async (username: string) => {
      try {
        const normalizedUsername = username.trim();
        if (!normalizedUsername) throw new Error('Enter a username.');
        const user = await createUsernameAccount();
        await updateProfile(user, { displayName: normalizedUsername });
        const host = await syncHost(user, normalizedUsername);
        return { token: await user.getIdToken(), host };
      } catch (error) {
        throw friendlyError(error);
      }
    },
    login: async (email: string, password: string) => {
      try {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const host = await syncHost(credential.user);
        return { token: await credential.user.getIdToken(), host };
      } catch (error) {
        throw friendlyError(error);
      }
    },
    google: async () => {
      try {
        const credential = await signInWithPopup(auth, new GoogleAuthProvider());
        const host = await syncHost(credential.user);
        return { token: await credential.user.getIdToken(), host };
      } catch (error) {
        throw friendlyError(error);
      }
    },
    me: async () => {
      const user = await waitForAuth();
      if (!user || !await isHostAccount(user)) throw new Error('Please register a username.');
      return { host: await syncHost(user) };
    },
  },
  quizzes: {
    save: async (id: number | null, title: string, description: string, questions: AnyRecord[]) => {
      const user = await userContext();
      const timestamp = now();
      const nextId = id || makeId();
      const cleanQuestions = questions.map((q, index) => JSON.parse(JSON.stringify({ ...q, id: q.id || makeId() + index, sortOrder: index })));
      const format = cleanQuestions.some(q => q.media?.kind === 'diagram') ? 'diagram' : cleanQuestions.some(q => q.media) ? 'image' : 'text';
      const changes = { title: title.trim(), description: description.trim(), questions: cleanQuestions, format, status: 'published', updatedAt: timestamp };
      if (id) {
        const { ref } = await getOwnedQuiz(id);
        await updateDoc(ref, changes);
      } else {
        await setDoc(doc(db, 'users', user.uid, 'quizzes', String(nextId)), {
          ...changes, id: nextId, ownerUid: user.uid, creatorName: user.displayName || 'Host',
          category: 'general', isPublic: false, isFavorite: false, folderId: null,
          deletedAt: null, playCount: 0, createdAt: timestamp,
        });
      }
      return { quiz: { id: nextId } };
    },
    list: async (tab = 'recent', folderId?: number) => {
      const user = await userContext();
      await ensureLibrary(user.uid);
      const snapshots = await getDocs(collection(db, 'users', user.uid, 'quizzes'));
      let quizzes = snapshots.docs.map(item => normalizeQuiz(Number(item.id), item.data()));
      quizzes = quizzes.filter(item => {
        if (folderId) return !item.deleted_at && item.folderId === folderId;
        if (tab === 'trash') return Boolean(item.deleted_at);
        if (item.deleted_at) return false;
        if (tab === 'drafts') return item.status === 'draft';
        if (tab === 'favorites') return Boolean(item.is_favorite);
        if (tab === 'shared') return false;
        return true;
      });
      quizzes.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
      return { quizzes };
    },
    get: async (id: number) => {
      const { raw } = await getOwnedQuiz(id);
      return { quiz: normalizeQuiz(id, raw) };
    },
    create: async (title: string, description = '') => {
      const user = await userContext();
      const id = makeId();
      const createdAt = now();
      await setDoc(doc(db, 'users', user.uid, 'quizzes', String(id)), {
        id, ownerUid: user.uid, creatorName: user.displayName || 'AnimPlay host',
        title: title.trim(), description: description.trim(), category: 'general', status: 'draft',
        isPublic: false, isFavorite: false, folderId: null, deletedAt: null, playCount: 0,
        questions: [], createdAt, updatedAt: createdAt,
      });
      return { quiz: { id, title, description } };
    },
    update: async (id: number, data: AnyRecord) => {
      const { ref } = await getOwnedQuiz(id);
      const mapped: AnyRecord = { updatedAt: now() };
      if (data.title !== undefined) mapped.title = data.title.trim();
      if (data.description !== undefined) mapped.description = data.description.trim();
      if (data.status !== undefined) mapped.status = data.status;
      if (data.is_public !== undefined) mapped.isPublic = Boolean(data.is_public);
      if (data.isPublic !== undefined) mapped.isPublic = Boolean(data.isPublic);
      if (data.is_favorite !== undefined) mapped.isFavorite = Boolean(data.is_favorite);
      if (data.folderId !== undefined) mapped.folderId = data.folderId || null;
      await updateDoc(ref, mapped);
      return { success: true };
    },
    delete: async (id: number) => {
      const { ref } = await getOwnedQuiz(id);
      await updateDoc(ref, { deletedAt: now(), updatedAt: now() });
      return { success: true };
    },
    permanentDelete: async (id: number) => {
      const { ref } = await getOwnedQuiz(id);
      await deleteDoc(ref);
      return { success: true };
    },
    restore: async (id: number) => {
      const { ref } = await getOwnedQuiz(id);
      await updateDoc(ref, { deletedAt: null, updatedAt: now() });
      return { success: true };
    },
    clone: async (id: number) => {
      const source = STARTER_QUIZZES.find(item => item.id === id);
      if (!source) throw new Error('This quiz is no longer available.');
      const user = await userContext();
      const newId = makeId();
      const createdAt = now();
      await setDoc(doc(db, 'users', user.uid, 'quizzes', String(newId)), {
        ...source, id: newId, ownerUid: user.uid, creatorName: user.displayName || 'AnimPlay host',
        title: `${source.title} (copy)`, isPublic: false, isFavorite: false, folderId: null,
        deletedAt: null, playCount: 0, createdAt, updatedAt: createdAt,
        questions: source.questions.map((question, index) => ({ ...question, id: makeId() + index })),
      });
      return { quiz: { id: newId, title: `${source.title} (copy)` } };
    },
    addQuestion: async (quizId: number, question: AnyRecord) => {
      const { ref, raw } = await getOwnedQuiz(quizId);
      const questions = Array.isArray(raw.questions) ? raw.questions : [];
      const next = {
        id: makeId(), question_text: question.question_text.trim(),
        timer_seconds: Number(question.timer_seconds) || 20, points: Number(question.points) || 0,
        correct_index: Number(question.correct_index) || 0, questionType: question.questionType || 'multiple_choice',
        answers: question.questionType === 'open_ended' ? [] : question.answers, sortOrder: questions.length,
        ...(question.media ? { media: question.media } : {}),
        ...(question.source ? { source: question.source } : {}),
      };
      await updateDoc(ref, { questions: [...questions, next], updatedAt: now() });
      return { question: { id: next.id } };
    },
    updateQuestion: async (quizId: number, questionId: number, question: AnyRecord) => {
      const { ref, raw } = await getOwnedQuiz(quizId);
      const questions = (raw.questions || []).map((item: AnyRecord) => item.id === questionId ? { ...item, ...question } : item);
      await updateDoc(ref, { questions, updatedAt: now() });
      return { success: true };
    },
    deleteQuestion: async (quizId: number, questionId: number) => {
      const { ref, raw } = await getOwnedQuiz(quizId);
      const questions = (raw.questions || []).filter((item: AnyRecord) => item.id !== questionId);
      await updateDoc(ref, { questions, updatedAt: now() });
      return { success: true };
    },
    aiGenerate: async (topic: string, audience: string, count: number) => {
      const user = await userContext();
      const id = makeId();
      const safeCount = Math.min(15, Math.max(3, count));
      const stems = [`Which idea is most closely connected to ${topic}?`, `What is an important fact to remember about ${topic}?`, `Which example best demonstrates ${topic}?`, `Which statement about ${topic} should be checked first?`, `What is a useful starting point for learning ${topic}?`];
      const questions = Array.from({ length: safeCount }, (_, index) => ({
        id: makeId() + index, question_text: stems[index % stems.length], timer_seconds: 20,
        points: 1000, correct_index: 0, questionType: 'multiple_choice',
        answers: [{ text: 'Edit this with the correct answer', color: 'red' }, { text: 'Add a believable distractor', color: 'blue' }, { text: 'Add another distractor', color: 'yellow' }, { text: 'Add one final distractor', color: 'green' }],
        sortOrder: index,
      }));
      const createdAt = now();
      await setDoc(doc(db, 'users', user.uid, 'quizzes', String(id)), {
        id, ownerUid: user.uid, title: `${topic.trim()} starter`,
        description: `${safeCount}-question starter for ${audience}. Review answers before publishing.`,
        status: 'draft', isPublic: false, isFavorite: false, folderId: null, deletedAt: null,
        playCount: 0, questions, createdAt, updatedAt: createdAt,
      });
      return { quiz: { id, title: `${topic.trim()} starter`, question_count: safeCount } };
    },
  },
  games: {
    start: async (quizId: number, gameMode: 'classic' | 'team' = 'classic') => {
      const { user, raw } = await getOwnedQuiz(quizId);
      if (!raw.questions?.length) throw new Error('Add at least one question before hosting.');
      let gamePin = '';
      for (let attempt = 0; attempt < 10; attempt += 1) {
        gamePin = String(Math.floor(100000 + Math.random() * 900000));
        if (!(await getDoc(doc(db, 'games', gamePin))).exists()) break;
      }
      const id = makeId();
      const createdAt = now();
      await setDoc(doc(db, 'games', gamePin), {
        id, gamePin, hostUid: user.uid, hostId: user.uid, quizId, quizTitle: raw.title,
        quiz: normalizeQuiz(quizId, raw), gameMode, status: 'lobby', phase: 'lobby',
        currentQuestion: -1, teams: [], createdAt, startedAt: null, endedAt: null,
      });
      return { gameId: id, gamePin, gameMode };
    },
    get: async (pin: string) => {
      const snap = await getDoc(doc(db, 'games', pin));
      if (!snap.exists()) throw new Error('Game not found.');
      return { game: snap.data() };
    },
    getResults: async (pin: string) => {
      const players = await getDocs(collection(db, 'games', pin, 'players'));
      return { results: players.docs.map(item => item.data()).sort((a, b) => b.score - a.score) };
    },
  },
  discover: {
    categories: async () => ({ categories: [...new Set(STARTER_QUIZZES.map(q => q.category))] }),
    quizzes: async ({ search = '', category = 'all', sort = 'popular' }: AnyRecord) => {
      const term = search.trim().toLowerCase();
      let quizzes = STARTER_QUIZZES.map(item => ({ ...item, question_count: item.questions.length }));
      if (category !== 'all') quizzes = quizzes.filter(item => item.category === category);
      if (term) quizzes = quizzes.filter(item => `${item.title} ${item.description}`.toLowerCase().includes(term));
      quizzes.sort((a, b) => sort === 'newest' ? b.id - a.id : b.play_count - a.play_count);
      return { quizzes };
    },
    play: async () => ({ success: true }),
  },
  folders: {
    list: async () => {
      const user = await userContext();
      const snaps = await getDocs(collection(db, 'users', user.uid, 'folders'));
      return { folders: snaps.docs.map(item => ({ id: Number(item.id), ...item.data() })).sort((a: any, b: any) => a.name.localeCompare(b.name)) };
    },
    create: async (name: string) => {
      const user = await userContext();
      const id = makeId();
      await setDoc(doc(db, 'users', user.uid, 'folders', String(id)), { id, name: name.trim(), createdAt: now() });
      return { folder: { id, name: name.trim() } };
    },
    delete: async (id: number) => {
      const user = await userContext();
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', user.uid, 'folders', String(id)));
      const quizzes = await getDocs(collection(db, 'users', user.uid, 'quizzes'));
      quizzes.docs.filter(item => item.data().folderId === id).forEach(item => batch.update(item.ref, { folderId: null }));
      await batch.commit();
      return { success: true };
    },
  },
  groups: {
    list: async (tab: 'joined' | 'owned' = 'joined') => {
      const user = await userContext();
      const snaps = await getDocs(collection(db, 'groups'));
      const groups = snaps.docs.map(item => ({ id: Number(item.id), ...item.data() } as AnyRecord)).filter(group => tab === 'owned' ? group.ownerUid === user.uid : group.ownerUid !== user.uid && group.memberUids?.includes(user.uid)).map(group => ({ ...group, invite_code: group.inviteCode, member_count: group.memberUids?.length || 0, created_at: group.createdAt, role: group.ownerUid === user.uid ? 'owner' : 'member' }));
      return { groups };
    },
    create: async (name: string, description = '') => {
      const user = await userContext();
      const id = makeId();
      const group = { id, ownerUid: user.uid, name: name.trim(), description: description.trim(), inviteCode: inviteCode(), memberUids: [user.uid], createdAt: now() };
      await setDoc(doc(db, 'groups', String(id)), group);
      return { group: { ...group, invite_code: group.inviteCode } };
    },
    join: async (code: string) => {
      const user = await userContext();
      const snaps = await getDocs(query(collection(db, 'groups'), where('inviteCode', '==', code.trim().toUpperCase())));
      if (snaps.empty) throw new Error('Invalid invite code.');
      const item = snaps.docs[0];
      const group = item.data();
      if (group.memberUids?.includes(user.uid)) throw new Error('You are already in this group.');
      await updateDoc(item.ref, { memberUids: [...(group.memberUids || []), user.uid] });
      return { group };
    },
    delete: async (id: number) => {
      const user = await userContext();
      const ref = doc(db, 'groups', String(id));
      const snap = await getDoc(ref);
      if (!snap.exists() || snap.data().ownerUid !== user.uid) throw new Error('Only the group owner can delete it.');
      await deleteDoc(ref);
      return { success: true };
    },
  },
  reports: {
    list: async () => {
      const user = await userContext();
      const snaps = await getDocs(query(collection(db, 'games'), where('hostUid', '==', user.uid)));
      const reports = snaps.docs.map(item => item.data()).filter(game => game.status === 'finished').map(game => ({ id: game.id, game_pin: game.gamePin, quiz_title: game.quizTitle, started_at: game.startedAt, ended_at: game.endedAt, player_count: game.finalRankings?.length || 0, top_score: game.finalRankings?.[0]?.score || 0 })).sort((a, b) => String(b.ended_at).localeCompare(String(a.ended_at)));
      return { reports };
    },
    detail: async (gameId: number) => {
      const user = await userContext();
      const snaps = await getDocs(query(collection(db, 'games'), where('id', '==', gameId)));
      const item = snaps.docs.find(game => game.data().hostUid === user.uid && game.data().status === 'finished');
      if (!item) throw new Error('Report not found.');
      const game = item.data();
      return { game: { id: game.id, game_pin: game.gamePin, quiz_title: game.quizTitle, started_at: game.startedAt, ended_at: game.endedAt, status: game.status }, results: (game.finalRankings || []).map((entry: AnyRecord) => ({ id: entry.playerId || entry.rank, total: game.quiz?.questions?.length || 0, ...entry })) };
    },
  },
  learning: {
    assignments: async (tab: 'todo' | 'completed' | 'expired' = 'todo') => {
      const user = await userContext();
      const [assignmentSnaps, groupSnaps] = await Promise.all([getDocs(collection(db, 'assignments')), getDocs(collection(db, 'groups'))]);
      const groups = new Map(groupSnaps.docs.map(item => [Number(item.id), item.data()]));
      const currentTime = Date.now();
      const assignments = assignmentSnaps.docs.map(item => ({ id: Number(item.id), ...item.data() } as AnyRecord)).filter(item => groups.get(item.groupId)?.memberUids?.includes(user.uid)).map(item => {
        const completed = Boolean(item.completions?.[user.uid]);
        const expired = item.dueDate ? new Date(item.dueDate).getTime() < currentTime : false;
        return { ...item, quiz_title: item.quizTitle, group_name: groups.get(item.groupId)?.name || 'Group', due_date: item.dueDate || null, is_completed: completed, created_at: item.createdAt, expired };
      }).filter(item => tab === 'completed' ? item.is_completed : tab === 'expired' ? item.expired && !item.is_completed : !item.expired && !item.is_completed);
      return { assignments };
    },
    complete: async (id: number, score = 0) => {
      const user = await userContext();
      await updateDoc(doc(db, 'assignments', String(id)), { [`completions.${user.uid}`]: { score, completedAt: now() } });
      return { success: true };
    },
    createAssignment: async (groupId: number, quizId: number, title?: string, dueDate?: string) => {
      const user = await userContext();
      const [groupSnap, quizSnap] = await Promise.all([getDoc(doc(db, 'groups', String(groupId))), getDoc(doc(db, 'users', user.uid, 'quizzes', String(quizId)))]);
      if (!groupSnap.exists() || groupSnap.data().ownerUid !== user.uid) throw new Error('Only the group owner can create assignments.');
      if (!quizSnap.exists()) throw new Error('Quiz not found.');
      const id = makeId();
      await setDoc(doc(db, 'assignments', String(id)), { id, groupId, quizId, title: title || quizSnap.data().title, quizTitle: quizSnap.data().title, dueDate: dueDate || null, createdBy: user.uid, completions: {}, createdAt: now() });
      return { assignment: { id } };
    },
  },
};
