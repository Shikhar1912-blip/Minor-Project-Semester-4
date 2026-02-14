# ⚡ Super Simple Guide: Add Sentinel Hub Credentials

## 🎯 What You Need
- Your Client ID from Sentinel Hub (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
- Your Client Secret from Sentinel Hub (looks like: `X1Y2Z3A4B5C6D7E8F9G0...`)

---

## 📝 5-Minute Steps

### 1️⃣ Open the Backend Folder
Click this path in File Explorer:
```
C:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend
```

### 2️⃣ Copy the Template File
- Find the file: `.env.example`
- Right-click on it
- Click "Copy"
- Right-click in empty space
- Click "Paste"

### 3️⃣ Rename the Copy
- You now have a file called `.env.example - Copy`
- Right-click on it
- Click "Rename"
- Delete everything and type: `.env`
- Press Enter
- Click "Yes" when Windows warns you

### 4️⃣ Open the New File
- Double-click `.env`
- Choose "Notepad" if asked

### 5️⃣ Replace the Credentials
Find these two lines:
```
SENTINEL_CLIENT_ID=your_client_id_here
SENTINEL_CLIENT_SECRET=your_client_secret_here
```

Change them to:
```
SENTINEL_CLIENT_ID=<paste your Client ID here>
SENTINEL_CLIENT_SECRET=<paste your Client Secret here>
```

**Example:**
```
SENTINEL_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
SENTINEL_CLIENT_SECRET=X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0
```

### 6️⃣ Save and Close
- Press `Ctrl + S` to save
- Close Notepad

### 7️⃣ Restart Backend
Go to your backend terminal and:
- Press `Ctrl + C` to stop it
- Run: `.\start-backend.ps1` to restart it

---

## ✅ How to Check It Worked

Open in browser: **http://localhost:8000/api/status**

Look for:
```json
{
  "satellite_api": "configured"  ← Should say "configured" ✅
}
```

If it says `"not_configured"`, check your `.env` file again.

---

## ⚠️ Important Rules

1. **NO quotes** - Don't put quotes around your credentials
2. **NO spaces** - No spaces around the `=` sign  
3. **EXACT name** - The file must be named `.env` (not `.env.txt`)
4. **RIGHT folder** - Must be in `backend` folder, not somewhere else

---

## 🆘 Quick Troubleshooting

**Problem:** Can't see `.env.example`  
**Solution:** In File Explorer → View → Check "File name extensions"

**Problem:** File opens in wrong program  
**Solution:** Right-click → Open With → Choose Notepad

**Problem:** Still shows "not_configured"  
**Solution:** Make sure you saved the file and restarted backend

---

**Done!** You can now download satellite images! 🎉

Next: Go to **http://localhost:3000/satellite** and try downloading an image!
