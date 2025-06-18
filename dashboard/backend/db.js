const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let db;

async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db(); // defaults to the DB in your URI
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
  }
}

function getDb() {
  return db;
}

module.exports = { connectToDatabase, getDb };