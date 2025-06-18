const ReactionRoleMessage = require('../models/ReactionRoleMessage');
const { EmbedBuilder } = require('discord.js');

function getEmojiKey(emoji) {
    return emoji.id ? emoji.id : emoji.name;
}

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user) {
        try {
            console.log('=== Reaction Role Remove Debug ===');
            console.log('Event triggered by user:', user.tag);

            if (user.bot) {
                console.log('Ignored: Bot user');
                return;
            }

            if (reaction.partial) {
                console.log('Fetching partial reaction...');
                await reaction.fetch();
            }

            if (!reaction.message.guild) {
                console.log('Ignored: Not in a guild');
                return;
            }

            console.log('Looking for message ID:', reaction.message.id);

            const data = await ReactionRoleMessage.findOne({ messageId: reaction.message.id });
            console.log('Database data found:', data);

            if (!data) {
                console.log('No reaction role data found for this message');
                return;
            }

            const emojiKey = getEmojiKey(reaction.emoji);
            console.log('Emoji removed:', emojiKey);
            console.log('Available emoji-role mappings:', data.emojiRoleMap);

            const roleId = data.emojiRoleMap[emojiKey];
            if (!roleId) {
                console.log('No role found for this emoji');
                return;
            }
            console.log('Role ID to remove:', roleId);

            const member = await reaction.message.guild.members.fetch(user.id);
            if (!member) {
                console.log('Could not fetch member');
                return;
            }

            try {
                const role = await reaction.message.guild.roles.fetch(roleId);
                await member.roles.remove(roleId);
                console.log(`Successfully removed role ${roleId} from user ${user.tag}`);

                // Create and send confirmation embed
                const confirmEmbed = new EmbedBuilder()
                    .setColor('#4a40bf')
                    .setTitle('Role Removed!')
                    .setDescription(`The **${role.name}** role has been removed`)
                    .setFooter({ text: 'React with the emoji again to get the role back' });

                await user.send({ embeds: [confirmEmbed] }).catch(() => {
                    // If DM fails, send to the channel instead
                    reaction.message.channel.send({ 
                        content: `${user}`,
                        embeds: [confirmEmbed] 
                    }).then(msg => {
                        // Delete the message after 5 seconds
                        setTimeout(() => msg.delete().catch(() => {}), 5000);
                    });
                });

            } catch (error) {
                console.error('Error removing role:', error);
            }

        } catch (error) {
            console.error('Error in messageReactionRemove:', error);
        }
    }
};