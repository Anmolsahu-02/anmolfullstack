const mongoose = require('mongoose');
const Content = require('../models/Content');
const ArchivedVersion = require('../models/ArchivedVersion');
const Bookmark = require('../models/Bookmark');
const Rating = require('../models/Rating');
const { redis } = require('../config/redis');
const logger = require('../config/logger');
const { toObjectId } = require('../utils/objectId');

const isTestMode = process.env.NODE_ENV === 'test';

const LOCALE_MAP = {
  hindi: 'hi',
  tamil: 'ta',
  telugu: 'te',
  bengali: 'bn',
  marathi: 'mr',
  gujarati: 'gu',
  punjabi: 'pa',
  english: 'en'
};

function bookmarkKey(contentId) { return `bookmark:${contentId}`; }
function ratingKey(contentId) { return `rating:${contentId}`; }
function safeAverage(sum, count) { return count > 0 ? sum / count : 0; }

// ── Content CRUD ──────────────────────────────────────────────────────────────

async function createContent(authorId, payload) {
  return Content.create({
    ...payload,
    authorId,
    status: 'draft',
    bookmarkCount: 0,
    ratingSum: 0,
    ratingCount: 0,
    isDeleted: false
  });
}

async function getContentById(contentId) {
  const bookmarkCache = await redis.get(bookmarkKey(contentId));
  const content = await Content.findOne({ _id: contentId, isDeleted: false }).lean();
  if (!content) return null;

  if (bookmarkCache !== null) {
    logger.info(`[Redis HIT] bookmark:${contentId}`);
    content.bookmarkCount = Number.parseInt(bookmarkCache, 10);
  } else {
    logger.info(`[Redis MISS] bookmark:${contentId}`);
    await redis.set(bookmarkKey(contentId), String(content.bookmarkCount));
  }
  return content;
}

// ── Browse published ──────────────────────────────────────────────────────────

async function browseContent({ genre, language, contentType, sort = 'latest', cursor } = {}) {
  const filter = { status: 'published', isDeleted: false };
  if (genre) filter.genre = genre;
  if (language) filter.language = language;
  if (contentType) filter.contentType = contentType;
  if (cursor) {
    const objectId = toObjectId(cursor);
    if (objectId) filter._id = { $lt: objectId };
  }

  let sortSpec;
  switch (sort) {
    case 'bookmarks': sortSpec = { bookmarkCount: -1, _id: -1 }; break;
    case 'rating':    sortSpec = { ratingSum: -1, _id: -1 };     break;
    default:          sortSpec = { createdAt: -1, _id: -1 };     break;
  }

  return Content.find(filter)
    .select('title genre language contentType tags authorId bookmarkCount ratingSum ratingCount status createdAt updatedAt')
    .sort(sortSpec)
    .limit(24)
    .lean();
}

// ── Autosave ──────────────────────────────────────────────────────────────────

function autosaveLockKey(userId, contentId) {
  return `autosave_lock:${userId}:${contentId}`;
}

async function updateMeta(contentId, userId, { title, genre, language, contentType }) {
  const content = await Content.findOne({ _id: contentId, authorId: userId, isDeleted: false });
  if (!content) return null;
  if (title !== undefined) content.title = title;
  if (genre !== undefined) content.genre = genre;
  if (language !== undefined) content.language = language;
  if (contentType !== undefined) content.contentType = contentType;
  content.updatedAt = new Date();
  await content.save();
  return content;
}

async function updateAutosave(contentId, userId, delta) {
  // Backend throttle: ignore if same user saved this doc within 2 seconds
  const lockKey = autosaveLockKey(userId, contentId);
  const locked = await redis.set(lockKey, '1', 'NX', 'EX', 2);
  if (!locked) return { saved: false, reason: 'throttled' };

  const content = await Content.findOne({ _id: contentId, authorId: userId, isDeleted: false });
  if (!content) return null;

  content.quillDelta = delta;
  content.updatedAt = new Date();
  await content.save();
  return { saved: true, updatedAt: content.updatedAt };
}

// ── Versions ──────────────────────────────────────────────────────────────────

async function saveVersion(contentId, userId, delta, label = 'Manual save') {
  if (isTestMode) {
    // Skip transactions in test mode (mongodb-memory-server doesn't support them)
    const content = await Content.findOne({ _id: contentId, authorId: userId, isDeleted: false });
    if (!content) return null;

    const snapshot = {
      versionId: new mongoose.Types.ObjectId(),
      delta: delta || content.quillDelta,
      label,
      editedAt: new Date()
    };

    if (content.versions.length >= 50) {
      const oldest = content.versions[0];
      await ArchivedVersion.create({
        contentId: content._id,
        versionId: oldest.versionId,
        delta: oldest.delta,
        editedAt: oldest.editedAt
      });
    }

    content.quillDelta = snapshot.delta;
    content.updatedAt = snapshot.editedAt;
    content.versions.push(snapshot);
    if (content.versions.length > 50) content.versions = content.versions.slice(-50);
    await content.save();
    return snapshot;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const content = await Content.findOne({ _id: contentId, authorId: userId, isDeleted: false }).session(session);
    if (!content) { await session.abortTransaction(); return null; }

    const snapshot = {
      versionId: new mongoose.Types.ObjectId(),
      delta: delta || content.quillDelta,
      label,
      editedAt: new Date()
    };

    if (content.versions.length >= 50) {
      const oldest = content.versions[0];
      await ArchivedVersion.create([{
        contentId: content._id,
        versionId: oldest.versionId,
        delta: oldest.delta,
        editedAt: oldest.editedAt
      }], { session });
    }

    await Content.findByIdAndUpdate(
      contentId,
      {
        $set: { quillDelta: snapshot.delta, updatedAt: snapshot.editedAt },
        $push: { versions: { $each: [snapshot], $slice: -50 } }
      },
      { session }
    );

    await session.commitTransaction();
    return snapshot;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function listVersions(contentId) {
  const content = await Content.findOne({ _id: contentId, isDeleted: false }).select('versions').lean();
  if (!content) return null;

  // Strip delta blobs — return metadata only for the sidebar list
  const embeddedMeta = (content.versions || []).map(({ versionId, label, editedAt }) => ({
    versionId, label, editedAt
  }));

  const archivedMeta = await ArchivedVersion.find({ contentId })
    .select('versionId editedAt')
    .sort({ editedAt: -1 })
    .lean();

  return { embedded: embeddedMeta, archived: archivedMeta };
}

async function restoreVersion(contentId, userId, versionId) {
  const content = await Content.findOne({ _id: contentId, authorId: userId, isDeleted: false });
  if (!content) return null;

  const embeddedMatch = content.versions.find((e) => e.versionId.toString() === versionId.toString());

  if (embeddedMatch) {
    content.quillDelta = embeddedMatch.delta;
    content.updatedAt = new Date();
    await content.save();
    return embeddedMatch;
  }

  const archivedMatch = await ArchivedVersion.findOne({ contentId, versionId }).lean();
  if (!archivedMatch) return null;

  content.quillDelta = archivedMatch.delta;
  content.updatedAt = new Date();
  await content.save();
  return archivedMatch;
}

// ── Draft / Publish ───────────────────────────────────────────────────────────

async function listDrafts(authorId) {
  const objectId = toObjectId(authorId);
  if (!objectId) return [];
  return Content.find({ authorId: objectId, status: 'draft', isDeleted: false })
    .select('title genre language contentType quillDelta updatedAt createdAt')
    .sort({ updatedAt: -1 })
    .lean();
}

async function listPublished(authorId) {
  const objectId = toObjectId(authorId);
  if (!objectId) return [];
  return Content.find({ authorId: objectId, status: 'published', isDeleted: false })
    .select('title genre language contentType bookmarkCount ratingSum ratingCount updatedAt createdAt')
    .sort({ createdAt: -1 })
    .lean();
}

async function publishContent(contentId, authorId) {
  const content = await Content.findOne({ _id: contentId, authorId, isDeleted: false });
  if (!content) return null;
  if (!content.title || !content.genre || !content.language) {
    throw new Error('Content must have a title, genre, and language before publishing');
  }
  content.status = 'published';
  content.updatedAt = new Date();
  await content.save();
  return content;
}

async function unpublishContent(contentId, authorId) {
  const content = await Content.findOne({ _id: contentId, authorId, isDeleted: false });
  if (!content) return null;
  content.status = 'draft';
  content.updatedAt = new Date();
  await content.save();
  return content;
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteContent(contentId, userId) {
  const content = await Content.findOne({ _id: contentId, authorId: userId, isDeleted: false });
  if (!content) return null;

  content.isDeleted = true;
  content.deletedAt = new Date();
  content.updatedAt = new Date();
  await content.save();

  await redis.del(bookmarkKey(contentId), ratingKey(contentId));
  return content.toObject();
}

// ── Bookmarks (per-user toggle) ───────────────────────────────────────────────

async function toggleBookmark(contentId, userId) {
  const contentExists = await Content.findOne({ _id: contentId, isDeleted: false }).select('_id').lean();
  if (!contentExists) return null;

  const existing = await Bookmark.findOne({ userId, contentId });

  if (existing) {
    await existing.deleteOne();
    const [updated] = await Promise.all([
      Content.findOneAndUpdate(
        { _id: contentId, bookmarkCount: { $gt: 0 } },
        { $inc: { bookmarkCount: -1 } },
        { new: true }
      ),
      redis.decr(bookmarkKey(contentId))
    ]);
    return { bookmarked: false, count: updated?.bookmarkCount ?? 0 };
  } else {
    await Bookmark.create({ userId, contentId });
    const [updated] = await Promise.all([
      Content.findByIdAndUpdate(contentId, { $inc: { bookmarkCount: 1 } }, { new: true }),
      redis.incr(bookmarkKey(contentId))
    ]);
    return { bookmarked: true, count: updated?.bookmarkCount ?? 1 };
  }
}

async function getUserBookmarks(userId) {
  const objectId = toObjectId(userId);
  if (!objectId) return [];

  const bookmarks = await Bookmark.find({ userId: objectId }).sort({ createdAt: -1 }).lean();
  const contentIds = bookmarks.map((b) => b.contentId);

  return Content.find({ _id: { $in: contentIds }, isDeleted: false })
    .select('title genre language contentType bookmarkCount ratingSum ratingCount createdAt')
    .lean();
}

// ── Rating ────────────────────────────────────────────────────────────────────

async function rateContent(contentId, userId, score) {
  if (isTestMode) {
    // Skip transactions in test mode
    const contentExists = await Content.findOne({ _id: contentId, isDeleted: false }).select('_id');
    if (!contentExists) return null;

    const existing = await Rating.findOne({ contentId, userId });
    let updatedContent;

    if (existing) {
      const difference = score - existing.score;
      existing.score = score;
      await existing.save();
      updatedContent = await Content.findByIdAndUpdate(
        contentId,
        { $inc: { ratingSum: difference } },
        { new: true }
      );
    } else {
      await Rating.create({ contentId, userId, score });
      updatedContent = await Content.findByIdAndUpdate(
        contentId,
        { $inc: { ratingSum: score, ratingCount: 1 } },
        { new: true }
      );
    }

    await redis.del(ratingKey(contentId));
    return updatedContent;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const contentExists = await Content.findOne({ _id: contentId, isDeleted: false }).select('_id').session(session);
    if (!contentExists) { await session.abortTransaction(); return null; }

    const existing = await Rating.findOne({ contentId, userId }).session(session);
    let updatedContent;

    if (existing) {
      const difference = score - existing.score;
      existing.score = score;
      await existing.save({ session });
      updatedContent = await Content.findByIdAndUpdate(
        contentId,
        { $inc: { ratingSum: difference } },
        { new: true, session }
      );
    } else {
      await Rating.create([{ contentId, userId, score }], { session });
      updatedContent = await Content.findByIdAndUpdate(
        contentId,
        { $inc: { ratingSum: score, ratingCount: 1 } },
        { new: true, session }
      );
    }

    await session.commitTransaction();
    await redis.del(ratingKey(contentId));
    return updatedContent;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

async function getRating(contentId) {
  const cached = await redis.get(ratingKey(contentId));
  if (cached) return JSON.parse(cached);

  const content = await Content.findOne({ _id: contentId, isDeleted: false })
    .select('ratingSum ratingCount')
    .lean();
  if (!content) return null;

  const payload = {
    avg: safeAverage(content.ratingSum, content.ratingCount),
    count: content.ratingCount
  };

  await redis.set(ratingKey(contentId), JSON.stringify(payload), 'EX', 300);
  return payload;
}

// ── Search ────────────────────────────────────────────────────────────────────

async function searchContent({ q, language, genre, cursor }) {
  const filter = { $text: { $search: q }, status: 'published', isDeleted: false };

  if (language) filter.language = language;
  if (genre) filter.genre = genre;
  if (cursor) {
    const objectId = toObjectId(cursor);
    if (objectId) filter._id = { $gt: objectId };
  }

  const projection = {
    score: { $meta: 'textScore' },
    title: 1, genre: 1, tags: 1, language: 1, contentType: 1,
    authorId: 1, bookmarkCount: 1, ratingSum: 1, ratingCount: 1,
    createdAt: 1, updatedAt: 1
  };

  const results = await Content.find(filter, projection)
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    .lean();

  if (process.env.NODE_ENV === 'development') {
    const explained = await Content.find(filter).explain('executionStats');
    logger.info('search explain stats', {
      totalKeysExamined: explained.executionStats.totalKeysExamined,
      totalDocsExamined: explained.executionStats.totalDocsExamined,
      executionTimeMillis: explained.executionStats.executionTimeMillis
    });
  }

  return results;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

async function trendingContent() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  return Content.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'published', isDeleted: false } },
    { $project: { genre: 1, bookmarkCount: 1, ratingSum: 1, ratingCount: 1 } },
    {
      $group: {
        _id: '$genre',
        totalBookmarks: { $sum: '$bookmarkCount' },
        avgRating: { $avg: { $cond: [{ $gt: ['$ratingCount', 0] }, { $divide: ['$ratingSum', '$ratingCount'] }, 0] } },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalBookmarks: -1 } },
    { $limit: 10 }
  ]).allowDiskUse(true);
}

async function languageStats() {
  return Content.aggregate([
    { $match: { isDeleted: false } },
    { $project: { language: 1, ratingSum: 1, ratingCount: 1 } },
    {
      $group: {
        _id: '$language',
        count: { $sum: 1 },
        avgRating: { $avg: { $cond: [{ $gt: ['$ratingCount', 0] }, { $divide: ['$ratingSum', '$ratingCount'] }, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]).allowDiskUse(true);
}

async function profileStats(userId) {
  const authorObjectId = toObjectId(userId);
  if (!authorObjectId) return null;

  const [result] = await Content.aggregate([
    { $match: { authorId: authorObjectId, isDeleted: false } },
    { $project: { genre: 1, language: 1, bookmarkCount: 1, title: 1 } },
    {
      $facet: {
        byGenre: [{ $group: { _id: '$genre', count: { $sum: 1 } } }],
        byLanguage: [{ $group: { _id: '$language', count: { $sum: 1 } } }],
        topContent: [
          { $sort: { bookmarkCount: -1 } },
          { $limit: 5 },
          { $project: { title: 1, bookmarkCount: 1 } }
        ]
      }
    }
  ], { allowDiskUse: true });

  return result || { byGenre: [], byLanguage: [], topContent: [] };
}

async function ensureRedisBookmark(content) {
  await redis.set(bookmarkKey(content._id), String(content.bookmarkCount));
}

module.exports = {
  LOCALE_MAP,
  createContent,
  getContentById,
  browseContent,
  updateMeta,
  updateAutosave,
  saveVersion,
  listVersions,
  restoreVersion,
  listDrafts,
  listPublished,
  publishContent,
  unpublishContent,
  deleteContent,
  toggleBookmark,
  getUserBookmarks,
  rateContent,
  getRating,
  searchContent,
  trendingContent,
  languageStats,
  profileStats,
  ensureRedisBookmark
};
