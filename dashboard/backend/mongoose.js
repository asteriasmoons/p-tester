const mongoose = require('mongoose');
require('dotenv').config();

async function connectToMongoose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Mongoose connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ Mongoose connection error:', err);
  }
  console.log('🔎 Connected to DB:', mongoose.connection.name);
}

module.exports = { connectToMongoose, mongoose };