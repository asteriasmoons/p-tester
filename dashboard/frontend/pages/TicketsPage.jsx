// pages/TicketsPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import PanelEditor from './../src/components/PanelEditor';

export default function TicketsPage() {
  const [panels, setPanels] = useState([]);
  const [editingPanel, setEditingPanel] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [categories, setCategories] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [selectedGuild, setSelectedGuild] = useState('');
  const [guilds, setGuilds] = useState([]);

  // Load user's guilds and default to the first one
  useEffect(() => {
    fetch('/api/guilds', { credentials: 'include' })
      .then(res => res.json())
      .then(json => {
        const g = json.guilds || [];
        setGuilds(g);
        if (g.length > 0) setSelectedGuild(g[0].id);
      })
      .catch(console.error);
  }, []);

  // Fetch panels for the selected guild
  const fetchPanels = useCallback(async () => {
    if (!selectedGuild) return;
    const res = await fetch(`/api/tickets/panels?guildId=${selectedGuild}`);
    const data = await res.json();
    setPanels(data);
  }, [selectedGuild]);

  // Fetch categories for the selected guild
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/categories/${selectedGuild}`);
      const json = await res.json();
      setCategories(json.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [selectedGuild]);

  // Fetch emojis for the selected guild
  // Fetch emojis for the selected guild
  const fetchEmojis = useCallback(async () => {
  if (!selectedGuild) return;
  try {
    const res = await fetch(`/api/emojis/${selectedGuild}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.emojis)) {
      setEmojis(json.emojis);  // Emojis already formatted from backend now
    } else {
      setEmojis([]);
    }
  } catch (err) {
    console.error('Failed to fetch emojis:', err);
    setEmojis([]);
  }
}, [selectedGuild]);

  // When selectedGuild changes, fetch related data
  useEffect(() => {
    if (!selectedGuild) return;
    fetchPanels();
    fetchCategories();
    fetchEmojis();
  }, [selectedGuild, fetchPanels, fetchCategories, fetchEmojis]);

  const handleEdit = (panel) => {
    setEditingPanel(panel);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingPanel(null);
    setShowEditor(true);
  };

  const handleDelete = async (panelId) => {
    await fetch(`/api/tickets/panels/${panelId}`, { method: 'DELETE' });
    fetchPanels();
  };

  const handleSave = async (panelData) => {
    const method = editingPanel ? 'PUT' : 'POST';
    const endpoint = editingPanel
      ? `/api/tickets/panels/${editingPanel._id}`
      : '/api/tickets/panels';

    const payload = { ...panelData, guildId: selectedGuild };

    await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setShowEditor(false);
    fetchPanels();
  };

  return (
    <div className="tickets-page">
      <h1>🎟️ Ticket Panels</h1>

      {/* Guild Selector */}
      {guilds.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="guild-select">Select Server:</label>
          <select
            id="guild-select"
            value={selectedGuild}
            onChange={(e) => setSelectedGuild(e.target.value)}
            style={{ marginLeft: '0.5rem' }}
          >
            {guilds.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {!showEditor && (
        <>
          <button onClick={handleNew}>+ New Panel</button>
          <ul>
            {panels.map(panel => (
              <li key={panel._id}>
                <strong>{panel.name}</strong> – {panel.embed?.title}
                <button onClick={() => handleEdit(panel)}>Edit</button>
                <button onClick={() => handleDelete(panel._id)}>Delete</button>
              </li>
            ))}
          </ul>
        </>
      )}

      {showEditor && (
        <PanelEditor
          panel={editingPanel}
          onSave={handleSave}
          onCancel={() => setShowEditor(false)}
          categories={categories}
          emojis={emojis}
        />
      )}
    </div>
  );
}