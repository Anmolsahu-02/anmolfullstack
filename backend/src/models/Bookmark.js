const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Enforce one bookmark per user per content
bookmarkSchema.index({ userId: 1, contentId: 1 }, { unique: true });
// Allow fast "what did this user bookmark?" queries
bookmarkSchema.index({ userId: 1, createdAt: -1 });
// Allow fast "who bookmarked this content?" queries
bookmarkSchema.index({ contentId: 1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
