const mongoose = require('mongoose');

const GuildSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  transcriptChannelId: { type: String, default: null },
  staffRoleId: String,
  // Add more settings as needed
});

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);