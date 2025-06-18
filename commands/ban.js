const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserBan = require('../models/UserBan');
const GuildCaseCounter = require('../models/GuildCaseCounter');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban users and manage bans')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Ban a user by user ID')
        .addStringOption(opt =>
          opt.setName('userid').setDescription('User ID to ban').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for ban').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Unban a user by user ID and remove their ban cases')
        .addStringOption(opt =>
          opt.setName('userid').setDescription('User ID to unban').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all ban cases in the server')
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View a ban case by its case number')
        .addIntegerOption(opt =>
          opt.setName('case').setDescription('The case number').setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Permission Denied')
            .setDescription('You must have the **Ban Members** permission to use this command.')
            .setColor(0x8202ff)
        ],
        ephemeral: false
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const targetId = interaction.options.getString('userid');
      const reason = interaction.options.getString('reason');

      // Get and increment the case number
      let counter = await GuildCaseCounter.findOne({ guildId });
      if (!counter) {
        counter = new GuildCaseCounter({ guildId });
      }
      const caseNumber = counter.nextCase;
      counter.nextCase += 1;
      await counter.save();

      // DM the user BEFORE banning
      try {
        const bannedUser = await interaction.client.users.fetch(targetId);
        await bannedUser.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('You have been banned')
              .setDescription(`You have been banned from **${interaction.guild.name}**`)
              .addFields(
                { name: 'Reason', value: reason },
                { name: 'Moderator', value: `<@${interaction.user.id}>` },
                { name: 'Case Number', value: `${caseNumber}` }
              )
              .setColor(0x8202ff)
              .setTimestamp()
          ]
        });
      } catch (err) {
        // Could not DM user (privacy settings, etc)
      }

      // Ban the user
      try {
        await interaction.guild.members.ban(targetId, { reason });
      } catch (e) {
        return interaction.reply({
          content: 'Failed to ban user. They may not exist, are already banned, or I lack permissions.',
          ephemeral: false
        });
      }

      // Store ban in database
      let userBans = await UserBan.findOne({ userId: targetId, guildId });
      if (!userBans) {
        userBans = new UserBan({ userId: targetId, guildId, bans: [] });
      }
      userBans.bans.push({
        case: caseNumber,
        reason,
        moderatorId: interaction.user.id,
        timestamp: new Date()
      });
      await userBans.save();

      // Reply to admin
      const embed = new EmbedBuilder()
        .setTitle('User Banned')
        .setDescription(`User ID: \`${targetId}\` has been banned!`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: `<@${interaction.user.id}>` },
          { name: 'Case Number', value: `${caseNumber}` }
        )
        .setColor(0x8202ff)
        .setTimestamp();
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'remove') {
      const targetId = interaction.options.getString('userid');
      // Unban the user
      try {
        await interaction.guild.members.unban(targetId);
      } catch (e) {
        return interaction.reply({
          content: 'Failed to unban user. They may not be banned, or I lack permissions.',
          ephemeral: false
        });
      }

      // Remove all ban cases from DB
      await UserBan.deleteOne({ userId: targetId, guildId });

      const embed = new EmbedBuilder()
        .setTitle('User Unbanned')
        .setDescription(`User ID: \`${targetId}\` has been unbanned and their ban cases removed.`)
        .setColor(0x8202ff)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'list') {
      // List all bans in the server
      const bans = await UserBan.find({ guildId });
      const embed = new EmbedBuilder()
        .setTitle(`All Ban Cases in ${interaction.guild.name}`)
        .setColor(0x8202ff);

      if (!bans.length) {
        embed.setDescription('No ban cases found in this server.');
      } else {
        // Collect all cases with their numbers
        const lines = [];
        bans.forEach(userBan => {
          userBan.bans.forEach((ban) => {
            lines.push(
              `**Case #${ban.case}** | User ID: ${userBan.userId}\n` +
              `> **Reason:** ${ban.reason}\n` +
              `> *by <@${ban.moderatorId}> on <t:${Math.floor(new Date(ban.timestamp || Date.now()).getTime() / 1000)}:d>*\n`
            );
          });
        });
        embed.setDescription(lines.length ? lines.join('\n') : 'No ban cases found.');
      }
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'view') {
      const caseNumber = interaction.options.getInteger('case');
      // Find the case in the server
      const userBan = await UserBan.findOne({ guildId, 'bans.case': caseNumber });
      let ban;
      if (userBan) {
        ban = userBan.bans.find(b => b.case === caseNumber);
      }
      const embed = new EmbedBuilder()
        .setTitle(`Ban Case #${caseNumber}`)
        .setColor(0x8202ff);

      if (!ban) {
        embed.setDescription('No ban case found with that number.');
      } else {
        embed.setDescription(
          `**User ID:** ${userBan.userId}\n` +
          `**Reason:** ${ban.reason}\n` +
          `**Moderator:** <@${ban.moderatorId}>\n` +
          `**Date:** <t:${Math.floor(new Date(ban.timestamp || Date.now()).getTime() / 1000)}:F>`
        );
      }
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};