const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserWarn = require('../models/UserWarn'); // Adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn users and manage warnings')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Warn a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to warn').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for warning').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View warnings for a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to view warnings for').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a warning from a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to remove warning from').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('number').setDescription('Warning number to remove (as shown in view)').setRequired(true)
        )
    ),
  async execute(interaction) {
    // Admin-only check
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const embed = new EmbedBuilder()
        .setTitle('Permission Denied')
        .setDescription('You must have the **Administrator** permission to use this command.')
        .setColor(0xff4fa6);
      await interaction.reply({ embeds: [embed], ephemeral: false });
      return;
    }

    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    if (sub === 'add') {
      const reason = interaction.options.getString('reason');
      let userWarns = await UserWarn.findOne({ userId: user.id, guildId });
      if (!userWarns) {
        userWarns = new UserWarn({ userId: user.id, guildId, warns: [] });
      }
      userWarns.warns.push({ reason, moderatorId: interaction.user.id, timestamp: new Date() });
      await userWarns.save();

      // Prepare admin reply embed
      const embed = new EmbedBuilder()
        .setTitle('User Warned')
        .setDescription(`<@${user.id}> has been warned!`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: `<@${interaction.user.id}>` }
        )
        .setColor(0xff4fa6)
        .setTimestamp();

      // Reply to the admin as soon as possible
      await interaction.reply({ embeds: [embed], ephemeral: false });

      // Then try to DM the user (in the background)
      try {
        await user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('You have been warned')
              .setDescription(`You were warned in **${interaction.guild.name}**`)
              .addFields(
                { name: 'Reason', value: reason },
                { name: 'Moderator', value: `<@${interaction.user.id}>` }
              )
              .setColor(0xff4fa6)
              .setTimestamp()
          ]
        });
      } catch (err) {
        // Optionally log DM failures here
      }
    }

    if (sub === 'view') {
      const userWarns = await UserWarn.findOne({ userId: user.id, guildId });
      const embed = new EmbedBuilder()
        .setTitle(`Warnings for ${user.tag}`)
        .setColor(0xff4fa6)
        .setThumbnail(user.displayAvatarURL());

      if (!userWarns || userWarns.warns.length === 0) {
        embed.setDescription('No warnings found for this user.');
      } else {
        embed.setDescription(
          userWarns.warns
            .map(
              (w, i) =>
                `**#${i + 1}** - ${w.reason}\n*by <@${w.moderatorId}> on <t:${Math.floor(
                  new Date(w.timestamp || Date.now()).getTime() / 1000
                )}:d>*`
            )
            .join('\n\n')
        );
      }
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'remove') {
      const number = interaction.options.getInteger('number');
      const userWarns = await UserWarn.findOne({ userId: user.id, guildId });

      if (!userWarns || userWarns.warns.length < number || number < 1) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('Invalid warning number.')
          .setColor(0xff4fa6);
        await interaction.reply({ embeds: [embed], ephemeral: false });
        return;
      }

      const removed = userWarns.warns.splice(number - 1, 1);
      await userWarns.save();

      const embed = new EmbedBuilder()
        .setTitle('Warning Removed')
        .setDescription(`Removed warning #${number} from <@${user.id}>:`)
        .addFields(
          { name: 'Reason', value: removed[0].reason },
          { name: 'Moderator', value: `<@${removed[0].moderatorId}>` }
        )
        .setColor(0xff4fa6)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};