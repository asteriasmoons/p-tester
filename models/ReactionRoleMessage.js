const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReactionRoleMessageSchema = new Schema({
  guildId: String,
  panelName: String,
  channelId: String,
  messageId: String,
  emojiRoleMap: { type: Schema.Types.Mixed, default: {} }, // <--- USE THIS
});

module.exports = mongoose.model('ReactionRoleMessage', ReactionRoleMessageSchema);