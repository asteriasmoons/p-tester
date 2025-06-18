const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
require('dotenv').config();

console.log('OAuth client ID:', process.env.DISCORD_CLIENT_ID);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

passport.use(new DiscordStrategy(
  {
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK,
    scope: ['identify', 'guilds']
  },
  (accessToken, refreshToken, profile, done) => {
    // You can save user data to DB here if needed
    return done(null, profile);
  }
));