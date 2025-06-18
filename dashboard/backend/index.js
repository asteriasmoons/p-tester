const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const { connectToMongoose } = require('./mongoose');
const UserWarn = require('../../models/UserWarn');
require('./auth'); // Load passport strategy

const app = express();
const PORT = 3001;

// === Middleware ===
app.use(cors({
  origin: 'http://localhost:5173', // your frontend origin
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: process.env.DISCORD_CLIENT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 86400000, // 1 day in ms
    sameSite: 'lax',  // allows cookies to be sent with frontend requests
    secure: false     // set to true in production if using HTTPS
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// === Auth Routes ===
app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/'
  }),
  (req, res) => {
    res.redirect('http://localhost:5173'); // Redirect to frontend
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout(err => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

// Check login status from frontend
app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    res.json({ authenticated: false });
  }
});

// === App Routes ===
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Pandoryx backend!' });
});

app.get('/api/warnings', async (req, res) => {
  console.log('GET /api/warnings hit!');
  try {
    const { guildId } = req.query;
    let query = {};
    if (guildId) {
      query.guildId = guildId;
      console.log('Filtering by guildId:', guildId);
    }

    const warns = await UserWarn.find(query);
    console.log('Returned documents:', warns);
    res.json({ success: true, data: warns });
  } catch (err) {
    console.error('Error fetching warnings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE a specific warning entry by userId and warnId
app.delete('/api/warnings/:userId/:warnId', async (req, res) => {
  const { userId, warnId } = req.params;

  try {
    const result = await UserWarn.findOneAndUpdate(
      { userId },
      { $pull: { warns: { _id: warnId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'User or warning not found' });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Delete failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT (Edit) a warning reason
app.put('/api/warnings/:userId/:warnId', async (req, res) => {
  const { userId, warnId } = req.params;
  const { reason } = req.body;

  try {
    const result = await UserWarn.findOneAndUpdate(
      { userId, 'warns._id': warnId },
      { $set: { 'warns.$.reason': reason } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Warning not found' });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Edit error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/guilds', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const guilds = req.user.guilds || [];
  const filtered = guilds.filter(g => (g.permissions & 0x20) === 0x20); // 0x20 = MANAGE_GUILD

  res.json({ success: true, guilds: filtered });
});

const TicketPanel = require('../../models/TicketPanel');

// Get all panels
app.get('/api/tickets/panels', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

  const { guildId } = req.query;
  if (!guildId) return res.status(400).json({ error: 'Missing guildId' });

  try {
    const panels = await TicketPanel.find({ guildId });
    res.json(panels);
  } catch (err) {
    console.error('Error fetching panels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new ticket panel
app.post('/api/tickets/panels', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

  const { name, title, description, color, emoji } = req.body;

  if (!name || !title || !description || !color) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const existing = await TicketPanel.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Panel with that name already exists.' });

    const panel = new TicketPanel({
      name,
      embed: { title, description, color },
      emoji
    });

    await panel.save();
    res.status(201).json(panel);
  } catch (err) {
    console.error('Error creating panel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Edit an existing ticket panel
app.put('/api/tickets/panels/:id', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

  const { title, description, color, emoji } = req.body;

  try {
    const panel = await TicketPanel.findById(req.params.id);
    if (!panel) return res.status(404).json({ error: 'Panel not found.' });

    panel.embed.title = title || panel.embed.title;
    panel.embed.description = description || panel.embed.description;
    panel.embed.color = color || panel.embed.color;
    panel.emoji = emoji ?? panel.emoji;

    await panel.save();
    res.json(panel);
  } catch (err) {
    console.error('Error updating panel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a ticket panel
app.delete('/api/tickets/panels/:id', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const panel = await TicketPanel.findById(req.params.id);
    if (!panel) return res.status(404).json({ error: 'Panel not found.' });

    await panel.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting panel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/emojis/:guildId', async (req, res) => {
  const guildId = req.params.guildId;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }

  try {
    const guild = user.guilds.find(g => g.id === guildId);
    if (!guild) {
      return res.status(403).json({ success: false, message: 'Not a member of guild' });
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/emojis`, {
      headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({ success: false, message: error.message });
    }

    const emojis = await response.json();

    const formattedEmojis = emojis.map(e => ({
      id: e.id,
      name: e.name,
      animated: e.animated,
      preview: e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`,
      identifier: e.id, // use ID as identifier for reliability
    }));

    res.json({ success: true, emojis: formattedEmojis });
  } catch (err) {
    console.error('Emoji fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch emojis' });
  }
});

app.get('/api/categories/:guildId', async (req, res) => {
  const { guildId } = req.params;
  const response = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.BOT_TOKEN}` }
  });
  const channels = await response.json();
  const categories = channels.filter(c => c.type === 4); // Type 4 = Category
  res.json({ categories });
});

// === Start Server ===
app.listen(PORT, async () => {
  await connectToMongoose();
  console.log(`✅ Mongoose connected`);
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});