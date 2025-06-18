const mongoose = require('mongoose');

const userWarnSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  warns: [
    {
      reason: String,
      moderatorId: String,
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

module.exports = mongoose.model('UserWarn', userWarnSchema);