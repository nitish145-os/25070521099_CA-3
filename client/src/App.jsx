import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Check, ChevronDown, CircleHelp, Clock3, Gamepad2, Grid2X2, Library, ListFilter, LoaderCircle, Monitor, Pencil, Plus, Search, SlidersHorizontal, Star, Trash2, X, CheckCircle2, BookOpen, Sparkles } from 'lucide-react';

const API = 'http://localhost:3000/api';
const STATUSES = ['Want to Play', 'Playing', 'Completed', 'On Hold', 'Dropped'];
const GENRES = ['Action', 'Adventure', 'RPG', 'FPS', 'Horror', 'Simulation', 'Strategy', 'Racing', 'Sports', 'Puzzle', 'Other'];
const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Other'];
const blankGame = { title: '', genre: 'Action', platform: 'PC', status: 'Want to Play', rating: '', releaseYear: '', description: '', notes: '', coverUrl: '' };
const statusClass = status => status.toLowerCase().replaceAll(' ', '-');

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status}).`);
  return body;
}

function Cover({ game, large = false }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [game.coverUrl]);
  if (!game.coverUrl || broken) return <div className={`cover-fallback ${large ? 'cover-large' : ''}`}><Gamepad2 size={large ? 42 : 34} /><span>{game.title?.slice(0, 1)?.toUpperCase() || 'G'}</span></div>;
  return <img className={`game-cover ${large ? 'cover-large' : ''}`} src={game.coverUrl} alt={`${game.title} cover`} loading="lazy" onError={() => setBroken(true)} />;
}

function GameModal({ game, onClose, onSave, onDelete, saving }) {
  const [form, setForm] = useState(() => game ? { ...blankGame, ...game, rating: game.rating ?? '', releaseYear: game.releaseYear ?? '' } : { ...blankGame });
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const editing = Boolean(game?._id);
  const change = event => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setError('');
    if (!form.title.trim()) return setError('Please enter a game title.');
    if (form.rating !== '' && (Number(form.rating) < 1 || Number(form.rating) > 10)) return setError('Rating must be between 1 and 10.');
    if (form.releaseYear !== '' && (!Number.isInteger(Number(form.releaseYear)) || Number(form.releaseYear) < 1950 || Number(form.releaseYear) > 2100)) return setError('Enter a valid release year.');
    try { await onSave({ ...form, title: form.title.trim(), rating: form.rating === '' ? null : Number(form.rating), releaseYear: form.releaseYear === '' ? null : Number(form.releaseYear) }); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { const onKey = event => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div className="modal-head"><div><p className="eyebrow">{editing ? 'YOUR COLLECTION' : 'EXPAND YOUR COLLECTION'}</p><h2 id="modal-title">{editing ? 'Game details' : 'Add a game'}</h2></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
    <form onSubmit={submit} className="game-form">
      <label className="field full"><span>Game title <b>*</b></span><input name="title" value={form.title} onChange={change} maxLength="120" placeholder="e.g. Elden Ring" autoFocus required /></label>
      <div className="form-grid">
        <label className="field"><span>Genre</span><select name="genre" value={form.genre} onChange={change}>{GENRES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Platform</span><select name="platform" value={form.platform} onChange={change}>{PLATFORMS.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Status</span><select name="status" value={form.status} onChange={change}>{STATUSES.map(item => <option key={item}>{item}</option>)}</select></label>
        <label className="field"><span>Rating <small>(1–10)</small></span><input name="rating" type="number" min="1" max="10" step="0.5" value={form.rating} onChange={change} placeholder="Not rated" /></label>
        <label className="field"><span>Release year</span><input name="releaseYear" type="number" min="1950" max="2100" value={form.releaseYear} onChange={change} placeholder="e.g. 2022" /></label>
        <label className="field"><span>Cover image URL</span><input name="coverUrl" type="url" value={form.coverUrl} onChange={change} placeholder="https://..." /></label>
      </div>
      <label className="field full"><span>Description</span><textarea name="description" value={form.description} onChange={change} maxLength="2000" rows="3" placeholder="What is this game about?" /></label>
      <label className="field full"><span>Personal notes</span><textarea name="notes" value={form.notes} onChange={change} maxLength="4000" rows="2" placeholder="Your thoughts, progress, or goals..." /></label>
      {error && <p className="form-error"><AlertCircle size={16} />{error}</p>}
      <div className="modal-actions">
        {editing && <button type="button" className="btn danger-outline" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete</button>}
        <div className="actions-right"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn primary" disabled={saving}>{saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{saving ? 'Saving…' : editing ? 'Save changes' : 'Add game'}</button></div>
      </div>
    </form>
    {confirmDelete && <div className="confirm-layer"><div className="confirm-box"><div className="confirm-icon"><Trash2 size={22} /></div><h3>Delete this game?</h3><p>This removes <strong>{game.title}</strong> from your library permanently.</p><div className="actions-right"><button className="btn ghost" onClick={() => setConfirmDelete(false)}>Keep game</button><button className="btn danger" onClick={() => onDelete(game._id)}><Trash2 size={15} /> Delete game</button></div></div></div>}
  </section></div>;
}

function GameCard({ game, onClick }) {
  return <button className="game-card" onClick={onClick} aria-label={`Open ${game.title}`}>
    <div className="card-art"><Cover game={game} /><span className={`status-pill status-${statusClass(game.status)}`}>{game.status}</span><span className="card-open"><Pencil size={14} /></span></div>
    <div className="card-content"><div className="card-title-row"><h3>{game.title}</h3>{game.rating != null && <span className="rating"><Star size={13} fill="currentColor" />{game.rating}</span>}</div><p className="game-meta">{game.genre}<span>·</span>{game.platform}</p><div className="card-bottom"><span><Monitor size={13} /> {game.platform}</span>{game.releaseYear && <span>{game.releaseYear}</span>}</div></div>
  </button>;
}

export default function App() {
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState({ total: 0, playing: 0, completed: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All games');
  const [sort, setSort] = useState('Recently added');
  const [modalGame, setModalGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [activeNav, setActiveNav] = useState('Library');

  const refresh = useCallback(async () => {
    try {
      const [gameData, statData, health] = await Promise.all([request('/games'), request('/stats'), request('/health')]);
      setGames(gameData); setStats(statData); setConnected(health.ok); setError('');
    } catch (err) { setError(`${err.message} Make sure MongoDB Atlas is configured and the API server is running on port 3000.`); setConnected(false); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const visibleGames = useMemo(() => {
    let list = games.filter(game => game.title.toLowerCase().includes(search.trim().toLowerCase()));
    if (status !== 'All games') list = list.filter(game => game.status === status);
    return [...list].sort((a, b) => {
      if (sort === 'Title A–Z') return a.title.localeCompare(b.title);
      if (sort === 'Rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sort === 'Oldest added') return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [games, search, status, sort]);

  const saveGame = async values => {
    setSaving(true);
    try {
      if (modalGame?._id) await request(`/games/${modalGame._id}`, { method: 'PUT', body: JSON.stringify(values) });
      else await request('/games', { method: 'POST', body: JSON.stringify(values) });
      setModalGame(null); await refresh();
    } finally { setSaving(false); }
  };
  const deleteGame = async id => { try { await request(`/games/${id}`, { method: 'DELETE' }); setModalGame(null); await refresh(); } catch (err) { setError(err.message); } };
  const openAdd = () => setModalGame({ ...blankGame, _new: true });
  const selectedGame = modalGame?._new ? null : modalGame;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Gamepad2 size={22} /></div><div className="brand-name">Game<span>Vault</span><small>YOUR PERSONAL LIBRARY</small></div></div>
      <div className="nav-label">WORKSPACE</div><nav className="side-nav"><button className={`nav-item ${activeNav === 'Library' ? 'active' : ''}`} onClick={() => { setActiveNav('Library'); setStatus('All games'); }}><Library size={18} />Library<span className="nav-count">{stats.total}</span></button><button className={`nav-item ${activeNav === 'Playing' ? 'active' : ''}`} onClick={() => { setActiveNav('Playing'); setStatus('Playing'); }}><Activity size={18} />Currently playing</button><button className={`nav-item ${activeNav === 'Completed' ? 'active' : ''}`} onClick={() => { setActiveNav('Completed'); setStatus('Completed'); }}><CheckCircle2 size={18} />Completed</button><button className={`nav-item ${activeNav === 'Wishlist' ? 'active' : ''}`} onClick={() => { setActiveNav('Wishlist'); setStatus('Want to Play'); }}><BookOpen size={18} />Want to play</button></nav>
      <div className="sidebar-bottom"><div className="side-tip"><div className="tip-icon"><Sparkles size={16} /></div><strong>Your collection, your story.</strong><p>Keep every adventure in one place.</p></div><div className="connection"><span className={`connection-dot ${connected ? 'online' : ''}`} />{connected ? 'Database connected' : 'Database disconnected'}</div><div className="sidebar-foot">GAMEVAULT <span>•</span> PERSONAL EDITION</div></div>
    </aside>
    <main className="main-content"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>{activeNav}</strong></div><div className="topbar-right"><span className={`connection-chip ${connected ? 'connected' : ''}`}><span className="connection-dot" />{connected ? 'All systems operational' : 'API unavailable'}</span><button className="avatar" title="GameVault profile">G</button></div></header>
      <div className="page-wrap"><section className="welcome-row"><div><div className="eyebrow welcome-eyebrow"><span className="eyebrow-line" /> YOUR GAMING UNIVERSE</div><h1>Your library<span className="heading-dot">.</span></h1><p className="subtitle">Every game has a story. Keep track of yours.</p></div><button className="btn primary add-main" onClick={openAdd}><Plus size={18} />Add a game</button></section>
      {error && <div className="alert-error"><AlertCircle size={18} /><span>{error}</span><button onClick={refresh} className="alert-retry">Retry</button><button className="icon-btn" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
      <section className="stats-grid"><StatCard icon={<Grid2X2 size={18} />} label="TOTAL GAMES" value={stats.total} detail="In your collection" tone="purple" /><StatCard icon={<Activity size={18} />} label="IN PROGRESS" value={stats.playing} detail="Currently playing" tone="blue" /><StatCard icon={<CheckCircle2 size={18} />} label="COMPLETED" value={stats.completed} detail="Adventures finished" tone="green" /></section>
      <section className="library-section"><div className="section-heading"><div><h2>Game collection</h2><p>Manage and explore your personal library.</p></div><span className="collection-count">{visibleGames.length} {visibleGames.length === 1 ? 'GAME' : 'GAMES'}</span></div>
        <div className="toolbar"><div className="search-wrap"><Search size={17} /><input aria-label="Search games" placeholder="Search your games..." value={search} onChange={event => setSearch(event.target.value)} /><kbd>⌕</kbd></div><div className="filter-wrap"><ListFilter size={16} /><select aria-label="Filter by status" value={status} onChange={event => { setStatus(event.target.value); setActiveNav(event.target.value === 'All games' ? 'Library' : event.target.value === 'Want to Play' ? 'Wishlist' : event.target.value); }}><option>All games</option>{STATUSES.map(item => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></div><div className="filter-wrap sort-wrap"><SlidersHorizontal size={16} /><select aria-label="Sort games" value={sort} onChange={event => setSort(event.target.value)}><option>Recently added</option><option>Oldest added</option><option>Title A–Z</option><option>Rating</option></select><ChevronDown size={14} /></div></div>
        {loading ? <div className="loading-state"><LoaderCircle className="spin" size={27} /><p>Loading your library…</p></div> : visibleGames.length ? <div className="games-grid">{visibleGames.map(game => <GameCard key={game._id} game={game} onClick={() => setModalGame(game)} />)}</div> : <div className="empty-state"><div className="empty-icon">{search || status !== 'All games' ? <Search size={27} /> : <Gamepad2 size={30} />}</div><h3>{search || status !== 'All games' ? 'No games found' : 'Your library starts here'}</h3><p>{search || status !== 'All games' ? 'Try another search or change your filters.' : 'Add the games you love and build your personal collection.'}</p>{!search && status === 'All games' && <button className="btn primary" onClick={openAdd}><Plus size={17} />Add your first game</button>}</div>}
      </section><footer className="page-footer"><span>GAMEVAULT <span className="footer-dot">•</span> YOUR GAMES, ORGANIZED.</span><span>MADE FOR THE LOVE OF PLAYING <Gamepad2 size={13} /></span></footer></div>
    </main>
    {modalGame && <GameModal key={modalGame._id || 'new'} game={selectedGame} onClose={() => setModalGame(null)} onSave={saveGame} onDelete={deleteGame} saving={saving} />}
  </div>;
}

function StatCard({ icon, label, value, detail, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div><div className={`stat-decoration ${tone}`} /></div>;
}
