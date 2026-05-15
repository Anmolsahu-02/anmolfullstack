const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    password: { type: String, maxlength: 100 },
    roles: { type: [String], default: ['writer'] }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
