// models/UserNote.js
const mongoose = require('mongoose');

const userNoteSchema = new mongoose.Schema({
  userId: { type: String, required: true },      // The user the note is about
  guildId: { type: String, required: true },     // The server
  notes: [
    {
      note: String,
      authorId: String,                          // Who wrote the note
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('UserNote', userNoteSchema);