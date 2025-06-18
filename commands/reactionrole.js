const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ReactionRoleMessage = require('../models/ReactionRoleMessage');

// Helper: Get emoji key (works for custom and unicode)
function parseEmojiInput(emojiInput) {
  // Custom emoji: <a:name:id> or <:name:id>
  const custom = emojiInput.match(/^<a?:\w+:(\d+)>$/);
  if (custom) return custom[1];
  return emojiInput;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Create and manage reaction role panels')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new reaction role panel')
        .addStringOption(opt => opt.setName('name').setDescription('Panel name (unique per server)').setRequired(true))
        .addStringOption(opt => opt.setName('text').setDescription('Message content (if not using embed)').setRequired(false))
        .addStringOption(opt => opt.setName('embed_title').setDescription('Embed title').setRequired(false))
        .addStringOption(opt => opt.setName('embed_description').setDescription('Embed description').setRequired(false))
        .addStringOption(opt => opt.setName('embed_color').setDescription('Embed color (hex, e.g. #00bfff)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a reaction/role pair to an existing panel')
        .addStringOption(opt => opt.setName('name').setDescription('Panel name').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a reaction/role pair from a panel')
        .addStringOption(opt => opt.setName('name').setDescription('Panel name').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji').setRequired(true))
    )
	.addSubcommand(sub =>
  	  sub.setName('delete')
       .setDescription('Delete a reaction role panel')
       .addStringOption(opt => 
      opt.setName('name')
        .setDescription('Panel name')
        .setRequired(true)
    )
),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   * @param {Object} reactionRoleCache
   */
  async execute(interaction, client, reactionRoleCache) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: 'You need the Manage Roles permission.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    // CREATE PANEL
    if (sub === 'create') {
      const panelName = interaction.options.getString('name');
      const text = interaction.options.getString('text');
      const embedTitle = interaction.options.getString('embed_title');
      const embedDescription = interaction.options.getString('embed_description');
      const embedColor = interaction.options.getString('embed_color');

      // Prevent duplicate panel names in the same guild
      const exists = await ReactionRoleMessage.findOne({ guildId: interaction.guild.id, panelName });
      if (exists) {
        return interaction.reply({ content: `A panel named \`${panelName}\` already exists in this server.`, ephemeral: true });
      }

      const channel = interaction.channel;
      let sentMsg;

      if (embedTitle || embedDescription) {
        // Send an embed if any embed field is set
        const embed = new EmbedBuilder()
          .setTitle(embedTitle || null)
          .setDescription(embedDescription || null)
          .setColor(embedColor || '#00bfff');
        sentMsg = await channel.send({ embeds: [embed] });
      } else if (text) {
        // Send a plain text message if no embed fields
        sentMsg = await channel.send({ content: text });
      } else {
        return interaction.reply({ content: 'You must provide either text or embed fields!', ephemeral: true });
      }

      // Save to database with panelName
      const doc = await ReactionRoleMessage.create({
        guildId: interaction.guild.id,
        panelName,
        channelId: channel.id,
        messageId: sentMsg.id,
        emojiRoleMap: {},
      });

	  console.log('Trying to store message in cache with ID:', sentMsg.id);
      // Add to cache
      reactionRoleCache[sentMsg.id] = {
        emojiRoleMap: {},
        panelName,
        channelId: channel.id,
        guildId: interaction.guild.id
      };

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Reaction Role Panel Created')
            .setDescription(`Panel: \`${panelName}\`\nNow use \`/reactionrole add\` to assign emojis and roles!`)
            .setColor(0x00bfff)
        ],
        ephemeral: true
      });
    }

    // ADD TO PANEL
    if (sub === 'add') {
      const panelName = interaction.options.getString('name');
      const emojiInput = interaction.options.getString('emoji');
      const role = interaction.options.getRole('role');
      const emojiKey = parseEmojiInput(emojiInput);

      const data = await ReactionRoleMessage.findOne({ guildId: interaction.guild.id, panelName });
      if (!data) {
        return interaction.reply({ content: 'Panel not found. Please check the name.', ephemeral: true });
      }

      // Ensure emojiRoleMap is an object
      if (!data.emojiRoleMap || typeof data.emojiRoleMap !== "object") {
        data.emojiRoleMap = {};
      }

      // Optional: Prevent duplicate emoji entries
      if (data.emojiRoleMap[emojiKey]) {
        return interaction.reply({ content: 'That emoji is already assigned to a role in this panel.', ephemeral: true });
      }

      // Update mapping (this ADDS, not overwrites)
      data.emojiRoleMap[emojiKey] = role.id;
      data.markModified('emojiRoleMap');
      await data.save();

      // Update cache
      if (!reactionRoleCache[data.messageId]) {
        // If cache was lost, restore from DB
        reactionRoleCache[data.messageId] = {
          emojiRoleMap: { ...data.emojiRoleMap },
          panelName: data.panelName,
          channelId: data.channelId,
          guildId: data.guildId
        };
      } else {
        reactionRoleCache[data.messageId].emojiRoleMap[emojiKey] = role.id;
      }

      // React to the message
      const channel = await interaction.guild.channels.fetch(data.channelId);
      const msg = await channel.messages.fetch(data.messageId);
      try {
        await msg.react(emojiInput);
      } catch (e) {
        return interaction.reply({ content: `Failed to react with that emoji. Make sure it's a valid emoji and the bot can use it.`, ephemeral: true });
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Reaction Role Added')
            .setDescription(`Panel: \`${panelName}\`\nReact with ${emojiInput} to get <@&${role.id}>`)
            .setColor(0x00bfff)
        ],
        ephemeral: true
      });
    }

    // REMOVE FROM PANEL
    if (sub === 'remove') {
      const panelName = interaction.options.getString('name');
      const emojiInput = interaction.options.getString('emoji');
      const emojiKey = parseEmojiInput(emojiInput);

      const data = await ReactionRoleMessage.findOne({ guildId: interaction.guild.id, panelName });
      if (!data) {
        return interaction.reply({ content: 'Panel not found. Please check the name.', ephemeral: true });
      }

      if (!data.emojiRoleMap || !data.emojiRoleMap[emojiKey]) {
        return interaction.reply({ content: 'That emoji is not set for this panel.', ephemeral: true });
      }

      // Remove mapping
      delete data.emojiRoleMap[emojiKey];
      data.markModified('emojiRoleMap');
      await data.save();

      // Update cache
      if (reactionRoleCache[data.messageId]) {
        delete reactionRoleCache[data.messageId].emojiRoleMap[emojiKey];
      }

      // Remove the reaction from the message
      const channel = await interaction.guild.channels.fetch(data.channelId);
      const msg = await channel.messages.fetch(data.messageId);
      // Remove bot's own reaction (if present)
      const reaction = msg.reactions.cache.find(r =>
        (r.emoji.id && r.emoji.id === emojiKey) ||
        (r.emoji.name && r.emoji.name === emojiKey)
      );
      if (reaction) await reaction.users.remove(interaction.client.user.id);

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Reaction Role Removed')
            .setDescription(`Removed ${emojiInput} from panel \`${panelName}\`.`)
            .setColor(0xff0000)
        ],
        ephemeral: true
      });
    }
	// DELETE PANEL
if (sub === 'delete') {
  const panelName = interaction.options.getString('name');

  try {
    const data = await ReactionRoleMessage.findOne({
      guildId: interaction.guild.id,
      panelName,
    });

    if (!data) {
      return await interaction.reply({
        content: 'Panel not found. Please check the name.',
        ephemeral: true,
      });
    }

    try {
      const channel = await interaction.guild.channels.fetch(data.channelId);
      const msg = await channel.messages.fetch(data.messageId);
      await msg.delete();
    } catch (err) {
      console.warn('Could not delete the original message:', err.message);
      // Don't throw — we still want to proceed
    }

    await ReactionRoleMessage.deleteOne({ _id: data._id });

    if (reactionRoleCache && reactionRoleCache[data.messageId]) {
      delete reactionRoleCache[data.messageId];
    } else {
      console.log('Cache did not contain this panel, skipping cache cleanup.');
    }

    return await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('Reaction Role Panel Deleted')
          .setDescription(`Panel \`${panelName}\` has been deleted.`)
          .setColor(0xff0000),
      ],
      ephemeral: true,
    });
  } catch (err) {
    console.error('Something went wrong inside /reactionrole delete:', err);
    if (!interaction.replied && !interaction.deferred) {
      return await interaction.reply({
        content: 'Something went wrong while deleting the panel.',
        ephemeral: true,
      });
    }
  }
}
  }
};