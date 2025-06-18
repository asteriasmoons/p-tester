import { useEffect, useState } from 'react';
import CombinedEmojiPicker from './CombinedEmojiPicker';
import '../../PanelEditor.css';

function PanelEditor({ panel, onSave, onCancel, categories = [], guildId }) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    color: '#5865F2',
    emoji: '',
    categoryId: '',
    transcriptsEnabled: false
  });

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (panel) {
      setFormData({
        name: panel.name || '',
        title: panel.embed?.title || '',
        description: panel.embed?.description || '',
        color: panel.embed?.color || '#5865F2',
        emoji: panel.emoji || '',
        categoryId: panel.categoryId || '',
        transcriptsEnabled: panel.transcript || false
      });
    }
  }, [panel]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEmojiSelect = (emojiData) => {
    setFormData(prev => ({ ...prev, emoji: emojiData.emoji }));
    setShowEmojiPicker(false);
  };

  const emojiPreview = formData.emoji.startsWith('<')
    ? <img 
        src={`https://cdn.discordapp.com/emojis/${formData.emoji.match(/\d+/)}.png`}
        style={{ height: '1.2rem', verticalAlign: 'middle' }}
        alt="emoji"
      />
    : formData.emoji;

  return (
    <div className="panel-editor-container">
      <h2>🎟️ Ticket Panels</h2>
      <div className="panel-editor-form">
        <h3>{panel ? 'Edit Panel' : 'Create Panel'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }}>
          <div className="form-grid">
            <label>
              Panel Name:
              <input name="name" value={formData.name} onChange={handleChange} required />
            </label>

            <label>
              Embed Title:
              <input name="title" value={formData.title} onChange={handleChange} />
            </label>

            <label>
              Embed Description:
              <textarea name="description" value={formData.description} onChange={handleChange} />
            </label>

            <label>
              Embed Color:
              <input name="color" type="color" value={formData.color} onChange={handleChange} />
            </label>

            <label>
              Emoji:
              <button
                type="button"
                className="emoji-picker-button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
              >
                {formData.emoji ? emojiPreview : 'Select Emoji'}
              </button>
              {showEmojiPicker && (
                <CombinedEmojiPicker
                  guildId={guildId}
                  onEmojiSelect={handleEmojiSelect}
                  closePicker={() => setShowEmojiPicker(false)}
                />
              )}
            </label>

            <label>
              Category:
              <select name="categoryId" value={formData.categoryId} onChange={handleChange}>
                <option value="">-- Select Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <label className="checkbox">
              Enable Transcripts:
              <input
                type="checkbox"
                name="transcriptsEnabled"
                checked={formData.transcriptsEnabled}
                onChange={handleChange}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onCancel}>Cancel</button>
          </div>
        </form>
      </div>

      <div className="panel-preview">
        <h3>Live Preview</h3>
        <div className="embed-preview" style={{ borderLeftColor: formData.color }}>
          <div className="embed-title">{formData.title || 'Embed Title'}</div>
          <div className="embed-description">
            {formData.description || 'Embed description'}
          </div>
        </div>
        <button className="embed-button">
          {emojiPreview && <span style={{ marginRight: '0.5rem' }}>{emojiPreview}</span>}
          Open Ticket
        </button>
      </div>
    </div>
  );
}

export default PanelEditor;