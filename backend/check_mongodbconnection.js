const mongoose = require('mongoose');
require('dotenv').config();

async function checkMongoDBConnection() {
  try {
    const mongoURL = process.env.MONGODB_URI;
    
    if (!mongoURL) {
      throw new Error('MONGODB_URI not found in .env file');
    }

    await mongoose.connect(mongoURL);
    console.log('MongoDB connected successfully');
    await mongoose.disconnect();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

checkMongoDBConnection();
