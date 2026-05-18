const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    versionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      default: () => new mongoose.Types.ObjectId()
    },
    delta: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    label: {
      type: String,
      trim: true,
      maxlength: 60,
      default: 'Auto-save'
    },
    editedAt: {
      type: Date,
      required: true,
      default: () => new Date()
    }
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    genre: { type: String, required: true, trim: true, maxlength: 100 },
    tags: { type: [String], default: [] },
    language: { type: String, required: true, trim: true, maxlength: 50 },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    contentType: {
      type: String,
      required: true,
      enum: ['lyrics', 'story', 'poem', 'screenplay']
    },
    quillDelta: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: { ops: [] }
    },
    versions: {
      type: [versionSchema],
      default: [],
      validate: {
        validator(value) {
          return value.length <= 50;
        },
        message: 'A content document can store at most 50 embedded versions'
      }
    },
    bookmarkCount: { type: Number, default: 0, min: 0 },
    ratingSum: { type: Number, default: 0, min: 0 },
    ratingCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

contentSchema.index(
  { title: 'text', genre: 'text', tags: 'text', language: 'text' },
  {
    weights: { title: 10, genre: 5, tags: 3, language: 2 },
    default_language: 'none'
  }
);

contentSchema.index({ authorId: 1, createdAt: -1 });
contentSchema.index({ bookmarkCount: -1 });
contentSchema.index({ language: 1 });
contentSchema.index({ genre: 1, ratingSum: -1, createdAt: -1 });
contentSchema.index({ isDeleted: 1, createdAt: -1 });

module.exports = mongoose.model('Content', contentSchema);
