// commands/timeout.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const TimeoutCase = require('../models/TimeoutCase');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout management commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Timeout a member')
        .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption(o => o.setName('minutes').setDescription('Timeout duration (minutes)').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for timeout').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a timeout from a member')
        .addUserOption(o => o.setName('user').setDescription('User to untimeout').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for removing timeout').setRequired(false))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all timeouts in this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View a specific timeout case')
        .addIntegerOption(o => o.setName('case').setDescription('Case number').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Helper for error embeds
    function errorEmbed(msg) {
      return new EmbedBuilder()
        .setTitle('Error')
        .setDescription(msg)
        .setColor(0xff8102);
    }

    // Helper for success embeds
    function successEmbed(msg) {
      return new EmbedBuilder()
        .setTitle('Success')
        .setDescription(msg)
        .setColor(0xff8102);
    }

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason');
      let member;
      try {
        member = await interaction.guild.members.fetch(user.id);
      } catch {
        return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: false });
      }

      if (!member.moderatable) {
        return interaction.reply({ embeds: [errorEmbed('I cannot timeout this member.')], ephemeral: false });
      }

      try {
        await member.timeout(minutes * 60 * 1000, reason);

        // Save to DB
        const timeoutCase = await TimeoutCase.create({
          guildId,
          userId: user.id,
          moderatorId: interaction.user.id,
          reason,
          duration: minutes,
          timestamp: Date.now(),
        });

        const embed = new EmbedBuilder()
          .setTitle('Member Timed Out')
          .setColor(0xff8102)
          .addFields(
            { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Duration', value: `${minutes} minutes`, inline: true },
            { name: 'Reason', value: reason, inline: false },
            { name: 'Case #', value: timeoutCase.caseNumber.toString(), inline: true }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        return interaction.reply({ embeds: [errorEmbed('Failed to timeout member. Make sure I have the correct permissions and role position.')], ephemeral: false });
      }
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      let member;
      try {
        member = await interaction.guild.members.fetch(user.id);
      } catch {
        return interaction.reply({ embeds: [errorEmbed('Could not find that member in this server.')], ephemeral: false });
      }

      try {
        await member.timeout(null, reason); // Remove timeout
        const embed = new EmbedBuilder()
          .setTitle('Timeout Removed')
          .setColor(0xff8102)
          .addFields(
            { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
            { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Reason', value: reason, inline: false }
          )
          .setTimestamp();
        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error(err);
        return interaction.reply({ embeds: [errorEmbed('Failed to remove timeout. Make sure I have the correct permissions and role position.')], ephemeral: true });
      }
    }

    if (sub === 'list') {
      const cases = await TimeoutCase.find({ guildId }).sort({ timestamp: -1 }).limit(10);
      if (!cases.length) {
        return interaction.reply({ embeds: [errorEmbed('No timeouts found in this server.')] });
      }
      const embed = new EmbedBuilder()
        .setTitle('Timeout Cases')
        .setColor(0xff8102)
        .setTimestamp();
      for (const c of cases) {
        embed.addFields({
          name: `Case #${c.caseNumber}`,
          value: [
            `User: <@${c.userId}>`,
            `Moderator: <@${c.moderatorId}>`,
            `Duration: ${c.duration} min`,
            `Reason: ${c.reason}`,
            `Time: <t:${Math.floor(c.timestamp / 1000)}:F>`
          ].join('\n'),
          inline: false
        });
      }
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'view') {
      const caseNumber = interaction.options.getInteger('case');
      const timeoutCase = await TimeoutCase.findOne({ guildId, caseNumber });
      if (!timeoutCase) {
        return interaction.reply({ embeds: [errorEmbed('Timeout case not found.')] });
      }
      const embed = new EmbedBuilder()
        .setTitle(`Timeout Case #${timeoutCase.caseNumber}`)
        .setColor(0xff8102)
        .addFields(
          { name: 'User', value: `<@${timeoutCase.userId}> (${timeoutCase.userId})`, inline: true },
          { name: 'Moderator', value: `<@${timeoutCase.moderatorId}>`, inline: true },
          { name: 'Duration', value: `${timeoutCase.duration} minutes`, inline: true },
          { name: 'Reason', value: timeoutCase.reason, inline: false },
          { name: 'Timestamp', value: `<t:${Math.floor(timeoutCase.timestamp / 1000)}:F>`, inline: false }
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};