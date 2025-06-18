// models/GuildKickCounter.js
const mongoose = require('mongoose');
const guildKickCounterSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  nextCase: { type: Number, default: 1 }
});
module.exports = mongoose.model('GuildKickCounter', guildKickCounterSchema);