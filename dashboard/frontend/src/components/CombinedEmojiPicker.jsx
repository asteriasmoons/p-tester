// src/components/CombinedEmojiPicker.jsx
import { useEffect, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import '../../PanelEditor.css';

export default function CombinedEmojiPicker({ guildId, onEmojiSelect, closePicker }) {
  const [customEmojis, setCustomEmojis] = useState([]);

  useEffect(() => {
    fetch(`/api/emojis/${guildId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) setCustomEmojis(json.emojis);
      })
      .catch(console.error);
  }, [guildId]);

  const handleCustomEmojiClick = (emoji) => {
    const emojiStr = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
    onEmojiSelect({ emoji: emojiStr });
    closePicker();
  };

  return (
    <div className="emoji-picker-overlay">
      <div className="custom-emoji-section">
        <h4>Custom Emojis</h4>
        <div className="custom-emoji-list">
          {customEmojis.map(emoji => (
            <img
              key={emoji.id}
              src={`https://cdn.discordapp.com/emojis/${emoji.id}${emoji.animated ? '.gif' : '.png'}`}
              alt={emoji.name}
              title={emoji.name}
              className="custom-emoji"
              onClick={() => handleCustomEmojiClick(emoji)}
            />
          ))}
        </div>
      </div>
      <EmojiPicker theme="dark" onEmojiClick={(emojiData) => { onEmojiSelect(emojiData); closePicker(); }} />
    </div>
  );
}