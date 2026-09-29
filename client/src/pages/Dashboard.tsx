import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import QuestionMedia from '../components/QuestionMedia';
import type { LibraryQuestion } from '../data/library';
interface Quiz {
  id: number; title: string; description: string; question_count: number; status: string;
  is_favorite: number; deleted_at: string | null; created_at: string; updated_at: string;
  category?: string; format?: string; folderId?: number; questions: LibraryQuestion[]; coverImage?: string;
}
interface Folder { id: number; name: string }
const subjects: Record<string, { icon: string; color: string }> = {
  general: { icon: '✦', color: 'violet' }, geography: { icon: '◎', color: 'teal' },
  history: { icon: '⌛', color: 'peach' }, science: { icon: '⚛', color: 'blue' },
  animals: { icon: '♧', color: 'green' }, sports: { icon: '⚽', color: 'peach' },
  film: { icon: '▶', color: 'violet' }, music: { icon: '♫', color: 'pink' },
  books: { icon: '▤', color: 'teal' }, technology: { icon: '⌘', color: 'blue' },
};
const formats: Record<string, string> = { text: 'Text only', image: 'With images', diagram: 'With diagrams' };
export default function Dashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('all');
  const [format, setFormat] = useState('all');
  const [sort, setSort] = useState('collection');
  const [modal, setModal] = useState<'folder' | 'builder' | null>(null);
  const [preview, setPreview] = useState<Quiz | null>(null);
  const [busy, setBusy] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('Everyone');
  const [count, setCount] = useState(15);
  const navigate = useNavigate();
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [all, trash, folderData] = await Promise.all([api.quizzes.list(), api.quizzes.list('trash'), api.folders.list()]);
      setQuizzes([...all.quizzes, ...trash.quizzes]); setFolders(folderData.folders);
    } catch (err: any) { setError(err.message || 'Could not load your library. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const active = quizzes.filter(q => !q.deleted_at);
  const tabs = [
    { key: 'all', label: 'All quizzes', count: active.length },
    { key: 'favorites', label: 'Favorites', count: active.filter(q => q.is_favorite).length },
    { key: 'drafts', label: 'Drafts', count: active.filter(q => q.status === 'draft').length },
    { key: 'trash', label: 'Trash', count: quizzes.length - active.length },
  ];
  const visible = useMemo(() => {
    const result = quizzes.filter(q => {
      if (tab === 'trash' ? !q.deleted_at : q.deleted_at) return false;
      if (tab === 'favorites' && !q.is_favorite) return false;
      if (tab === 'drafts' && q.status !== 'draft') return false;
      return (!folderId || q.folderId === folderId) && (subject === 'all' || (q.category || 'general') === subject)
        && (format === 'all' || (q.format || 'text') === format)
        && `${q.title} ${q.description} ${q.category || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    });
    return result.sort((a,b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'recent' ? b.updated_at.localeCompare(a.updated_at) : a.id-b.id);
  }, [quizzes, tab, folderId, search, subject, format, sort]);
  const act = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); } catch (err: any) { setError(err.message || 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };
  const patch = (id: number, changes: Partial<Quiz>) => setQuizzes(prev => prev.map(q => q.id === id ? { ...q, ...changes } : q));
  const play = (quiz: Quiz) => act(async () => {
    const data = await api.games.start(quiz.id);
    localStorage.setItem('animplay_gamePin', data.gamePin); localStorage.setItem('animplay_gameId', String(data.gameId)); navigate('/host/lobby');
  });
  const favorite = (quiz: Quiz) => act(async () => {
    const is_favorite = quiz.is_favorite ? 0 : 1; await api.quizzes.update(quiz.id, { is_favorite }); patch(quiz.id, { is_favorite });
  });
  const trash = (quiz: Quiz) => act(async () => { await api.quizzes.delete(quiz.id); patch(quiz.id, { deleted_at: new Date().toISOString() }); });
  const restore = (quiz: Quiz) => act(async () => { await api.quizzes.restore(quiz.id); patch(quiz.id, { deleted_at: null }); });
  const remove = (quiz: Quiz) => {
    if (confirm(`Permanently delete “${quiz.title}”? This cannot be undone.`)) void act(async () => { await api.quizzes.permanentDelete(quiz.id); setQuizzes(prev => prev.filter(q => q.id !== quiz.id)); });
  };
  return <div className="library-page">
    <div className="page-heading"><div><p className="eyebrow">LET'S PLAY SOMETHING GREAT</p><h1>My Quizzes<span className="heading-dot">.</span></h1><p>Your ideas, your favorites, your next great game. All in one place.</p></div><div className="heading-actions"><button className="button secondary" onClick={() => setModal('builder')}>✦ Quick-start builder</button><Link className="button primary" to="/quiz/new"><Icon name="plus" size={18} /> Create quiz</Link></div></div>
    <section className="library-banner" aria-label="Included quiz collection"><div className="banner-art" aria-hidden="true"><span>✦</span><span>?</span><span>◒</span></div><div><span className="pill">READY WHEN YOU ARE</span><h2>A whole world of questions.</h2><p>30 curated quizzes. 10 subjects. Picture rounds, clever charts, and classic trivia.</p></div><div className="banner-stats"><strong>15–17</strong><span>questions per quiz</span></div></section>
    <div className="library-tabs" aria-label="Library filters">{tabs.map(t => <button key={t.key} aria-pressed={tab === t.key && !folderId} className={tab === t.key && !folderId ? 'selected' : ''} onClick={() => { setTab(t.key); setFolderId(null); }}>{t.label}<span>{t.count}</span></button>)}<button className="add-folder" onClick={() => setModal('folder')}><Icon name="folder" size={17} /> New folder</button></div>
    {folders.length > 0 && <div className="folder-row">{folders.map(folder => <div key={folder.id} className={`folder-chip ${folderId === folder.id ? 'selected' : ''}`}><button onClick={() => { setFolderId(folderId === folder.id ? null : folder.id); setTab('all'); }}><Icon name="folder" size={15} />{folder.name}</button><button aria-label={`Delete folder ${folder.name}`} onClick={() => { if (confirm('Delete this folder? Its quizzes will be kept.')) void act(async () => { await api.folders.delete(folder.id); setFolders(prev => prev.filter(f => f.id !== folder.id)); setFolderId(null); setQuizzes(prev => prev.map(q => q.folderId === folder.id ? { ...q, folderId: undefined } : q)); }); }}>×</button></div>)}</div>}
    <div className="library-toolbar"><label className="search-field"><Icon name="discover" size={19} /><input type="search" aria-label="Search quizzes" placeholder="Search your quizzes…" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="sr-only" htmlFor="subject">Subject</label><select id="subject" value={subject} onChange={e => setSubject(e.target.value)}><option value="all">All subjects</option>{Object.keys(subjects).map(s => <option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select><label className="sr-only" htmlFor="format">Question format</label><select id="format" value={format} onChange={e => setFormat(e.target.value)}><option value="all">All formats</option>{Object.entries(formats).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div>
    <div className="results-heading"><p aria-live="polite">{loading ? 'Preparing your library…' : `${visible.length} ${visible.length === 1 ? 'quiz' : 'quizzes'}${folderId ? ` in ${folders.find(f => f.id === folderId)?.name}` : ' in your library'}`}</p><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="collection">Collection</option><option value="recent">Recently updated</option><option value="title">Name A–Z</option></select></label></div>
    {error && <div className="error-banner" role="alert">{error}<button onClick={load}>Retry</button></div>}
    {loading ? <div className="quiz-grid" role="status" aria-label="Loading quizzes">{Array.from({ length: 6 }, (_,i) => <div className="quiz-skeleton" key={i} />)}</div> : visible.length === 0 ? <div className="empty-panel"><Icon name={tab === 'trash' ? 'trash' : 'discover'} size={40} /><h2>{tab === 'trash' ? 'Your trash is empty' : 'No quizzes here just yet'}</h2><p>{search || format !== 'all' || subject !== 'all' ? 'Try a different search or clear your filters.' : tab === 'favorites' ? 'Tap the star on a quiz to keep it close.' : 'Create a quiz or explore the rest of your library.'}</p><button className="button secondary" onClick={() => { setSearch(''); setSubject('all'); setFormat('all'); setTab('all'); setFolderId(null); }}>View all quizzes</button></div> : <div className="quiz-grid">{visible.map(quiz => {
      const theme = subjects[quiz.category || 'general'] || subjects.general;
      return <article className="quiz-card" key={quiz.id}><div className={`quiz-cover ${theme.color}`}><button className="cover-preview" aria-label={`Preview ${quiz.title}`} onClick={() => setPreview(quiz)}><span className="cover-orbit" /><span className="cover-symbol">{theme.icon}</span><span className="cover-category">{quiz.category || 'general'}</span></button><span className="format-badge"><Icon name={quiz.format === 'diagram' ? 'reports' : quiz.format === 'image' ? 'image' : 'text'} size={13} />{formats[quiz.format || 'text']}</span>{!quiz.deleted_at && <button className={`favorite-button ${quiz.is_favorite ? 'is-favorite' : ''}`} aria-label={`${quiz.is_favorite ? 'Unfavorite' : 'Favorite'} ${quiz.title}`} aria-pressed={!!quiz.is_favorite} disabled={busy} onClick={() => favorite(quiz)}><Icon name="star" size={18} /></button>}</div><div className="quiz-card-body"><div className="card-meta"><span>{quiz.question_count} questions</span><span>•</span><span>{Math.ceil(quiz.question_count / 2)} min</span>{quiz.status === 'draft' && <span className="draft-tag">Draft</span>}</div><button className="card-title" onClick={() => setPreview(quiz)}>{quiz.title}</button><p className="card-description">{quiz.description || 'A little challenge, a lot to discover.'}</p><div className="card-actions">{quiz.deleted_at ? <><button className="button secondary small" disabled={busy} onClick={() => restore(quiz)}>Restore</button><button className="icon-button danger" title="Delete permanently" aria-label={`Permanently delete ${quiz.title}`} disabled={busy} onClick={() => remove(quiz)}><Icon name="trash" size={17} /></button></> : <><button className="button play-button small" disabled={busy || !quiz.question_count} onClick={() => play(quiz)}><Icon name="play" size={13} /> Host game</button><Link className="icon-button" to={`/quiz/${quiz.id}/edit`} title="Edit quiz" aria-label={`Edit ${quiz.title}`}><Icon name="edit" size={17} /></Link><button className="icon-button danger" disabled={busy} title="Move to trash" aria-label={`Move ${quiz.title} to trash`} onClick={() => trash(quiz)}><Icon name="trash" size={17} /></button></>}</div></div></article>;
    })}</div>}
    {!loading && <p className="library-source">Questions from <a href="https://opentdb.com/" target="_blank" rel="noreferrer">Open Trivia Database</a> · CC BY-SA 4.0 · Visual rounds by AnimPlay. <a href="/quiz-sources.html" target="_blank" rel="noreferrer">See sources & credits ↗</a></p>}
    {preview && <Modal title={preview.title} onClose={() => setPreview(null)}><p className="modal-description">{preview.description}</p><div className="preview-actions">{!preview.deleted_at && <><button className="button primary" disabled={busy} onClick={() => play(preview)}><Icon name="play" size={16} /> Host this quiz</button><Link className="button secondary" to={`/quiz/${preview.id}/edit`}>Edit quiz</Link><label className="folder-select">Folder<select value={preview.folderId || ''} disabled={busy} onChange={e => { const next = Number(e.target.value) || undefined; void act(async () => { await api.quizzes.update(preview.id, { folderId: next || null }); patch(preview.id, { folderId: next }); setPreview({ ...preview, folderId: next }); }); }}><option value="">No folder</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label></>}</div><ol className="preview-questions">{preview.questions.map((q,i) => <li key={q.id || i}><span className="eyebrow">QUESTION {i+1} · {q.timer_seconds}s</span><h3>{q.question_text}</h3><QuestionMedia media={q.media} /><details><summary>Show answers</summary><ul>{q.answers.map((a,j) => <li key={j} className={q.correct_index === j ? 'correct-answer' : ''}>{q.correct_index === j ? '✓ ' : ''}{a.text}</li>)}</ul></details>{q.source && <a className="question-source" href={q.source.url} target="_blank" rel="noreferrer">{q.source.name} · {q.source.license} ↗</a>}</li>)}</ol></Modal>}
    {modal && <Modal title={modal === 'folder' ? 'A place for your quizzes' : 'Quick-start builder'} onClose={() => { if (!busy) setModal(null); }}><form className="modal-form" onSubmit={e => { e.preventDefault(); void act(async () => { if (modal === 'folder') { const data = await api.folders.create(folderName.trim()); setFolders(prev => [...prev, data.folder]); setFolderName(''); setModal(null); } else { const data = await api.quizzes.aiGenerate(topic, audience, count); navigate(`/quiz/${data.quiz.id}/edit`); } }); }}>{modal === 'folder' ? <label>Folder name<input required maxLength={60} autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="e.g. Friday game night" /></label> : <><p>Create an editable outline. Add and check the answers before hosting your game.</p><label>Topic<input required autoFocus value={topic} onChange={e => setTopic(e.target.value)} placeholder="What are we learning about?" /></label><label>Audience<select value={audience} onChange={e => setAudience(e.target.value)}>{['Everyone','Kids','Teens','Adults'].map(a => <option key={a}>{a}</option>)}</select></label><label>Questions<select value={count} onChange={e => setCount(Number(e.target.value))}>{[5,10,15].map(n => <option key={n}>{n}</option>)}</select></label></>}{error && <p role="alert" className="text-red-700">{error}</p>}<button className="button primary" disabled={busy || (modal === 'folder' ? !folderName.trim() : !topic.trim())}>{busy ? 'Working…' : modal === 'folder' ? 'Create folder' : 'Build outline'}</button></form></Modal>}
  </div>;
}
