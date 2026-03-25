// =============================================
// routes/auth.js - Auth Routes (SQLite)
// =============================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const authMiddleware = require('../middleware/auth');

const genToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ---- SIGNUP ----
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password min 6 characters.' });

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing)
      return res.status(400).json({ success: false, message: 'Email already registered.' });

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)')
      .run(id, name.trim(), email.toLowerCase().trim(), hashed);

    const token = genToken(id);
    res.status(201).json({
      success: true,
      message: 'Account created!',
      token,
      user: { id, name: name.trim(), email: email.toLowerCase() }
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---- LOGIN ----
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = genToken(user.id);
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ---- GET ME ----
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, user });
});

// ---- UPDATE PROFILE ----
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name && !email)
      return res.status(400).json({ success: false, message: 'Nothing to update.' });

    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase(), req.user.id);
      if (existing)
        return res.status(400).json({ success: false, message: 'Email already in use.' });
    }

    if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id);
    if (email) db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email.toLowerCase().trim(), req.user.id);

    const updated = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, message: 'Profile updated!', user: updated });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// ---- CHANGE PASSWORD ----
router.patch('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both fields required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password min 6 chars.' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Current password incorrect.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    res.json({ success: true, message: 'Password changed successfully!' });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed.' });
  }
});

module.exports = router;
