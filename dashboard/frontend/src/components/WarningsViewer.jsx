// src/components/WarningsViewer.jsx
import { useEffect, useState } from 'react';

function WarningsViewer({ selectedGuild }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editReason, setEditReason] = useState('');

  const SERVER_OWNER_ID = '1202652142482231417';

  useEffect(() => {
    fetch('/auth/user', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
          console.log('✅ Logged in user:', data.user);
        }
      })
      .catch(err => console.error('Failed to get user info:', err));
  }, []);

  useEffect(() => {
    if (!selectedGuild) return;
    setLoading(true);
    fetch(`/api/warnings?guildId=${selectedGuild}`)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load warnings:', err);
        setLoading(false);
      });
  }, [selectedGuild]);

  const handleDelete = async (warnId, userId) => {
    try {
      const res = await fetch(`/api/warnings/${userId}/${warnId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        setData(prev => prev.map(doc => {
          if (doc.userId === userId) {
            return {
              ...doc,
              warns: doc.warns.filter(w => w._id !== warnId)
            };
          }
          return doc;
        }));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleEdit = (warn, userId) => {
    setEditing({ warnId: warn._id, userId });
    setEditReason(warn.reason);
  };

  const submitEdit = async () => {
    try {
      const res = await fetch(`/api/warnings/${editing.userId}/${editing.warnId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: editReason })
      });
      const result = await res.json();
      if (result.success) {
        setData(prev => prev.map(doc => {
          if (doc.userId === editing.userId) {
            return {
              ...doc,
              warns: doc.warns.map(w =>
                w._id === editing.warnId ? { ...w, reason: editReason } : w
              )
            };
          }
          return doc;
        }));
        setEditing(null);
      }
    } catch (err) {
      console.error('Edit failed:', err);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>⚠️ User Warnings</h2>

      {loading && <p>Loading warnings...</p>}
      {!loading && data.length === 0 && <p>No warnings found for this server.</p>}

      {data.map((userDoc) => (
        <div
          key={userDoc._id}
          style={{
            border: '1px solid #5e3a7c',
            borderRadius: '10px',
            margin: '1rem 0',
            padding: '1.5rem',
            background: '#3d2a55',
            color: '#f5f0ff',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
          }}
        >
          <h3>User ID: {userDoc.userId}</h3>
          <p>Guild ID: {userDoc.guildId}</p>
          <ul>
            {userDoc.warns.map((warn, index) => (
              <li key={warn._id || index}>
                <p>📝 <strong>Reason:</strong> {warn.reason}</p>
                <p>👮 <strong>Moderator:</strong> {warn.moderatorId}</p>
                <p>🕒 <strong>Time:</strong> {new Date(warn.timestamp).toLocaleString()}</p>

                {user?.id === SERVER_OWNER_ID && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button style={{ marginRight: '0.5rem' }} onClick={() => handleEdit(warn, userDoc.userId)}>✏️ Edit</button>
                    <button onClick={() => handleDelete(warn._id, userDoc.userId)}>🗑️ Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Edit Modal */}
      {editing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#2a153b', padding: '2rem', borderRadius: '10px',
            minWidth: '300px', color: '#f5f0ff', boxShadow: '0 0 20px rgba(0,0,0,0.6)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Edit Warning Reason</h3>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={4}
              style={{
                width: '100%', padding: '0.75rem', backgroundColor: '#3d2a55',
                border: '1px solid #5e3a7c', color: '#f5f0ff', borderRadius: '6px',
                resize: 'vertical'
              }}
            />
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button
                onClick={() => setEditing(null)}
                style={{ marginRight: '1rem', background: '#5e3a7c', color: '#fff',
                  padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={submitEdit}
                style={{ background: '#8c63af', color: '#fff', padding: '0.5rem 1rem',
                  border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WarningsViewer;