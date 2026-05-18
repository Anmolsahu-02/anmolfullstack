const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
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
  ensureRedisBookmark,
  LOCALE_MAP
} = require('../services/contentService');
const Content = require('../models/Content');
const { toObjectId } = require('../utils/objectId');

const router = express.Router();

const bookmarkLimiter = createLimiter({ max: 30, windowMs: 60_000 });
const searchLimiter   = createLimiter({ max: 60, windowMs: 60_000 });
const autosaveLimiter = createLimiter({ max: 10, windowMs: 10_000 });
const ratingLimiter   = createLimiter({ max: 10, windowMs: 60_000 });

// ── Public: browse published ──────────────────────────────────────────────────
router.get('/', asyncHandler(async (req, res) => {
  const { genre, language, contentType, sort, cursor } = req.query;
  const results = await browseContent({ genre, language, contentType, sort, cursor });
  return res.json({ success: true, data: results });
}));

// ── Public: search ────────────────────────────────────────────────────────────
router.get('/search', searchLimiter, validate(searchQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const results = await searchContent(req.query);
    return res.json({ success: true, data: results });
  })
);

// ── Writer: list drafts ───────────────────────────────────────────────────────
router.get('/drafts', authenticate, requireRole('writer'),
  asyncHandler(async (req, res) => {
    const drafts = await listDrafts(req.user.id);
    return res.json({ success: true, data: drafts });
  })
);

// ── Writer: list published ────────────────────────────────────────────────────
router.get('/my-published', authenticate, requireRole('writer'),
  asyncHandler(async (req, res) => {
    const items = await listPublished(req.user.id);
    return res.json({ success: true, data: items });
  })
);

// ── Auth (any role): user bookmarks ──────────────────────────────────────────
router.get('/my-bookmarks', authenticate, asyncHandler(async (req, res) => {
  const items = await getUserBookmarks(req.user.id);
  return res.json({ success: true, data: items });
}));

// ── Public: by language ───────────────────────────────────────────────────────
router.get('/by-language', validate(languageQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const locale = LOCALE_MAP[req.query.lang] || 'en';
    const results = await Content.find({ language: req.query.lang, isDeleted: false })
      .collation({ locale, strength: 2 })
      .sort({ title: 1 })
      .limit(20)
      .lean();
    return res.json({ success: true, data: results, locale });
  })
);

// ── Public: trending ──────────────────────────────────────────────────────────
router.get('/trending', asyncHandler(async (req, res) => {
  const data = await trendingContent();
  return res.json({ success: true, data });
}));

// ── Public: language stats ────────────────────────────────────────────────────
router.get('/stats/language', asyncHandler(async (req, res) => {
  const data = await languageStats();
  return res.json({ success: true, data });
}));

// ── Public: get single content ────────────────────────────────────────────────
router.get('/:id', asyncHandler(async (req, res) => {
  const contentId = toObjectId(req.params.id);
  if (!contentId) return res.status(400).json({ success: false, error: 'Invalid content id' });

  const content = await getContentById(contentId);
  if (!content) return res.status(404).json({ success: false, error: 'Content not found' });

  return res.json({ success: true, data: content });
}));

// ── Writer: create ────────────────────────────────────────────────────────────
router.post('/', authenticate, requireRole('writer'), validate(contentCreateSchema),
  asyncHandler(async (req, res) => {
    const content = await createContent(req.user.id, req.body);
    await ensureRedisBookmark(content);
    return res.status(201).json({ success: true, data: content });
  })
);

// ── Writer: update metadata (title, genre, language) ─────────────────────────
router.patch('/:id/meta', authenticate, requireRole('writer'), requireOwnership,
  asyncHandler(async (req, res) => {
    const { title, genre, language, contentType } = req.body;
    const updated = await updateMeta(req.params.id, req.user.id, { title, genre, language, contentType });
    if (!updated) return res.status(404).json({ success: false, error: 'Content not found' });
    return res.json({ success: true, data: updated });
  })
);

// ── Writer: autosave ──────────────────────────────────────────────────────────
router.patch('/:id/autosave', authenticate, requireRole('writer'), autosaveLimiter, requireOwnership, validate(autosaveSchema),
  asyncHandler(async (req, res) => {
    const result = await updateAutosave(req.params.id, req.user.id, req.body.delta);
    if (!result) return res.status(404).json({ success: false, error: 'Content not found' });
    if (result.saved === false) return res.json({ success: true, saved: false, reason: result.reason });
    return res.json({ success: true, saved: true, updatedAt: result.updatedAt });
  })
);

// ── Writer: save version ──────────────────────────────────────────────────────
router.post('/:id/versions', authenticate, requireRole('writer'), requireOwnership, validate(versionSchema),
  asyncHandler(async (req, res) => {
    const label = req.body.label || 'Manual save';
    const snapshot = await saveVersion(req.params.id, req.user.id, req.body.delta, label);
    if (!snapshot) return res.status(404).json({ success: false, error: 'Content not found' });
    return res.status(201).json({ success: true, data: snapshot });
  })
);

// ── Public: list versions (metadata only, no delta blobs) ────────────────────
router.get('/:id/versions', asyncHandler(async (req, res) => {
  const versions = await listVersions(req.params.id);
  if (!versions) return res.status(404).json({ success: false, error: 'Content not found' });
  return res.json({ success: true, data: versions });
}));

// ── Writer: restore version ───────────────────────────────────────────────────
router.post('/:id/restore/:vid', authenticate, requireRole('writer'), requireOwnership,
  asyncHandler(async (req, res) => {
    const versionId = toObjectId(req.params.vid);
    if (!versionId) return res.status(400).json({ success: false, error: 'Invalid version id' });

    const restored = await restoreVersion(req.params.id, req.user.id, versionId);
    if (!restored) return res.status(404).json({ success: false, error: 'Version not found' });

    return res.json({ success: true, data: restored });
  })
);

// ── Writer: publish ───────────────────────────────────────────────────────────
router.post('/:id/publish', authenticate, requireRole('writer'), requireOwnership,
  asyncHandler(async (req, res) => {
    try {
      const content = await publishContent(req.params.id, req.user.id);
      if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
      return res.json({ success: true, data: content });
    } catch (err) {
      return res.status(422).json({ success: false, error: err.message });
    }
  })
);

// ── Writer: unpublish ─────────────────────────────────────────────────────────
router.post('/:id/unpublish', authenticate, requireRole('writer'), requireOwnership,
  asyncHandler(async (req, res) => {
    const content = await unpublishContent(req.params.id, req.user.id);
    if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
    return res.json({ success: true, data: content });
  })
);

// ── Writer: delete ────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, requireRole('writer'), requireOwnership,
  asyncHandler(async (req, res) => {
    const deleted = await deleteContent(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Content not found' });
    return res.json({ success: true, deleted: true });
  })
);

// ── Auth (both roles): bookmark toggle ───────────────────────────────────────
router.post('/:id/bookmark', authenticate, bookmarkLimiter,
  asyncHandler(async (req, res) => {
    const result = await toggleBookmark(req.params.id, req.user.id);
    if (!result) return res.status(404).json({ success: false, error: 'Content not found' });
    return res.json({ success: true, data: result });
  })
);

// ── Auth (both roles): rate ───────────────────────────────────────────────────
router.post('/:id/rate', authenticate, ratingLimiter, validate(ratingSchema),
  asyncHandler(async (req, res) => {
    const content = await rateContent(req.params.id, req.user.id, req.body.score);
    if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
    return res.json({ success: true, data: { ratingSum: content.ratingSum, ratingCount: content.ratingCount } });
  })
);

// ── Public: get rating ────────────────────────────────────────────────────────
router.get('/:id/rating', asyncHandler(async (req, res) => {
  const payload = await getRating(req.params.id);
  if (!payload) return res.status(404).json({ success: false, error: 'Content not found' });
  return res.json({ success: true, data: payload });
}));

module.exports = router;
