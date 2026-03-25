# ☁️ NexDrive Local — Google Drive Clone
### No MongoDB | No Internet | 100% Local Storage

---

## 📁 Folder Structure

```
nexdrive-local/
│
├── backend/
│   ├── server.js              ← Main server
│   ├── .env                   ← Config (PORT, JWT_SECRET)
│   ├── package.json           ← Dependencies
│   │
│   ├── models/
│   │   └── db.js              ← NeDB local database setup
│   │
│   ├── routes/
│   │   ├── auth.js            ← Signup / Login APIs
│   │   └── files.js           ← Upload / Get / Delete / Restore
│   │
│   ├── middleware/
│   │   └── auth.js            ← JWT auth middleware
│   │
│   ├── uploads/               ← Uploaded files stored here
│   └── data/
│       ├── users.db           ← Users (auto-created)
│       └── files.db           ← File records (auto-created)
│
└── frontend/
    ├── login.html
    ├── signup.html
    └── dashboard.html
```

---

## 🚀 Setup on PC (Windows/Linux)

### Step 1: Install Node.js
Download from https://nodejs.org (v16 or higher)

### Step 2: Install packages
```bash
cd nexdrive-local/backend
npm install
```

### Step 3: Start server
```bash
npm start
```

### Step 4: Open frontend
Open `frontend/login.html` in browser

---

## 📱 Setup on Termux (Android)

### Step 1: Install tools
```bash
pkg update && pkg upgrade -y
pkg install nodejs -y
```

### Step 2: Copy project to Termux
```bash
termux-setup-storage
cp /sdcard/Download/nexdrive-local.zip ~/
cd ~
unzip nexdrive-local.zip
cd nexdrive-local/backend
```

### Step 3: Install packages
```bash
npm install
```

### Step 4: Start server
```bash
npm start
```

### Step 5: Open frontend in phone browser
```
file:///data/data/com.termux/files/home/nexdrive-local/frontend/login.html
```

---

## 🌐 Access from Another Device (Same WiFi)

```bash
# Get your phone's IP
ifconfig | grep "inet "
```

Then on PC browser:
```
http://192.168.1.XXX:5000
```

Change API_URL in all 3 HTML files:
```javascript
const API = 'http://192.168.1.XXX:5000/api';
```

---

## 🗄️ Database Info

No MongoDB needed! Data is stored in plain files:

- `backend/data/users.db`  → All users
- `backend/data/files.db`  → All file metadata
- `backend/uploads/`       → Actual uploaded files

To backup: just copy the `data/` and `uploads/` folders!

---

## ✅ Features

- User signup / login (JWT + bcrypt)
- Upload any file type (image, video, audio, doc, pdf, zip)
- Grid view with image/video thumbnails
- List view with metadata
- Preview modal (image, video player, audio player, PDF)
- Delete → Trash → Permanent delete
- Restore from trash
- Search files
- Sort by date/name/size
- Filter by type (Images, Videos, Audio, Documents)
- Drag & Drop upload
- Storage usage bar
- Toast notifications
- Responsive (mobile friendly)

---

## 📦 Dependencies

```
express       - Web server
nedb-promises - Local file database (no MongoDB!)
multer        - File uploads
bcryptjs      - Password hashing
jsonwebtoken  - Auth tokens
cors          - Cross-origin
dotenv        - Env variables
```

---

## ❗ Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to server` | Run `npm start` in backend folder |
| `EADDRINUSE port 5000` | Change PORT in .env to 3000 or 8080 |
| `module not found` | Run `npm install` again |
| Files not showing | Check uploads/ folder exists |
| Login page blank | Open login.html directly in browser |
