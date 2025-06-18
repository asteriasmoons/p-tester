import { Routes, Route, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import WarningsViewer from './components/WarningsViewer';
import LoginStatus from './components/LoginStatus';
import TicketsPage from '../pages/TicketsPage'; // 🆕 Import TicketsPage

function App() {
  const [guilds, setGuilds] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState('');

  useEffect(() => {
    fetch('/api/guilds', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        setGuilds(json.guilds || []);
        if (json.guilds?.length) setSelectedGuild(json.guilds[0].id);
      })
      .catch(err => console.error('Failed to load guilds:', err));
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <nav
        style={{
          width: '220px',
          background: '#1a1a1a',
          padding: '2rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        <h2 style={{ color: '#fff', marginBottom: '2rem' }}>📂 Menu</h2>
        <NavLink to="/" className="sidebar-link">🏠 Welcome</NavLink>
        <NavLink to="/warnings" className="sidebar-link">⚠️ Warnings</NavLink>
        <NavLink to="/tickets" className="sidebar-link">🎟️ Tickets</NavLink> {/* 🆕 */}

        {/* 🆕 Guild Selector */}
        {guilds.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <label htmlFor="guild-select" style={{ color: '#f5f0ff', display: 'block', marginBottom: '0.5rem' }}>
              Select Server:
            </label>
            <select
              id="guild-select"
              value={selectedGuild}
              onChange={(e) => setSelectedGuild(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                background: '#3d2a55',
                color: '#f5f0ff'
              }}
            >
              {guilds.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 🧑‍💻 User Info */}
        <LoginStatus />
      </nav>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem' }}>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h1>👋 Welcome to the Pandoryx Dashboard</h1>
                <p style={{ marginTop: '1rem' }}>
                  Use the sidebar to navigate through your moderation tools.
                </p>
              </div>
            }
          />
          <Route path="/warnings" element={<WarningsViewer selectedGuild={selectedGuild} />} />
          <Route path="/tickets" element={<TicketsPage selectedGuild={selectedGuild} />} /> {/* 🆕 */}
        </Routes>
      </main>
    </div>
  );
}

export default App;