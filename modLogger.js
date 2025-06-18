// modLogger.js
module.exports = {
  async logKickCaseDeleted(guild, userId) {
    const logChannelId = '1367992634077089913'; // Replace with your actual channel ID
    const logChannel = guild.channels.cache.get(logChannelId);
    if (!logChannel) {
      console.log(`Log channel with ID ${logChannelId} not found in guild ${guild.id}`);
      return;
    }
    try {
      await logChannel.send({
        embeds: [
          {
            title: 'Kick Case Deleted',
            description: `User <@${userId}> (${userId}) rejoined and their kick cases were deleted.`,
            color: 0x57F287,
            timestamp: new Date().toISOString()
          }
        ]
      });
    } catch (error) {
      console.error('Failed to send log message:', error);
    }
  }
};