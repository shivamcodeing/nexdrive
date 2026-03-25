// =============================================
// server.js - NexDrive (Render Deployment)
// SQLite + Express + No Upload Limit
// =============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// ---- CORS - Allow Render domain + localhost ----
const allowedOrigins = [
  'https://nexdrive-gedg.onrender.com',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'null' // for file:// protocol (local HTML files)
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, file://)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now — restrict later if needed
    }
  },
  credentials: true
}));

// ---- Middleware ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Serve uploaded files ----
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---- Serve Frontend ----
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- API Routes ----
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'NexDrive API running!',
    timestamp: new Date().toISOString()
  });
});

// ---- Serve frontend for all other routes ----
app.get('*', (req, res) => {
  // If requesting API, 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found.' });
  }
  // Otherwise serve index (login page)
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ☁️  NexDrive - Render Deployment');
  console.log('  ─────────────────────────────────────');
  console.log(`  🚀 Server  : http://localhost:${PORT}`);
  console.log(`  🌐 Live URL: https://nexdrive-gedg.onrender.com`);
  console.log(`  🗄️  Database: SQLite (./data/nexdrive.db)`);
  console.log(`  📁 Uploads : ./uploads/`);
  console.log(`  ⚡ No file size limit!`);
  console.log('  ─────────────────────────────────────');
  console.log('');
});
