// commands/note.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserNote = require('../models/UserNote');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add, view, or remove notes about a user')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a note about a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to note about').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('text').setDescription('Note text').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View notes about a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to view notes for').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a note from a user')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to remove note from').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('number').setDescription('Note number to remove (as shown in view)').setRequired(true)
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
      const text = interaction.options.getString('text');
      let userNotes = await UserNote.findOne({ userId: user.id, guildId });
      if (!userNotes) {
        userNotes = new UserNote({ userId: user.id, guildId, notes: [] });
      }
      userNotes.notes.push({ note: text, authorId: interaction.user.id });
      await userNotes.save();

      const embed = new EmbedBuilder()
        .setTitle('Note Added')
        .setDescription(`A note for <@${user.id}> has been added!`)
        .addFields(
          { name: 'Note', value: text },
          { name: 'Author', value: `<@${interaction.user.id}>` }
        )
        .setColor(0x00cdcd)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'view') {
      const userNotes = await UserNote.findOne({ userId: user.id, guildId });
      const embed = new EmbedBuilder()
        .setTitle(`Notes for ${user.tag}`)
        .setColor(0x00cdcd)
        .setThumbnail(user.displayAvatarURL());

      if (!userNotes || userNotes.notes.length === 0) {
        embed.setDescription('No notes found for this user.');
      } else {
        embed.setDescription(
          userNotes.notes
            .map(
              (n, i) =>
                `**#${i + 1}** - ${n.note}\n*by <@${n.authorId}> on <t:${Math.floor(
                  new Date(n.timestamp || Date.now()).getTime() / 1000
                )}:d>*`
            )
            .join('\n\n')
        );
      }
      await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    if (sub === 'remove') {
      const number = interaction.options.getInteger('number');
      const userNotes = await UserNote.findOne({ userId: user.id, guildId });

      if (!userNotes || userNotes.notes.length < number || number < 1) {
        const embed = new EmbedBuilder()
          .setTitle('Error')
          .setDescription('Invalid note number.')
          .setColor(0x00cdcd);
        await interaction.reply({ embeds: [embed], ephemeral: false });
        return;
      }

      const removed = userNotes.notes.splice(number - 1, 1);
      await userNotes.save();

      const embed = new EmbedBuilder()
        .setTitle('Note Removed')
        .setDescription(`Removed note #${number} from <@${user.id}>:`)
        .addFields(
          { name: 'Note', value: removed[0].note },
          { name: 'Author', value: `<@${removed[0].authorId}>` }
        )
        .setColor(0x00cdcd)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });
    }
  }
};