import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = (import.meta.env.VITE_API_BASE_URL || 'https://hash-3f88.onrender.com').replace(/\/$/, '')
const uidKey = 'campus-event-user-id'
const categories = ['Everything', 'Tech', 'Workshops', 'Community']

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

function categoryFor(title = '') {
  const name = title.toLowerCase()
  if (/workshop|science|learning|ai|python|data|tech|code/.test(name)) return 'Tech'
  if (/club|meet|social|community/.test(name)) return 'Community'
  return 'Workshops'
}

function Icon({ children, className = '' }) { return <span className={`icon ${className}`} aria-hidden="true">{children}</span> }

function App() {
  const [events, setEvents] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [userId, setUserId] = useState(() => localStorage.getItem(uidKey) || '')
  const [page, setPage] = useState('discover')
  const [category, setCategory] = useState('Everything')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)

  async function loadEvents() {
    setLoading(true); setError('')
    try { setEvents(await request('/api/events')) }
    catch (e) { setError(e.message); setEvents([]) }
    finally { setLoading(false) }
  }

  async function loadRegistrations(id = userId) {
    if (!id) { setRegistrations([]); return }
    try { setRegistrations(await request(`/api/me/registrations?user_id=${encodeURIComponent(id)}`)) }
    catch (e) { setRegistrations([]); setNotice(e.message) }
  }

  useEffect(() => { loadEvents() }, [])
  useEffect(() => { if (userId) { localStorage.setItem(uidKey, userId); loadRegistrations(userId) } else { localStorage.removeItem(uidKey); setRegistrations([]) } }, [userId])

  const filtered = useMemo(() => events.filter(event => {
    const matchesCategory = category === 'Everything' || categoryFor(event.title) === category
    return matchesCategory && event.title.toLowerCase().includes(query.toLowerCase())
  }), [events, category, query])
  const registered = useMemo(() => new Set(registrations.map(item => item.event_id)), [registrations])
  const myEvents = events.filter(event => registered.has(event.id))
  const openCount = events.filter(event => ['open', 'published', 'active'].includes((event.status || '').toLowerCase())).length

  async function register(event) {
    if (!userId) { setSelected(event); setNotice('Add your existing campus user ID to continue. No account or sign-in is needed.'); return }
    setBusy(true); setNotice('')
    try {
      await request('/api/registrations', { method: 'POST', body: JSON.stringify({ event_id: event.id, user_id: userId }) })
      await loadRegistrations(userId)
      setNotice(`You're on the list for ${event.title}.`)
      setSelected(null)
    } catch (e) { setNotice(e.message) }
    finally { setBusy(false) }
  }

  const featured = events[0]
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" onClick={() => setPage('discover')}><span className="brand-mark"><Icon>✳</Icon></span><span>campus<span className="brand-dot">.</span></span></a>
      <div className="nav-label">YOUR SPACE</div>
      <button className={`nav-item ${page === 'discover' ? 'active' : ''}`} onClick={() => setPage('discover')}><Icon>⌕</Icon> Discover <span className="nav-arrow">↗</span></button>
      <button className={`nav-item ${page === 'tickets' ? 'active' : ''}`} onClick={() => setPage('tickets')}><Icon>▣</Icon> My registrations <span className="nav-count">{registrations.length}</span></button>
      <div className="side-card"><span className="side-star">✦</span><strong>Make campus<br/>your place.</strong><p>Good things happen when you show up.</p><button onClick={() => setPage('discover')}>Explore events <span>→</span></button></div>
      <div className="sidebar-foot"><span className="online-dot"/> API connected <span className="api-host">{new URL(API).host}</span></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark"><Icon>✳</Icon></span> campus<span className="brand-dot">.</span></div><div className="crumb">Campus <span>/</span> {page === 'discover' ? 'Discover' : 'My registrations'}</div><div className="top-actions"><button className="icon-button" aria-label="Refresh events" onClick={loadEvents}><Icon>↻</Icon></button><div className="avatar">Y</div><span className="hello">Your campus</span></div></header>
      <div className="content">
        {page === 'discover' ? <>
          <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> THE CAMPUS EDITION <span className="eyebrow-line"/></div><h1>Find your <em>people.</em><br/>Find your thing.</h1><p className="welcome-sub">The best parts of campus happen between the classes.</p></div><div className="date-chip"><span className="date-sun">✳</span><div><strong>{new Intl.DateTimeFormat('en', { weekday: 'long' }).format(new Date())}</strong><small>{new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric' }).format(new Date())}</small></div></div></section>
          {featured && <section className="feature-card"><div className="feature-copy"><div className="feature-tag"><span className="live-dot"/> THIS WEEK ON CAMPUS</div><h2>A little more<br/>out of the ordinary.</h2><p>From big ideas to good company, your next favorite memory is closer than you think.</p><button className="light-button" onClick={() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' })}>See what’s happening <span>↘</span></button><div className="feature-foot"><span><b>{events.length.toString().padStart(2,'0')}</b> events to explore</span><span className="feature-sep"/><span><b>{openCount.toString().padStart(2,'0')}</b> open for sign-up</span></div></div><div className="feature-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-sun"/><div className="art-note note-a">✳</div><div className="art-note note-b">✦</div><div className="art-label">MAKE ROOM<br/>FOR SOMETHING<br/><i>GOOD.</i></div><div className="art-stamp">CAMPUS<br/>2025</div></div><span className="feature-index">01 — 03</span></section>}
          <section className="section-heading" id="events"><div><div className="eyebrow muted">THE GOOD STUFF</div><h2>Happening <em>around you</em></h2></div><span className="result-count">{filtered.length} EVENTS <span>↘</span></span></section>
          <section className="toolbar"><div className="filters">{categories.map(item => <button key={item} className={`filter ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="search"><Icon>⌕</Icon><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find your next thing"/><span>⌘ K</span></label></section>
          {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}
          {error ? <div className="empty-state"><span className="empty-icon">↗</span><h3>We couldn’t reach the events</h3><p>{error}</p><button className="dark-button" onClick={loadEvents}>Try again</button></div> : loading ? <div className="loading-state"><span className="spinner"/> Finding your campus events…</div> : filtered.length ? <section className="event-grid">{filtered.map((event, index) => <EventCard key={event.id} event={event} index={index} registered={registered.has(event.id)} onSelect={() => setSelected(event)} onRegister={() => register(event)}/>)}</section> : <div className="empty-state"><span className="empty-icon">✳</span><h3>Nothing on this page yet</h3><p>Try another filter or search for something else.</p></div>}
          <footer className="page-footer"><span>GOOD THINGS HAPPEN ON CAMPUS.</span><span>BUILT FOR THE IN-BETWEEN <b>✳</b></span></footer>
        </> : <>
          <section className="welcome-row tickets-heading"><div><div className="eyebrow"><span className="live-dot"/> YOUR CAMPUS PLANS</div><h1>Your <em>people.</em><br/>Your plans.</h1><p className="welcome-sub">Every good plan starts with showing up.</p></div><div className="ticket-total"><strong>{myEvents.length.toString().padStart(2,'0')}</strong><span>YOUR<br/>REGISTRATIONS</span></div></section>
          {!userId ? <div className="identity-panel"><span className="empty-icon">⌁</span><div><h3>Bring up your registrations</h3><p>Enter the existing campus user UUID associated with your registrations. This is a lookup only; there’s no account or sign-in.</p></div><UserIdInput userId={userId} setUserId={setUserId}/></div> : myEvents.length ? <div className="event-grid">{myEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} registered onSelect={() => setSelected(event)} onRegister={() => register(event)}/>)}</div> : <div className="empty-state"><span className="empty-icon">✳</span><h3>No plans on the calendar yet</h3><p>Your registrations will show up here once you join an event.</p><button className="dark-button" onClick={() => setPage('discover')}>Find an event</button></div>}
          {userId && <div className="identity-panel compact"><div className="identity-avatar">Y</div><div className="identity-copy"><strong>Campus user ID</strong><small>{userId}</small></div><button className="text-button" onClick={() => setUserId('')}>Change ID</button></div>}
        </>}
      </div>
    </main>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)}>×</button><div className="eyebrow muted">EVENT DETAILS</div><h2>{selected.title}</h2><p className="modal-copy">A campus gathering, powered by good ideas and even better company.</p><div className="modal-facts"><span><small>STATUS</small><b>{selected.status || 'Details coming soon'}</b></span><span><small>CAPACITY</small><b>{selected.capacity ?? 'Not listed'} spots</b></span></div><label className="field-label">EXISTING CAMPUS USER ID</label><UserIdInput userId={userId} setUserId={setUserId}/><p className="field-hint">No account or password. The API needs an existing user UUID to make a registration.</p>{notice && <p className="notice-text">{notice}</p>}<button disabled={busy || registered.has(selected.id) || !['open','published','active'].includes((selected.status || '').toLowerCase())} className="dark-button modal-submit" onClick={() => register(selected)}>{busy ? 'Saving…' : registered.has(selected.id) ? 'Already registered' : ['open','published','active'].includes((selected.status || '').toLowerCase()) ? 'Register for this event ↗' : 'Registration not open'}</button></section></div>}
    <nav className="mobile-nav"><button className={page === 'discover' ? 'active' : ''} onClick={() => setPage('discover')}><Icon>⌕</Icon><span>Discover</span></button><button className={page === 'tickets' ? 'active' : ''} onClick={() => setPage('tickets')}><Icon>▣</Icon><span>My plans</span></button></nav>
  </div>
}

function UserIdInput({ userId, setUserId }) {
  return <input className="user-id-input" value={userId} onChange={e => setUserId(e.target.value.trim())} placeholder="e.g. 2b34bd96-6d1c-460a-9284-a249c9a8cdfe" aria-label="Existing campus user UUID" />
}

function EventCard({ event, index, registered, onSelect, onRegister }) {
  const category = categoryFor(event.title)
  const colors = ['peach', 'lavender', 'mint', 'yellow']
  const initials = event.title.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase()
  const accepting = ['open','published','active'].includes((event.status || '').toLowerCase())
  return <article className="event-card"><button className={`event-art ${colors[index % colors.length]}`} onClick={onSelect} aria-label={`View ${event.title}`}><span className="event-number">NO. {String(index + 1).padStart(2, '0')}</span><span className="event-art-shape">{index % 2 ? '✳' : '✦'}</span><span className="event-initials">{initials}</span><span className="art-open">↗</span></button><div className="event-content"><div className="event-meta"><span>{category}</span><span className={`status ${accepting ? 'status-open' : ''}`}><i/> {event.status || 'Coming soon'}</span></div><button className="event-title" onClick={onSelect}>{event.title}<span>↗</span></button><div className="capacity-row"><span><Icon>◷</Icon> Campus event</span><span><Icon>♧</Icon> {event.capacity ?? '—'} places</span></div><div className="event-bottom"><span className="organizer">HOSTED BY CAMPUS <span>✳</span></span><button className={`join-button ${registered ? 'joined' : ''}`} disabled={registered || !accepting} onClick={onRegister}>{registered ? 'You’re in ✓' : accepting ? 'Count me in' : 'Not open yet'} <span>↗</span></button></div></div></article>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
