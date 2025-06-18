// models/TimeoutCase.js
const mongoose = require('mongoose');

const TimeoutCaseSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  moderatorId: { type: String, required: true },
  reason: { type: String, required: true },
  duration: { type: Number, required: true }, // in minutes
  timestamp: { type: Date, default: Date.now },
  caseNumber: { type: Number, required: true }
});

// Auto-increment caseNumber per guild before saving
TimeoutCaseSchema.pre('validate', async function (next) {
  if (this.isNew) {
    const lastCase = await this.constructor.findOne({ guildId: this.guildId }).sort('-caseNumber');
    this.caseNumber = lastCase ? lastCase.caseNumber + 1 : 1;
  }
  next();
});

module.exports = mongoose.model('TimeoutCase', TimeoutCaseSchema);