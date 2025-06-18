// models/UserKick.js
const mongoose = require('mongoose');

const kickCaseSchema = new mongoose.Schema({
  case: Number, // unique per guild
  reason: String,
  moderatorId: String,
  timestamp: Date
}, { _id: false });

const userKickSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  kicks: [kickCaseSchema]
});

module.exports = mongoose.model('UserKick', userKickSchema);