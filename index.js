// index.js
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, ActivityType, Partials } = require('discord.js');

// Import your ReactionRoleMessage model (adjust the path as needed)
const ReactionRoleMessage = require('./models/ReactionRoleMessage'); // <-- FIX THIS PATH IF NEEDED

// This will hold your mapping: { [messageId]: { emojiRoleMap, ...otherData } }
const reactionRoleCache = {};

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('Connected to MongoDB!'))
.catch(err => console.error('MongoDB connection error:', err));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMembers
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

// Commands collection (for slash commands)
client.commands = new Collection();

// Load commands (including from subfolders)
const commandsPath = path.join(__dirname, 'commands');
function loadCommands(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath); // Recursively load subfolders
        } else if (file.endsWith('.js')) {
            const command = require(filePath);
            if (command.data && command.execute) {
                client.commands.set(command.data.name, command);
            }
        }
    }
}
loadCommands(commandsPath);

// Load events from /events folder
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.name && typeof event.execute === 'function') {
            client.on(event.name, (...args) => event.execute(...args, client, reactionRoleCache));
            console.log(`Loaded event: ${event.name}`);
        }
    }
}

// Example debug event
client.on('messageReactionAdd', (reaction, user) => {
    console.log('RAW messageReactionAdd event fired!', reaction.emoji.name, user.tag);
});

client.once('ready', async () => { 
    // Load all reaction role messages into cache
    const allPanels = await ReactionRoleMessage.find({});
    for (const panel of allPanels) {
        reactionRoleCache[panel.messageId] = {
            emojiRoleMap: panel.emojiRoleMap,
            panelName: panel.panelName,
            channelId: panel.channelId,
            guildId: panel.guildId,
            // ...add any other fields you want
        };
    }
    console.log(`Loaded ${Object.keys(reactionRoleCache).length} reaction role panels into cache.`);

    // Set presence after the bot is ready
    client.user.setPresence({
        activities: [
            { name: 'With more bots 💛', type: ActivityType.Streaming }
        ]
    });

    console.log(`Bot ${client.user.tag} is now ready!`);
});

client.login(process.env.TOKEN);

// Optionally export the cache for use in other files
module.exports = { client, reactionRoleCache };