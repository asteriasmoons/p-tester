// commands/kick.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserKick = require('../models/UserKick');
const GuildKickCounter = require('../models/GuildKickCounter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick users and manage kicks')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Kick a user by user ID')
        .addStringOption(opt =>
          opt.setName('userid').setDescription('User ID to kick').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for kick').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all kick cases in the server')
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View a kick case by its case number')
        .addIntegerOption(opt =>
          opt.setName('case').setDescription('The case number').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a kick case by its case number')
        .addIntegerOption(opt =>
          opt.setName('case').setDescription('The case number to remove').setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Permission Denied')
            .setDescription('You must have the **Kick Members** permission to use this command.')
            .setColor(0x00a5b6)
        ]
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const targetId = interaction.options.getString('userid');
      const reason = interaction.options.getString('reason');

      // Get and increment the case number
      let counter = await GuildKickCounter.findOne({ guildId });
      if (!counter) {
        counter = new GuildKickCounter({ guildId });
      }
      const caseNumber = counter.nextCase;
      counter.nextCase += 1;
      await counter.save();

      // DM the user BEFORE kicking
      try {
        const kickedUser = await interaction.client.users.fetch(targetId);
        await kickedUser.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('You have been kicked')
              .setDescription(`You have been kicked from **${interaction.guild.name}**`)
              .addFields(
                { name: 'Reason', value: reason },
                { name: 'Moderator', value: `<@${interaction.user.id}>` },
                { name: 'Case Number', value: `${caseNumber}` }
              )
              .setColor(0x00a5b6)
              .setTimestamp()
          ]
        });
      } catch (err) {
        // Could not DM user (privacy settings, etc)
      }

      // Kick the user
      try {
        const member = await interaction.guild.members.fetch(targetId);
        await member.kick(reason);
      } catch (e) {
        return interaction.reply({
          content: 'Failed to kick user. They may not be in the server, or I lack permissions.'
        });
      }

      // Store kick in database
      let userKicks = await UserKick.findOne({ userId: targetId, guildId });
      if (!userKicks) {
        userKicks = new UserKick({ userId: targetId, guildId, kicks: [] });
      }
      userKicks.kicks.push({
        case: caseNumber,
        reason,
        moderatorId: interaction.user.id,
        timestamp: new Date()
      });
      await userKicks.save();

      // Reply to admin (not ephemeral)
      const embed = new EmbedBuilder()
        .setTitle('User Kicked')
        .setDescription(`User ID: \`${targetId}\` has been kicked!`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: `<@${interaction.user.id}>` },
          { name: 'Case Number', value: `${caseNumber}` }
        )
        .setColor(0x00a5b6)
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'list') {
      // List all kicks in the server
      const kicks = await UserKick.find({ guildId });
      const embed = new EmbedBuilder()
        .setTitle(`All Kick Cases in ${interaction.guild.name}`)
        .setColor(0x00a5b6);

      if (!kicks.length) {
        embed.setDescription('No kick cases found in this server.');
      } else {
        // Collect all cases with their numbers
        const lines = [];
        kicks.forEach(userKick => {
          userKick.kicks.forEach((kick) => {
            lines.push(
              `**Case #${kick.case}** | User ID: ${userKick.userId}\n` +
              `> **Reason:** ${kick.reason}\n` +
              `> *by <@${kick.moderatorId}> on <t:${Math.floor(new Date(kick.timestamp || Date.now()).getTime() / 1000)}:d>*\n`
            );
          });
        });
        embed.setDescription(lines.length ? lines.join('\n') : 'No kick cases found.');
      }
      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'view') {
      const caseNumber = interaction.options.getInteger('case');
      // Find the case in the server
      const userKick = await UserKick.findOne({ guildId, 'kicks.case': caseNumber });
      let kick;
      if (userKick) {
        kick = userKick.kicks.find(k => k.case === caseNumber);
      }
      const embed = new EmbedBuilder()
        .setTitle(`Kick Case #${caseNumber}`)
        .setColor(0x00a5b6);

      if (!kick) {
        embed.setDescription('No kick case found with that number.');
      } else {
        embed.setDescription(
          `**User ID:** ${userKick.userId}\n` +
          `**Reason:** ${kick.reason}\n` +
          `**Moderator:** <@${kick.moderatorId}>\n` +
          `**Date:** <t:${Math.floor(new Date(kick.timestamp || Date.now()).getTime() / 1000)}:F>`
        );
      }
      await interaction.reply({ embeds: [embed] });
    }

    if (sub === 'remove') {
      const caseNumber = interaction.options.getInteger('case');
      // Find the user and remove the kick case
      const userKick = await UserKick.findOne({ guildId, 'kicks.case': caseNumber });
      let removed = false;
      let wasLatest = false;

      // Find the counter for this guild
      let counter = await GuildKickCounter.findOne({ guildId });

      if (userKick) {
        const index = userKick.kicks.findIndex(k => k.case === caseNumber);
        if (index > -1) {
          userKick.kicks.splice(index, 1);
          await userKick.save();
          removed = true;

          // If this was the latest case, decrement the counter
          if (counter && caseNumber === counter.nextCase - 1) {
            counter.nextCase -= 1;
            await counter.save();
            wasLatest = true;
          }
        }
      }
      const embed = new EmbedBuilder()
        .setTitle(`Remove Kick Case #${caseNumber}`)
        .setColor(0x00a5b6);

      if (!removed) {
        embed.setDescription('No kick case found with that number.');
      } else if (wasLatest) {
        embed.setDescription(`Kick case #${caseNumber} has been removed. Counter decremented.`);
      } else {
        embed.setDescription(`Kick case #${caseNumber} has been removed.`);
      }
      await interaction.reply({ embeds: [embed] });
    }
  }
};