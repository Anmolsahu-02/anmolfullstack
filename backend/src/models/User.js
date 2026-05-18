const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    passwordHash: { type: String, maxlength: 100 },
    role: { type: String, enum: ['writer', 'reader'], default: 'writer' }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('User', userSchema);
