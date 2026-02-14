# 🚀 Quick Start Guide - Week 1

## Prerequisites Check

Before starting, make sure you have:
- ✅ Python 3.11 or higher installed
- ✅ Node.js 18 or higher installed
- ✅ npm package manager

Check versions:
```bash
python --version
node --version
npm --version
```

---

## Option 1: Automated Setup (Recommended)

### Step 1: Setup Backend
Double-click: `setup-backend.bat`

Or run manually:
```bash
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
setup-backend.bat
```

### Step 2: Setup Frontend
Double-click: `setup-frontend.bat`

Or run manually:
```bash
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
setup-frontend.bat
```

### Step 3: Start Backend
Open Terminal 1 and double-click: `start-backend.bat`

Or run manually:
```bash
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
start-backend.bat
```

Wait for: `Application startup complete.`

### Step 4: Start Frontend
Open Terminal 2 and double-click: `start-frontend.bat`

Or run manually:
```bash
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
start-frontend.bat
```

Wait for: `Ready in X seconds`

### Step 5: Open Browser
Navigate to: **http://localhost:3000**

You should see the Terra-Form connection test page with green checkmarks! ✅

---

## Option 2: Manual Setup

### Backend Setup
```bash
# Navigate to project
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend"

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
Open a new terminal:
```bash
# Navigate to frontend
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\frontend"

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🎯 Testing the Connection

1. **Backend Test:** Open http://localhost:8000
   - Should see: `{"message": "Terra-Form API is running"}`

2. **API Docs:** Open http://localhost:8000/docs
   - Interactive API documentation

3. **Frontend Test:** Open http://localhost:3000
   - Should see Terra-Form dashboard
   - Green checkmark for "Connection Successful!"
   - Project information displayed
   - System status showing backend: operational

---

## 🐛 Troubleshooting

### Backend Issues

**Error: "Python not found"**
- Install Python from: https://www.python.org/downloads/
- Make sure "Add to PATH" is checked during installation

**Error: "Port 8000 already in use"**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

**Error: "Module not found"**
```bash
# Make sure virtual environment is activated
venv\Scripts\activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Issues

**Error: "Node.js not found"**
- Install Node.js from: https://nodejs.org/
- Choose LTS version

**Error: "Port 3000 already in use"**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

**Error: "Cannot connect to backend"**
- Make sure backend is running on port 8000
- Check backend terminal for errors
- Verify `.env.local` in frontend folder has:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:8000
  ```

**Error: "npm install fails"**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rmdir /s /q node_modules
npm install
```

---

## 📊 What You Should See

### Backend Terminal (Port 8000)
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### Frontend Terminal (Port 3000)
```
  ▲ Next.js 14.1.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 2.5s
```

### Browser (localhost:3000)
- Beautiful gradient interface
- "Terra-Form" title
- Green success message: "Connection Successful!"
- Project details displayed
- System status with colored badges
- Week 1 progress checklist

---

## 🎓 Understanding the Architecture

```
Browser (localhost:3000)
         ↓
    Next.js Frontend
         ↓
    HTTP Request (axios)
         ↓
    FastAPI Backend (localhost:8000)
         ↓
    JSON Response
         ↓
    Display on UI
```

---

## 📁 File Structure You Created

```
terra-form/
├── backend/
│   ├── main.py              ← FastAPI endpoints
│   ├── requirements.txt     ← Python packages
│   ├── .env.example        ← Environment template
│   └── .gitignore
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx      ← App layout
│   │   ├── page.tsx        ← Home page (connection test)
│   │   └── globals.css     ← Global styles
│   ├── package.json        ← Node dependencies
│   ├── tsconfig.json       ← TypeScript config
│   ├── tailwind.config.js  ← Tailwind setup
│   └── next.config.js      ← Next.js config
│
├── setup-backend.bat       ← Backend setup script
├── setup-frontend.bat      ← Frontend setup script
├── start-backend.bat       ← Start backend server
├── start-frontend.bat      ← Start frontend server
├── README.md               ← Full documentation
└── QUICKSTART.md          ← This file
```

---

## ✅ Week 1 Completion Checklist

- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Backend virtual environment created
- [ ] Backend dependencies installed
- [ ] Backend server starts without errors
- [ ] Frontend dependencies installed
- [ ] Frontend server starts without errors
- [ ] Browser shows Terra-Form interface
- [ ] Connection test shows green checkmark
- [ ] API documentation accessible at /docs

Once all checkboxes are complete, **Week 1 is done!** 🎉

---

## 🎯 Next Steps (Week 2)

In Week 2, you'll:
1. Sign up for Sentinel Hub API
2. Get API credentials
3. Write code to download satellite images
4. Save images based on coordinates

But for now, celebrate completing Week 1! 🚀

---

## 💡 Tips

1. **Always activate virtual environment** before working on backend
2. **Keep both servers running** while developing
3. **Check terminal outputs** for errors
4. **Use Ctrl+C** to stop servers
5. **Restart servers** after changing configuration

---

## 🆘 Need Help?

If something doesn't work:
1. Check the error message in terminal
2. Look at the Troubleshooting section above
3. Verify prerequisites are installed
4. Make sure ports 8000 and 3000 are free
5. Try restarting both servers

---

**Status:** Week 1 Foundation Complete ✅

**You now have a working full-stack application with frontend-backend communication!**
