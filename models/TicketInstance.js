const mongoose = require('mongoose');

const TicketInstanceSchema = new mongoose.Schema({
  // Unique ticket identifier (could be the channel ID, or a generated string)
  ticketId: { type: String, required: true, unique: true },

  // Discord user who opened the ticket
  userId: { type: String, required: true },

  // Panel name that was used to open this ticket
  panelName: { type: String, required: true },

  // The Discord channel created for the ticket
  channelId: { type: String, required: true },

  // Status of the ticket (open/closed/archived)
  status: { type: String, default: 'open', enum: ['open', 'closed', 'archived'] },

  // When the ticket was created
  createdAt: { type: Date, default: Date.now },

  // When the ticket was closed (if applicable)
  closedAt: { type: Date },

  // (Optional) Array of staff user IDs who participated
  staff: [{ type: String }],

  // (Optional) Reason or summary of closure
  closeReason: { type: String },

  // (Optional) Modal responses or ticket content
  content: { type: Object },

  // (Optional) User ID of the staff member who claimed this ticket
  claimedBy: { type: String, default: null },
});

module.exports = mongoose.model('TicketInstance', TicketInstanceSchema);