// interactionCreate.js
const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const EmbedModel = require('../models/Embed');
const TicketPanel = require('../models/TicketPanel');
const TicketInstance = require('../models/TicketInstance');
const { buildEmbed } = require('../utils/embedEditorUI');
const { sendGreetingEmbedEditor } = require('../events/ticketPanelUi');

async function generateTranscript(channel) {
  let messages = [];
  let lastId;
  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastId });
    messages = messages.concat(Array.from(fetched.values()));
    if (fetched.size !== 100) break;
    lastId = fetched.last()?.id;
  }
  messages = messages.reverse();

  let transcript = '';
  for (const msg of messages) {
    transcript += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
  }
  return Buffer.from(transcript, 'utf-8');
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    function isStaff(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);
}

    // === BUTTON HANDLERS ===
    if (interaction.isButton()) {
      // --- TICKETPANEL: Toggle Transcript ---
      if (interaction.customId.startsWith('ticketpanel_toggle_transcript:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) {
          return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        }
        panel.transcriptsEnabled = !panel.transcriptsEnabled;
        await panel.save();
        return interaction.reply({
          content: `Transcript generation has been **${panel.transcriptsEnabled ? 'enabled' : 'disabled'}** for this panel.`,
        });
      }

      // --- TICKETPANEL: Publish Preview ---
      if (interaction.customId.startsWith('ticketpanel_publish_preview:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) {
          return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        }

        const channel = interaction.guild.channels.cache.get(panel.postChannelId);
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({ content: 'Panel post channel is invalid or not set.', ephemeral: false });
        }

        const button = new ButtonBuilder()
          .setCustomId(`open_ticket_modal:${panel.panelName}`)
          .setLabel(panel.buttonLabel || 'Open Ticket')
          .setStyle(ButtonStyle.Secondary);

        if (panel.emoji) button.setEmoji(panel.emoji);

        const row = new ActionRowBuilder().addComponents(button);

        const embed = new EmbedBuilder()
       .setTitle(panel.embed?.title || 'Need Help?')
       .setDescription(panel.embed?.description || 'Click the button below to open a ticket.')
       .setColor(panel.embed?.color || 0x5865F2);

       // FIX: Always map icon_url to iconURL
      if (panel.embed?.author?.name || panel.embed?.author?.icon_url) {
        embed.setAuthor({
      name: panel.embed.author.name || "",
      iconURL: panel.embed.author.icon_url || undefined
    });
  }
    if (panel.embed?.footer?.text || panel.embed?.footer?.icon_url) {
      embed.setFooter({
      text: panel.embed.footer.text || "",
      iconURL: panel.embed.footer.icon_url || undefined
    });
  }
    if (panel.embed?.thumbnail) embed.setThumbnail(panel.embed.thumbnail);
    if (panel.embed?.image) embed.setImage(panel.embed.image);

        await channel.send({ embeds: [embed], components: [row] });

        return interaction.reply({
          content: `Ticket panel preview has been posted to <#${channel.id}>.`,
        });
      }

      // --- EMBED EDITOR BUTTON HANDLER (for /embed command) ---
      const [prefix, action, section, embedId] = interaction.customId.split('_');
      if (prefix === 'embed' && action === 'edit') {
        const doc = await EmbedModel.findById(embedId);
        if (!doc) return interaction.reply({ content: 'Embed not found.' });

        if (section === 'basic') {
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_basic_${embedId}`)
            .setTitle('Edit Basic Info')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('title')
                  .setLabel('Title')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.title || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('description')
                  .setLabel('Description')
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(false)
                  .setValue(doc.description || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('color')
                  .setLabel('Hex Color (e.g. #993377)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.color || '#993377')
              )
            );
          return interaction.showModal(modal);
        }

        if (section === 'author') {
          if (!doc.author) doc.author = {};
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_author_${embedId}`)
            .setTitle('Edit Author')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('author_name')
                  .setLabel('Author Name')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.author?.name || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('author_icon')
                  .setLabel('Author Icon URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.author?.icon_url || '')
              )
            );
          return interaction.showModal(modal);
        }

        if (section === 'footer') {
          if (!doc.footer) doc.footer = {};
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_footer_${embedId}`)
            .setTitle('Edit Footer')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('footer_text')
                  .setLabel('Footer Text')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.footer?.text || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('footer_icon')
                  .setLabel('Footer Icon URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.footer?.icon_url || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('footer_timestamp')
                  .setLabel('Add Timestamp? (yes/no)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.footer?.timestamp ? 'yes' : 'no')
              )
            );
          return interaction.showModal(modal);
        }

        if (section === 'images') {
          const modal = new ModalBuilder()
            .setCustomId(`embed_modal_images_${embedId}`)
            .setTitle('Edit Images')
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('thumbnail')
                  .setLabel('Thumbnail URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.thumbnail || '')
              ),
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId('image')
                  .setLabel('Main Image URL')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(false)
                  .setValue(doc.image || '')
              )
            );
          return interaction.showModal(modal);
        }
      }

      // === New Ticket Panel Embed Editors ===

      // 📝 Edit Greeting Modal
      // if (interaction.customId.startsWith('ticketpanel_edit_greeting:')) {
       // const panelId = interaction.customId.split(':')[1];
       // const panel = await TicketPanel.findById(panelId);
       // if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });

      //  const modal = new ModalBuilder()
        //  .setCustomId(`ticketpanel_modal_greeting:${panelId}`)
        //  .setTitle('Set Greeting Message')
         // .addComponents(
          //  new ActionRowBuilder().addComponents(
             // new TextInputBuilder()
               // .setCustomId('greeting_text')
              //  .setLabel('Message shown when ticket is opened')
              //  .setStyle(TextInputStyle.Paragraph)
               // .setRequired(true)
              //  .setValue(panel.greeting || '')
           // )
        //  );
       // return interaction.showModal(modal);
      // }

  // --- Greeting Embed Editor UI ---
  if (interaction.customId.startsWith('ticketpanel_edit_greeting_embed:')) {
    const panelId = interaction.customId.split(':')[1];
    const panel = await TicketPanel.findById(panelId);
    if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
    return sendGreetingEmbedEditor(interaction, panel);
  }

  // --- Greeting Embed: Edit Basic Info ---
  if (interaction.customId.startsWith('greeting_edit_embed_basic:')) {
    const panelId = interaction.customId.split(':')[1];
    const panel = await TicketPanel.findById(panelId);
    if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
    const ge = panel.greetingEmbed || {};
    const modal = new ModalBuilder()
      .setCustomId(`greeting_modal_embed_basic:${panelId}`)
      .setTitle('Edit Greeting Embed - Basic Info')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.title || ''),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setValue(ge.description || ''),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('color')
            .setLabel('Embed Color (Hex)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.color || '#5103aa')
        )
      );
    return interaction.showModal(modal);
  }

  // --- Greeting Embed: Edit Author ---
  if (interaction.customId.startsWith('greeting_edit_embed_author:')) {
    const panelId = interaction.customId.split(':')[1];
    const panel = await TicketPanel.findById(panelId);
    if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
    const ge = panel.greetingEmbed || {};
    const modal = new ModalBuilder()
      .setCustomId(`greeting_modal_embed_author:${panelId}`)
      .setTitle('Edit Greeting Embed - Author')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('author_name')
            .setLabel('Author Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.author?.name || '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('author_icon')
            .setLabel('Author Icon URL')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.author?.icon_url || '')
        )
      );
    return interaction.showModal(modal);
  }

  // --- Greeting Embed: Edit Footer ---
  if (interaction.customId.startsWith('greeting_edit_embed_footer:')) {
    const panelId = interaction.customId.split(':')[1];
    const panel = await TicketPanel.findById(panelId);
    if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
    const ge = panel.greetingEmbed || {};
    const modal = new ModalBuilder()
      .setCustomId(`greeting_modal_embed_footer:${panelId}`)
      .setTitle('Edit Greeting Embed - Footer')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('footer_text')
            .setLabel('Footer Text')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.footer?.text || '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('footer_icon')
            .setLabel('Footer Icon URL')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.footer?.icon_url || '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('footer_timestamp')
            .setLabel('Add Timestamp? (yes/no)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.footer?.timestamp ? 'yes' : 'no')
        )
      );
    return interaction.showModal(modal);
  }

  // --- Greeting Embed: Edit Images ---
  if (interaction.customId.startsWith('greeting_edit_embed_images:')) {
    const panelId = interaction.customId.split(':')[1];
    const panel = await TicketPanel.findById(panelId);
    if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
    const ge = panel.greetingEmbed || {};
    const modal = new ModalBuilder()
      .setCustomId(`greeting_modal_embed_images:${panelId}`)
      .setTitle('Edit Greeting Embed - Images')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('thumbnail')
            .setLabel('Thumbnail URL')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.thumbnail || '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('image')
            .setLabel('Main Image URL')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setValue(ge.image || '')
        )
      );
    return interaction.showModal(modal);
  }

      // ==== FULL TICKET PANEL EMBED EDIT MODALS ====

      // Basic
      if (interaction.customId.startsWith('ticketpanel_edit_embed_basic:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });

        const modal = new ModalBuilder()
          .setCustomId(`ticketpanel_modal_embed_basic:${panelId}`)
          .setTitle('Edit Ticket Panel Embed - Basic Info')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('title')
                .setLabel('Title')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.title || '')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('description')
                .setLabel('Description')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false)
                .setValue(panel.embed?.description || '')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('color')
                .setLabel('Embed Color (Hex)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.color || '#7d04c3')
            )
          );
        return interaction.showModal(modal);
      }

      // Author
      if (interaction.customId.startsWith('ticketpanel_edit_embed_author:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });

        const modal = new ModalBuilder()
          .setCustomId(`ticketpanel_modal_embed_author:${panelId}`)
          .setTitle('Edit Ticket Panel Embed - Author')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('author_name')
                .setLabel('Author Name')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.author?.name || '')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('author_icon')
                .setLabel('Author Icon URL')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.author?.icon_url || '')
            )
          );
        return interaction.showModal(modal);
      }

      // Footer
      if (interaction.customId.startsWith('ticketpanel_edit_embed_footer:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });

        const modal = new ModalBuilder()
          .setCustomId(`ticketpanel_modal_embed_footer:${panelId}`)
          .setTitle('Edit Ticket Panel Embed - Footer')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('footer_text')
                .setLabel('Footer Text')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.footer?.text || '')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('footer_icon')
                .setLabel('Footer Icon URL')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.footer?.icon_url || '')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('footer_timestamp')
                .setLabel('Add Timestamp? (yes/no)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.footer?.timestamp ? 'yes' : 'no')
            )
          );
        return interaction.showModal(modal);
      }

      // Images
      if (interaction.customId.startsWith('ticketpanel_edit_embed_images:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });

        const modal = new ModalBuilder()
          .setCustomId(`ticketpanel_modal_embed_images:${panelId}`)
          .setTitle('Edit Ticket Panel Embed - Images')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('thumbnail')
                .setLabel('Thumbnail URL')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.thumbnail || '')
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('image')
                .setLabel('Main Image URL')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(panel.embed?.image || '')
            )
          );
        return interaction.showModal(modal);
      }

      // 🎭 Set Emoji via message
      if (interaction.customId.startsWith('ticketpanel_set_emoji:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });

        await interaction.reply({
          content: 'Please send the emoji you want to use (standard or custom). You have 30 seconds.',
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 180000 });

        collector.on('collect', async msg => {
          const emoji = msg.content.trim();
          const isCustom = /^<a?:\w+:\d+>$/.test(emoji);
          const isUnicode = /\p{Emoji}/u.test(emoji);

          if (!isCustom && !isUnicode) {
            return msg.reply('Invalid emoji. Please use a standard or custom emoji.');
          }

          panel.emoji = emoji;
          await panel.save();

          await msg.reply(`Emoji set to ${emoji}`);
        });

        collector.on('end', collected => {
          if (!collected.size) {
            interaction.followUp({ content: 'Emoji input timed out.', ephemeral: false });
          }
        });
      }
    }

    // --- OPEN TICKET BUTTON HANDLER ---
if (interaction.isButton() && interaction.customId.startsWith('open_ticket_modal:')) {
  const panelName = interaction.customId.split(':')[1];
  // Find the panel to make sure it exists (optional)
  const panel = await TicketPanel.findOne({
    guildId: interaction.guild.id,
    panelName
  });
  if (!panel) {
    return interaction.reply({
      content: `Ticket panel \`${panelName}\` not found.`,
      ephemeral: false
    });
  }
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_submit:${panelName}`)
    .setTitle('Open a Ticket')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('issue')
          .setLabel('Describe your issue')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
      )
    );
  return interaction.showModal(modal);
}

    // === MODAL HANDLERS ===
    if (interaction.isModalSubmit()) {
      // /embed command modals (leave as is)
      const [prefix, type, section, embedId] = interaction.customId.split('_');
      if (prefix === 'embed' && type === 'modal') {
        const doc = await EmbedModel.findById(embedId);
        if (!doc) return interaction.reply({ content: 'Embed not found.' });

        function emptyToNull(str) {
          return (typeof str === 'string' && str.trim() === '') ? null : str;
        }

        if (section === 'basic') {
          doc.title = emptyToNull(interaction.fields.getTextInputValue('title'));
          doc.description = emptyToNull(interaction.fields.getTextInputValue('description'));
          doc.color = emptyToNull(interaction.fields.getTextInputValue('color')) || '#993377';
        }

        if (section === 'author') {
          if (!doc.author) doc.author = {};
          doc.author.name = emptyToNull(interaction.fields.getTextInputValue('author_name'));
          doc.author.icon_url = emptyToNull(interaction.fields.getTextInputValue('author_icon'));
        }

        if (section === 'footer') {
          if (!doc.footer) doc.footer = {};
          doc.footer.text = emptyToNull(interaction.fields.getTextInputValue('footer_text'));
          doc.footer.icon_url = emptyToNull(interaction.fields.getTextInputValue('footer_icon'));
          const timestampInput = interaction.fields.getTextInputValue('footer_timestamp').toLowerCase();
          doc.footer.timestamp = timestampInput === 'yes' || timestampInput === 'true';
        }

        if (section === 'images') {
          doc.thumbnail = emptyToNull(interaction.fields.getTextInputValue('thumbnail'));
          doc.image = emptyToNull(interaction.fields.getTextInputValue('image'));
        }

        await doc.save();

        return interaction.update({
          content: `**Editing Embed:** \`${doc.name}\` (updated!)`,
          embeds: [buildEmbed(doc)],
          components: [
            new ActionRowBuilder().addComponents(
              ...[
                { label: 'Edit Basic Info', id: 'basic', style: 'Secondary' },
                { label: 'Edit Author', id: 'author', style: 'Secondary' },
                { label: 'Edit Footer', id: 'footer', style: 'Secondary' },
                { label: 'Edit Images', id: 'images', style: 'Secondary' }
              ].map(btn =>
                new ButtonBuilder()
                  .setCustomId(`embed_edit_${btn.id}_${doc._id}`)
                  .setLabel(btn.label)
                  .setStyle(ButtonStyle[btn.style])
              )
            )
          ]
        });
      }

      // --- Greeting Embed: Save Basic Info ---
if (interaction.customId.startsWith('greeting_modal_embed_basic:')) {
  const panelId = interaction.customId.split(':')[1];
  const panel = await TicketPanel.findById(panelId);
  if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
  function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
  if (!panel.greetingEmbed) panel.greetingEmbed = {};
  panel.greetingEmbed.title = emptyToNull(interaction.fields.getTextInputValue('title'));
  panel.greetingEmbed.description = emptyToNull(interaction.fields.getTextInputValue('description'));
  panel.greetingEmbed.color = emptyToNull(interaction.fields.getTextInputValue('color')) || '#5103aa';
  await panel.save();
  return interaction.reply({ content: 'Greeting embed (basic info) updated.' });
}

// --- Greeting Embed: Save Author ---
if (interaction.customId.startsWith('greeting_modal_embed_author:')) {
  const panelId = interaction.customId.split(':')[1];
  const panel = await TicketPanel.findById(panelId);
  if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
  function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
  if (!panel.greetingEmbed) panel.greetingEmbed = {};
  if (!panel.greetingEmbed.author) panel.greetingEmbed.author = {};
  panel.greetingEmbed.author.name = emptyToNull(interaction.fields.getTextInputValue('author_name'));
  panel.greetingEmbed.author.icon_url = emptyToNull(interaction.fields.getTextInputValue('author_icon'));
  await panel.save();
  return interaction.reply({ content: 'Greeting embed (author) updated.' });
}

// --- Greeting Embed: Save Footer ---
if (interaction.customId.startsWith('greeting_modal_embed_footer:')) {
  const panelId = interaction.customId.split(':')[1];
  const panel = await TicketPanel.findById(panelId);
  if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
  function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
  if (!panel.greetingEmbed) panel.greetingEmbed = {};
  if (!panel.greetingEmbed.footer) panel.greetingEmbed.footer = {};
  panel.greetingEmbed.footer.text = emptyToNull(interaction.fields.getTextInputValue('footer_text'));
  panel.greetingEmbed.footer.icon_url = emptyToNull(interaction.fields.getTextInputValue('footer_icon'));
  const timestampInput = interaction.fields.getTextInputValue('footer_timestamp').toLowerCase();
  panel.greetingEmbed.footer.timestamp = timestampInput === 'yes' || timestampInput === 'true';
  await panel.save();
  return interaction.reply({ content: 'Greeting embed (footer) updated.' });
}

// --- Greeting Embed: Save Images ---
if (interaction.customId.startsWith('greeting_modal_embed_images:')) {
  const panelId = interaction.customId.split(':')[1];
  const panel = await TicketPanel.findById(panelId);
  if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
  function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
  if (!panel.greetingEmbed) panel.greetingEmbed = {};
  panel.greetingEmbed.thumbnail = emptyToNull(interaction.fields.getTextInputValue('thumbnail'));
  panel.greetingEmbed.image = emptyToNull(interaction.fields.getTextInputValue('image'));
  await panel.save();
  return interaction.reply({ content: 'Greeting embed (images) updated.' });
}

            // === TICKET PANEL EMBED MODALS (continued) ===

      // Basic
      if (interaction.customId.startsWith('ticketpanel_modal_embed_basic:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
        panel.embed.title = emptyToNull(interaction.fields.getTextInputValue('title'));
        panel.embed.description = emptyToNull(interaction.fields.getTextInputValue('description'));
        panel.embed.color = emptyToNull(interaction.fields.getTextInputValue('color')) || '#7d04c3';
        await panel.save();
        return interaction.reply({ content: 'Ticket panel embed (basic info) updated.' });
      }

      // Author
      if (interaction.customId.startsWith('ticketpanel_modal_embed_author:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
        if (!panel.embed.author) panel.embed.author = {};
        panel.embed.author.name = emptyToNull(interaction.fields.getTextInputValue('author_name'));
        panel.embed.author.icon_url = emptyToNull(interaction.fields.getTextInputValue('author_icon'));
        await panel.save();
        return interaction.reply({ content: 'Ticket panel embed (author) updated.' });
      }

      // Footer
      if (interaction.customId.startsWith('ticketpanel_modal_embed_footer:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
        if (!panel.embed.footer) panel.embed.footer = {};
        panel.embed.footer.text = emptyToNull(interaction.fields.getTextInputValue('footer_text'));
        panel.embed.footer.icon_url = emptyToNull(interaction.fields.getTextInputValue('footer_icon'));
        const timestampInput = interaction.fields.getTextInputValue('footer_timestamp').toLowerCase();
        panel.embed.footer.timestamp = timestampInput === 'yes' || timestampInput === 'true';
        await panel.save();
        return interaction.reply({ content: 'Ticket panel embed (footer) updated.' });
      }

      // Images
      if (interaction.customId.startsWith('ticketpanel_modal_embed_images:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        function emptyToNull(str) { return (typeof str === 'string' && str.trim() === '') ? null : str; }
        panel.embed.thumbnail = emptyToNull(interaction.fields.getTextInputValue('thumbnail'));
        panel.embed.image = emptyToNull(interaction.fields.getTextInputValue('image'));
        await panel.save();
        return interaction.reply({ content: 'Ticket panel embed (images) updated.' });
      }

      // Greeting (already above but for clarity)
      if (interaction.customId.startsWith('ticketpanel_modal_greeting:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        panel.greetingEmbed = interaction.fields.getTextInputValue('greeting_text');
        await panel.save();
        return interaction.reply({ content: 'Greeting message updated.' });
      }

      // Panel name modal
      if (interaction.customId.startsWith('ticketpanel_modal_name:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        const newName = interaction.fields.getTextInputValue('panel_name').trim().toLowerCase();
        const exists = await TicketPanel.findOne({ guildId: interaction.guild.id, panelName: newName, _id: { $ne: panelId } });
        if (exists) return interaction.reply({ content: `Panel name \`${newName}\` is already in use.`, ephemeral: false });
        panel.panelName = newName;
        await panel.save();
        return interaction.reply({ content: `Panel name updated to \`${newName}\`.` });
      }
    }

    // === TICKET: Modal Submit (Create Ticket Channel) ===
if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_submit:')) {
  try {
    const panelName = interaction.customId.split(':')[1];
    const panel = await TicketPanel.findOne({
      guildId: interaction.guild.id,
      panelName
    });
    if (!panel) {
      return interaction.reply({
        content: `Ticket panel \`${panelName}\` not found.`,
        ephemeral: false
      });
    }
    const issue = interaction.fields.getTextInputValue('issue');

    const overwrites = [
      {
        id: interaction.guild.roles.everyone,
        deny: ['ViewChannel']
      },
      {
        id: interaction.user.id,
        allow: ['ViewChannel', 'SendMessages']
      }
    ];

    const channelOptions = {
      name: `ticket-${interaction.user.username}`.toLowerCase(),
      type: ChannelType.GuildText,
      permissionOverwrites: overwrites
    };
    if (panel.ticketCategoryId) {
      channelOptions.parent = panel.ticketCategoryId;
    }
    const ticketChannel = await interaction.guild.channels.create(channelOptions);

    await TicketInstance.create({
      ticketId: ticketChannel.id,
      userId: interaction.user.id,
      panelName,
      channelId: ticketChannel.id,
      status: 'open',
      content: { issue }
    });

    // --- BUILD THE GREETING EMBED ---
    let greetingEmbed;
    if (panel.greetingEmbed && typeof panel.greetingEmbed === "object") {
      greetingEmbed = new EmbedBuilder();

      // Basic fields
      if (panel.greetingEmbed.title) greetingEmbed.setTitle(panel.greetingEmbed.title);
      if (panel.greetingEmbed.description) greetingEmbed.setDescription(panel.greetingEmbed.description);
      if (panel.greetingEmbed.color) greetingEmbed.setColor(panel.greetingEmbed.color);

      // Author
      if (panel.greetingEmbed.author && (panel.greetingEmbed.author.name || panel.greetingEmbed.author.icon_url)) {
        greetingEmbed.setAuthor({
          name: panel.greetingEmbed.author.name || "",
          iconURL: panel.greetingEmbed.author.icon_url || undefined
        });
      }

      // Footer
      if (panel.greetingEmbed.footer && (panel.greetingEmbed.footer.text || panel.greetingEmbed.footer.icon_url)) {
        greetingEmbed.setFooter({
          text: panel.greetingEmbed.footer.text || "",
          iconURL: panel.greetingEmbed.footer.icon_url || undefined
        });
      }

      // Timestamp
      if (panel.greetingEmbed.footer && panel.greetingEmbed.footer.timestamp) {
        greetingEmbed.setTimestamp(new Date());
      }

      // Images
      if (panel.greetingEmbed.thumbnail) greetingEmbed.setThumbnail(panel.greetingEmbed.thumbnail);
      if (panel.greetingEmbed.image) greetingEmbed.setImage(panel.greetingEmbed.image);

    } else {
      // fallback
      greetingEmbed = new EmbedBuilder()
        .setTitle('Ticket Opened')
        .setDescription(panel.greeting || 'Thank you for opening a ticket! A moderator will be with you shortly.');
    }

    // Add issue to embed
    greetingEmbed.addFields({
      name: 'Issue',
      value: issue || 'No description provided'
    });

    // Buttons
    const claimBtn = new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Secondary);
    const closeBtn = new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Secondary);
    const deleteBtn = new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder().addComponents(claimBtn, closeBtn, deleteBtn);

    // SEND the message in the ticket channel
    await ticketChannel.send({
      content: `<@${interaction.user.id}>`,
      embeds: [greetingEmbed],
      components: [row]
    });

    // REPLY to the modal submission (DO THIS ONLY ONCE)
    await interaction.reply({
      content: `Your ticket has been created: <#${ticketChannel.id}>`,
      ephemeral: true
    });
  } catch (err) {
    console.error("Ticket Modal Submit Error:", err);
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'Something went wrong while creating your ticket.',
          ephemeral: true
        });
      } catch (e) {}
    }
  }
}

// --- CLAIM BUTTON ---
if (interaction.customId === 'ticket_claim') {
  const ticket = await TicketInstance.findOne({ channelId: interaction.channel.id });
  if (!ticket) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x9e10a0)
        .setDescription('Ticket not found in database.')],
      ephemeral: true
    });
  }

  // Only the ticket opener or someone with ManageGuild can claim
  if (
    interaction.user.id !== ticket.userId &&
    !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x9e10a0)
        .setDescription("You don't have permission to claim this ticket.")],
      ephemeral: true
    });
  }

  // OPTIONAL: prevent double claiming
  if (ticket.claimedBy) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5103aa)
        .setDescription(`This ticket is already claimed by <@${ticket.claimedBy}>.`)],
      ephemeral: true
    });
  }

  // --- UPDATE TICKET DB ---
  ticket.claimedBy = interaction.user.id;
  await ticket.save();

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x5103aa)
      .setDescription(`Ticket claimed by <@${interaction.user.id}>.`)],
    ephemeral: false
  });
}

// --- CLOSE BUTTON ---
if (interaction.customId === 'ticket_close') {
  const ticket = await TicketInstance.findOne({ channelId: interaction.channel.id });
  if (!ticket) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x9e10a0)
        .setDescription('Ticket not found in database.')],
      ephemeral: true
    });
  }
  if (interaction.user.id !== ticket.userId && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x9e10a0)
        .setDescription("You don't have permission to close this ticket.")],
      ephemeral: true
    });
  }
  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x9e10a0)
      .setDescription('This ticket will be closed in 5 seconds.')],
    ephemeral: false
  });
  setTimeout(async () => {
    await interaction.channel.delete().catch(() => {});
  }, 5000);
}

// --- DELETE BUTTON ---
if (interaction.customId === 'ticket_delete') {
  // Only ticket opener or ManageGuild can delete
  const ticket = await TicketInstance.findOne({ channelId: interaction.channel.id });
  if (
    !ticket ||
    (
      interaction.user.id !== ticket.userId &&
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
    )
  ) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x9e10a0)
        .setDescription("You don't have permission to delete this ticket.")],
      ephemeral: true
    });
  }

  // Send confirmation message
  return interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0xfef2a8)
      .setDescription('Are you **sure** you want to delete this ticket?')],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_delete_confirm')
          .setLabel('Yes, Delete')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket_delete_cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      )
    ],
    ephemeral: true
  });
}

// --- CONFIRM DELETION ---
if (interaction.customId === 'ticket_delete_confirm') {
  const ticket = await TicketInstance.findOne({ channelId: interaction.channel.id });
  if (
    !ticket ||
    (
      interaction.user.id !== ticket.userId &&
      !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
    )
  ) {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x9e10a0)
        .setDescription("You don't have permission to delete this ticket.")],
      ephemeral: true
    });
  }

  await interaction.channel.delete('Ticket deleted by user or mod');
  // Optionally, update the ticket in DB
  if (ticket) {
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closeReason = 'Deleted by user or moderator';
    await ticket.save();
  }
  // No need to reply: channel is gone!
}

// --- CANCEL DELETION ---
if (interaction.customId === 'ticket_delete_cancel') {
  return interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(0xcefbdc)
        .setDescription('Ticket deletion cancelled.')
    ],
    components: [] // remove buttons
  });
}

    // === SELECT MENU HANDLERS ===
    if (interaction.isChannelSelectMenu()) {
      // Set post channel for panel
      if (interaction.customId.startsWith('ticketpanel_select_post_channel:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        const selectedChannelId = interaction.values[0];
        panel.postChannelId = selectedChannelId;
        await panel.save();
        return interaction.reply({ content: `✅ Post channel set to <#${selectedChannelId}>.`, ephemeral: false });
      }
      // Set category for new tickets
      if (interaction.customId.startsWith('ticketpanel_select_category:')) {
        const panelId = interaction.customId.split(':')[1];
        const panel = await TicketPanel.findById(panelId);
        if (!panel) return interaction.reply({ content: 'Panel not found.', ephemeral: false });
        const selectedCategoryId = interaction.values[0];
        panel.ticketCategoryId = selectedCategoryId;
        await panel.save();
        return interaction.reply({ content: `✅ Ticket category set to <#${selectedCategoryId}>.`, ephemeral: false });
      }
    }

    // === SLASH COMMAND HANDLER ===
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        if (!client.reactionRoleCache) {
          client.reactionRoleCache = {};
        }
        await command.execute(interaction, client, client.reactionRoleCache);
      } catch (error) {
        console.error(error);
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: 'There was an error executing this command!' });
          } else {
            await interaction.reply({ content: 'There was an error executing this command!' });
          }
        } catch (err) {
          console.error('Failed to reply to interaction:', err);
        }
      }
    }
  }
};