// =============================================
// routes/files.js - File Routes (SQLite)
// No upload size limit!
// =============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const authMiddleware = require('../middleware/auth');

// Upload directory
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer - NO SIZE LIMIT
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});

const upload = multer({ storage }); // No limits!

// File category helper
function getCategory(mime) {
  if (mime.startsWith('image/'))  return 'image';
  if (mime.startsWith('video/'))  return 'video';
  if (mime.startsWith('audio/'))  return 'audio';
  if (mime.includes('pdf'))       return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'doc';
  if (mime.includes('sheet') || mime.includes('excel'))   return 'sheet';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'ppt';
  if (mime.startsWith('text/'))   return 'text';
  return 'other';
}

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b/1048576).toFixed(1) + ' MB';
  return (b/1073741824).toFixed(2) + ' GB';
}

// ---- UPLOAD ----
router.post('/upload', authMiddleware, upload.array('files', 20), (req, res) => {
  try {
    if (!req.files || !req.files.length)
      return res.status(400).json({ success: false, message: 'No files uploaded.' });

    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${proto}://${host}`;
    const savedFiles = [];

    const insert = db.prepare(`
      INSERT INTO files (id, original_name, filename, mimetype, category, size, path, url, user_id, is_trashed, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))
    `);

    for (const file of req.files) {
      const id = uuidv4();
      const url = `${baseUrl}/uploads/${file.filename}`;
      insert.run(id, file.originalname, file.filename, file.mimetype,
        getCategory(file.mimetype), file.size, file.path, url, req.user.id);
      savedFiles.push({
        _id: id, originalName: file.originalname,
        filename: file.filename, mimetype: file.mimetype,
        category: getCategory(file.mimetype),
        size: file.size, url, uploadedAt: new Date().toISOString()
      });
    }

    res.status(201).json({ success: true, message: `${savedFiles.length} file(s) uploaded!`, files: savedFiles });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---- GET FILES ----
router.get('/', authMiddleware, (req, res) => {
  try {
    const { search, trash } = req.query;
    const isTrashed = trash === 'true' ? 1 : 0;

    let query = 'SELECT * FROM files WHERE user_id = ? AND is_trashed = ?';
    const params = [req.user.id, isTrashed];

    if (search && search.trim()) {
      query += ' AND original_name LIKE ?';
      params.push(`%${search.trim()}%`);
    }

    query += ' ORDER BY uploaded_at DESC';

    const files = db.prepare(query).all(...params).map(f => ({
      _id: f.id, originalName: f.original_name, filename: f.filename,
      mimetype: f.mimetype, category: f.category, size: f.size,
      url: f.url, isTrashed: !!f.is_trashed, uploadedAt: f.uploaded_at
    }));

    // Total storage (non-trashed)
    const storageRow = db.prepare('SELECT SUM(size) as total FROM files WHERE user_id = ? AND is_trashed = 0').get(req.user.id);
    const totalStorage = storageRow?.total || 0;

    res.json({ success: true, count: files.length, totalStorage, files });

  } catch (err) {
    console.error('Get files error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch files.' });
  }
});

// ---- DELETE / TRASH ----
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    if (file.is_trashed) {
      // Permanent delete
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      db.prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
      return res.json({ success: true, message: 'File permanently deleted.' });
    }

    // Soft delete (trash)
    db.prepare('UPDATE files SET is_trashed = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'File moved to trash.' });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Delete failed.' });
  }
});

// ---- RESTORE ----
router.patch('/:id/restore', authMiddleware, (req, res) => {
  try {
    const file = db.prepare('SELECT id FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
    db.prepare('UPDATE files SET is_trashed = 0 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'File restored!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Restore failed.' });
  }
});

// ---- RENAME ----
router.patch('/:id/rename', authMiddleware, (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ success: false, message: 'Name required.' });
    db.prepare('UPDATE files SET original_name = ? WHERE id = ? AND user_id = ?')
      .run(newName.trim(), req.params.id, req.user.id);
    res.json({ success: true, message: 'File renamed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Rename failed.' });
  }
});

// ---- STATS ----
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const files = db.prepare('SELECT category, size FROM files WHERE user_id = ? AND is_trashed = 0').all(req.user.id);
    const totalSize = files.reduce((s, f) => s + f.size, 0);
    const byCategory = {};
    files.forEach(f => { byCategory[f.category] = (byCategory[f.category] || 0) + 1; });
    const trashed = db.prepare('SELECT COUNT(*) as c FROM files WHERE user_id = ? AND is_trashed = 1').get(req.user.id);

    res.json({
      success: true,
      stats: {
        totalFiles: files.length,
        trashedFiles: trashed.c,
        totalSize,
        totalSizeFormatted: fmtSize(totalSize),
        byCategory
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Stats failed.' });
  }
});

// Error handler
router.use((err, req, res, next) => {
  res.status(400).json({ success: false, message: err.message });
});

module.exports = router;
