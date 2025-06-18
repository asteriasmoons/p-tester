const Autorole = require('../models/Autorole');
const UserKick = require('../models/UserKick');
const modLogger = require('../modLogger');

module.exports = (client) => {
  client.on('guildMemberAdd', async (member) => {
    console.log(`${member.user.tag} joined the server!`);

    // Autorole logic
    try {
      const data = await Autorole.findOne({ guildId: member.guild.id });
      if (data && data.roleIds && data.roleIds.length) {
        for (const roleId of data.roleIds) {
          const role = member.guild.roles.cache.get(roleId);
          if (role) {
            await member.roles.add(role, 'Autorole on join');
            console.log(`Assigned autorole ${role.name} to ${member.user.tag}`);
          }
        }
      }
    } catch (err) {
      console.error(`Error assigning autorole: ${err}`);
    }

    // Kick record logic
    try {
      const kickRecord = await UserKick.findOne({ userId: member.id, guildId: member.guild.id });
      if (kickRecord) {
        // Delete the kick record(s)
        await UserKick.deleteOne({ userId: member.id, guildId: member.guild.id });

        // Log or notify staff here
        await modLogger.logKickCaseDeleted(member.guild, member.id);

        console.log(`Kick cases for user ${member.id} in guild ${member.guild.id} were deleted on rejoin.`);
      }
    } catch (err) {
      console.error(`Error handling kick record: ${err}`);
    }
  });
};