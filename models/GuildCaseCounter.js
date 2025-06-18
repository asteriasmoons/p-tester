// models/GuildCaseCounter.js
const mongoose = require('mongoose');
const guildCaseCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  nextCase: { type: Number, default: 1 }
});
module.exports = mongoose.model('GuildCaseCounter', guildCaseCounterSchema);