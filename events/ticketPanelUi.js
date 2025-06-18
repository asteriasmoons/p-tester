// ticketPanelUi.js
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType
} = require('discord.js');

function buildTicketEmbed(panel) {
  return new EmbedBuilder()
    .setTitle(panel.embed?.title || 'Untitled Ticket Panel')
    .setDescription(panel.embed?.description || '*No description set yet.*')
    .setColor(panel.embed?.color || '#5103aa')
    .setFooter({ text: `Panel Name: ${panel.panelName}` });
}

async function sendTicketPanelEditor(interaction, panel) {
  const embed = buildTicketEmbed(panel);

  const buttonsRow1 = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`ticketpanel_edit_embed_basic:${panel._id}`)
    .setLabel('Edit Basic Info')
    .setStyle(ButtonStyle.Secondary),
  new ButtonBuilder()
    .setCustomId(`ticketpanel_edit_embed_author:${panel._id}`)
    .setLabel('Edit Author')
    .setStyle(ButtonStyle.Secondary),
  new ButtonBuilder()
    .setCustomId(`ticketpanel_edit_embed_footer:${panel._id}`)
    .setLabel('Edit Footer')
    .setStyle(ButtonStyle.Secondary),
  new ButtonBuilder()
    .setCustomId(`ticketpanel_edit_embed_images:${panel._id}`)
    .setLabel('Edit Images')
    .setStyle(ButtonStyle.Secondary)
);
    new ButtonBuilder()
      .setCustomId(`ticketpanel_edit_name:${panel._id}`)
      .setLabel('Edit Panel Name')
      .setStyle(ButtonStyle.Secondary)

  const buttonsRow2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticketpanel_edit_greeting:${panel._id}`)
      .setLabel('Set Greeting Message')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ticketpanel_set_emoji:${panel._id}`)
      .setLabel('Set Emoji')
      .setStyle(ButtonStyle.Secondary)
  );

  const channelMenuRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`ticketpanel_select_post_channel:${panel._id}`)
      .setPlaceholder('Select channel to post this panel in')
      .addChannelTypes(ChannelType.GuildText)
  );

  const categoryMenuRow = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId(`ticketpanel_select_category:${panel._id}`)
      .setPlaceholder('Select category for new tickets')
      .addChannelTypes(ChannelType.GuildCategory)
  );

  const finalizeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticketpanel_toggle_transcript:${panel._id}`)
      .setLabel(panel.transcriptsEnabled ? 'Transcripts: ON' : 'Transcripts: OFF')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ticketpanel_publish_preview:${panel._id}`)
      .setLabel('Preview & Publish')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({
    content: `🎟️ Configuring ticket panel: \`${panel.panelName}\``,
    embeds: [embed],
    components: [
      buttonsRow1,
      buttonsRow2,
      channelMenuRow,
      categoryMenuRow,
      finalizeRow
    ]
  });
}

module.exports = {
  sendTicketPanelEditor,
  buildTicketEmbed
};