const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireOwnership = require('../middleware/requireOwnership');
const createLimiter = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const {
  contentCreateSchema,
  autosaveSchema,
  versionSchema,
  ratingSchema,
  searchQuerySchema,
  languageQuerySchema
} = require('../validators/contentValidators');
const {
  createContent,
  getContentById,
  updateAutosave,
  saveVersion,
  listVersions,
  restoreVersion,
  deleteContent,
  bookmarkContent,
  unbookmarkContent,
  rateContent,
  getRating,
  searchContent,
  trendingContent,
  languageStats,
  profileStats,
  ensureRedisBookmark,
  LOCALE_MAP
} = require('../services/contentService');
const Content = require('../models/Content');
const ArchivedVersion = require('../models/ArchivedVersion');
const { toObjectId } = require('../utils/objectId');

const router = express.Router();

const bookmarkLimiter = createLimiter({ max: 30, windowMs: 60_000 });
const searchLimiter = createLimiter({ max: 60, windowMs: 60_000 });
const autosaveLimiter = createLimiter({ max: 10, windowMs: 10_000 });
const ratingLimiter = createLimiter({ max: 10, windowMs: 60_000 });

router.post(
  '/',
  authenticate,
  validate(contentCreateSchema),
  asyncHandler(async (req, res) => {
    const content = await createContent(req.user.id, req.body);
    await ensureRedisBookmark(content);
    return res.status(201).json({ data: content });
  })
);

router.get(
  '/search',
  searchLimiter,
  validate(searchQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const results = await searchContent(req.query);
    return res.json({ data: results });
  })
);

router.get(
  '/by-language',
  validate(languageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const locale = LOCALE_MAP[req.query.lang] || 'en';
    const results = await Content.find({ language: req.query.lang, isDeleted: false })
      .collation({ locale, strength: 2 })
      .sort({ title: 1 })
      .limit(20)
      .lean();

    return res.json({ data: results, locale });
  })
);

router.get(
  '/trending',
  asyncHandler(async (req, res) => {
    const data = await trendingContent();
    return res.json({ data });
  })
);

router.get(
  '/stats/language',
  asyncHandler(async (req, res) => {
    const data = await languageStats();
    return res.json({ data });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const contentId = toObjectId(req.params.id);

    if (!contentId) {
      return res.status(400).json({ error: 'Invalid content id' });
    }

    const content = await getContentById(contentId);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ data: content });
  })
);

router.patch(
  '/:id/autosave',
  authenticate,
  autosaveLimiter,
  requireOwnership,
  validate(autosaveSchema),
  asyncHandler(async (req, res) => {
    const result = await updateAutosave(req.params.id, req.user.id, req.body.delta);

    if (!result) {
      return res.status(404).json({ error: 'Content not found' });
    }

    if (result.saved === false) {
      return res.json({ saved: false, reason: result.reason });
    }

    return res.json({ saved: true, updatedAt: result.updatedAt });
  })
);

router.post(
  '/:id/versions',
  authenticate,
  requireOwnership,
  validate(versionSchema),
  asyncHandler(async (req, res) => {
    const snapshot = await saveVersion(req.params.id, req.user.id, req.body.delta);

    if (!snapshot) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.status(201).json({ data: snapshot });
  })
);

router.get(
  '/:id/versions',
  asyncHandler(async (req, res) => {
    const versions = await listVersions(req.params.id);

    if (!versions) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ data: versions });
  })
);

router.get(
  '/:id/versions/:vid',
  authenticate,
  requireOwnership,
  asyncHandler(async (req, res) => {
    const versionId = toObjectId(req.params.vid);

    if (!versionId) {
      return res.status(400).json({ error: 'Invalid version id' });
    }

    const restored = await restoreVersion(req.params.id, req.user.id, versionId);

    if (!restored) {
      return res.status(404).json({ error: 'Version not found' });
    }

    return res.json({ data: restored });
  })
);

router.delete(
  '/:id',
  authenticate,
  requireOwnership,
  asyncHandler(async (req, res) => {
    const deleted = await deleteContent(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ deleted: true });
  })
);

router.post(
  '/:id/bookmark',
  authenticate,
  bookmarkLimiter,
  asyncHandler(async (req, res) => {
    const content = await bookmarkContent(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ bookmarkCount: content.bookmarkCount });
  })
);

router.post(
  '/:id/unbookmark',
  authenticate,
  bookmarkLimiter,
  asyncHandler(async (req, res) => {
    const content = await unbookmarkContent(req.params.id);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ bookmarkCount: content.bookmarkCount });
  })
);

router.post(
  '/:id/rate',
  authenticate,
  ratingLimiter,
  validate(ratingSchema),
  asyncHandler(async (req, res) => {
    const content = await rateContent(req.params.id, req.user.id, req.body.score);

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ ratingSum: content.ratingSum, ratingCount: content.ratingCount });
  })
);

router.get(
  '/:id/rating',
  asyncHandler(async (req, res) => {
    const payload = await getRating(req.params.id);

    if (!payload) {
      return res.status(404).json({ error: 'Content not found' });
    }

    return res.json({ data: payload });
  })
);

module.exports = router;
