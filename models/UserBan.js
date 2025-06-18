// models/UserBan.js
const mongoose = require('mongoose');

const banCaseSchema = new mongoose.Schema({
  case: Number, // unique case number for the server
  reason: String,
  moderatorId: String,
  timestamp: Date
}, { _id: false });

const userBanSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  bans: [banCaseSchema]
});

module.exports = mongoose.model('UserBan', userBanSchema);