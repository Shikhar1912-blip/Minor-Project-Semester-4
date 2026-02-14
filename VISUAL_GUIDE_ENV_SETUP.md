# 📸 Visual Guide: Configuring Backend for Sentinel Hub

## 🎯 Goal
Put your Sentinel Hub API credentials (Client ID & Secret) into a file called `.env` so your backend can use them.

---

## 📁 Step-by-Step with Pictures

### Step 1: Open File Explorer
```
Windows Key + E
or
Click the folder icon in taskbar
```

### Step 2: Navigate to Backend Folder
```
This PC
└── Users
    └── Shikhar Varshney
        └── Desktop
            └── Minor Project
                └── terra-form
                    └── backend  ← YOU WANT THIS FOLDER!
```

You'll see files like:
```
📁 backend/
├── 📄 main.py
├── 📄 .env.example  ← This is the template!
├── 📄 requirements.txt
├── 📁 services/
└── 📁 data/
```

---

## 🔄 Step 3: Create .env File

### Visual Steps:

**A. Find `.env.example`**
```
Look for a file named:  .env.example
(It has a gear icon ⚙️)
```

**B. Copy it**
```
Right-click on .env.example
└── Click "Copy"
```

**C. Paste it**
```
Right-click in empty space
└── Click "Paste"

You now have: .env.example - Copy
```

**D. Rename it**
```
Right-click on ".env.example - Copy"
└── Click "Rename"
└── Type exactly:  .env
└── Press Enter

Windows Warning appears:
"If you change the file extension, 
the file might become unusable."
└── Click "Yes" ✅
```

**You now have TWO files:**
```
✅ .env.example (original - don't touch)
✅ .env (your new file - edit this!)
```

---

## ✏️ Step 4: Edit the .env File

**A. Open .env**
```
Double-click .env
└── Choose: Notepad
```

**B. You'll see this:**
```
# Environment Configuration for Terra-Form Backend

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Sentinel Hub API (Week 2)
SENTINEL_CLIENT_ID=your_client_id_here      ← CHANGE THIS
SENTINEL_CLIENT_SECRET=your_client_secret_here  ← CHANGE THIS

# Database (Future)
# DATABASE_URL=postgresql://user:password@localhost:5432/terraform
```

**C. Find these lines:**
```
Line 8:  SENTINEL_CLIENT_ID=your_client_id_here
Line 9:  SENTINEL_CLIENT_SECRET=your_client_secret_here
```

**D. Replace with YOUR credentials from Sentinel Hub:**
```
BEFORE (❌):
SENTINEL_CLIENT_ID=your_client_id_here
SENTINEL_CLIENT_SECRET=your_client_secret_here

AFTER (✅):
SENTINEL_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
SENTINEL_CLIENT_SECRET=X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0
```

**Your Client ID looks like:**
```
Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
         ↑ 8 chars, then dashes, then more chars
```

**Your Client Secret looks like:**
```
Format: Long random string (40+ characters)
Example: X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0
         ↑ No dashes, just letters and numbers
```

**E. Save the file**
```
Ctrl + S
or
File → Save
```

---

## ✅ Checklist: Did You Do It Right?

Open your `.env` file in Notepad and verify:

- [ ] Line has `SENTINEL_CLIENT_ID=` followed by YOUR ID (not "your_client_id_here")
- [ ] Line has `SENTINEL_CLIENT_SECRET=` followed by YOUR secret (not "your_client_secret_here")
- [ ] No quotes around the values (no `"` marks)
- [ ] No spaces around the `=` sign
- [ ] Your Client ID has dashes in it (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- [ ] Your Client Secret is a long string

---

## ❌ Common Mistakes

### Mistake 1: Left the placeholder text
```
❌ WRONG:
SENTINEL_CLIENT_ID=your_client_id_here

✅ CORRECT:
SENTINEL_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Mistake 2: Added quotes
```
❌ WRONG:
SENTINEL_CLIENT_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

✅ CORRECT:
SENTINEL_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Mistake 3: Added spaces
```
❌ WRONG:
SENTINEL_CLIENT_ID = a1b2c3d4-e5f6-7890-abcd-ef1234567890

✅ CORRECT:
SENTINEL_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Mistake 4: Edited .env.example instead of .env
```
❌ WRONG:
Editing .env.example (the template file)

✅ CORRECT:
Create .env and edit that (your personal config)
```

---

## 🧪 Test It Worked

After saving the `.env` file:

**1. Check the file exists:**
```
backend/
├── .env.example ← Original template
├── .env ← Your new file with real credentials ✅
```

**2. Restart backend:**
```powershell
# In your backend terminal:
Ctrl + C (to stop)

# Then restart:
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
.\start-backend.ps1
```

**3. Check status:**
```
Open: http://localhost:8000/api/status

Look for: "satellite_api": "configured" ✅
```

If you see "configured" → SUCCESS! 🎉

---

## 🆘 Still Stuck?

### Can't find .env.example?
→ Make sure you're in the `backend` folder, not `terra-form` root

### Can't see file extensions?
→ In File Explorer: View → Show → File name extensions

### File won't open?
→ Right-click .env → Open With → Choose Notepad

### Credentials not working?
→ Double-check you copied them correctly from Sentinel Hub dashboard

---

## 📺 Quick Video Guide

**What you're doing:**
1. 📂 Open backend folder
2. 📋 Copy `.env.example` file
3. ✏️ Rename copy to `.env`
4. 📝 Open `.env` in Notepad
5. 🔑 Replace placeholder text with YOUR credentials
6. 💾 Save and close
7. 🔄 Restart backend

**That's it!** ✅

---

## 🎯 Summary

```
Where:     backend/.env
What:      Your private credentials
Why:       So backend can download satellite images
Security:  Never share or upload to GitHub
Next Step: Restart backend and test!
```

---

**If you completed this, you're ready to download satellite imagery from space!** 🛰️
