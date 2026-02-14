# 🛰️ Sentinel Hub Setup Guide

## Step 1: Create Sentinel Hub Account

1. Go to **https://www.sentinel-hub.com/**
2. Click "**Sign Up**" (top right)
3. Choose "**Free Trial**" plan (no credit card required)
4. Fill in your details:
   - Email
   - Password
   - Name
   - Organization (you can put your college name)
5. Verify your email address

## Step 2: Get API Credentials

1. Log in to your Sentinel Hub account
2. Go to **Dashboard** → **User Settings**
3. Click on "**OAuth clients**" tab
4. Click "**+ Create new OAuth client**"
5. Fill in:
   - **Name:** Terra-Form
   - **Redirect URI:** http://localhost:8000 (can be anything for our use)
6. Click "**Create**"
7. You'll see:
   - **Client ID** (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
   - **Client Secret** (looks like: `X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6`)
8. **IMPORTANT:** Copy both and save them securely!

## Step 3: Configure Backend (Add Your API Credentials)

### 📝 What You're Doing
You need to tell your backend code the API credentials you got from Sentinel Hub. We do this by creating a special file called `.env` (environment variables file) where you paste your Client ID and Client Secret.

### 🎯 Method 1: Easy Way (Using File Explorer)

**A. Find the backend folder:**
1. Open File Explorer (Windows Explorer)
2. Navigate to: `C:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend`
3. You should see files like `main.py`, `.env.example`, etc.

**B. Create the .env file:**
1. Right-click on `.env.example` file
2. Click "Copy"
3. Right-click in empty space
4. Click "Paste"
5. You now have a file called `.env.example - Copy`
6. Right-click on `.env.example - Copy`
7. Click "Rename"
8. Delete everything and type exactly: `.env` (yes, just dot-env, no extension!)
9. Press Enter
10. Windows will warn "If you change the file extension, the file might become unusable. Are you sure?" → Click **Yes**

**C. Edit the .env file:**
1. Double-click the `.env` file
2. If Windows asks "How do you want to open this file?", choose **Notepad**
3. You'll see something like:
   ```
   # Environment Configuration for Terra-Form Backend
   
   # API Configuration
   API_HOST=0.0.0.0
   API_PORT=8000
   
   # Sentinel Hub API (Week 2)
   SENTINEL_CLIENT_ID=your_client_id_here
   SENTINEL_CLIENT_SECRET=your_client_secret_here
   ```

4. **Find these two lines:**
   ```
   SENTINEL_CLIENT_ID=your_client_id_here
   SENTINEL_CLIENT_SECRET=your_client_secret_here
   ```

5. **Replace with YOUR actual credentials** from Step 2:
   - Delete `your_client_id_here` and paste YOUR Client ID
   - Delete `your_client_secret_here` and paste YOUR Client Secret

6. **Example of what it should look like after editing:**
   ```
   SENTINEL_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
   SENTINEL_CLIENT_SECRET=X1Y2Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0
   ```

7. **Save and close:**
   - Click "File" → "Save" (or press Ctrl+S)
   - Close Notepad

---

### 🎯 Method 2: Using PowerShell (Advanced)

If you prefer using PowerShell:

```powershell
# Navigate to backend folder
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend"

# Create .env file by copying .env.example
Copy-Item .env.example .env

# Open .env file in Notepad
notepad .env

# Now edit in Notepad as described above
```

---

### ✅ How to Verify You Did It Right

After editing, your `.env` file should have:
- ✅ A line starting with `SENTINEL_CLIENT_ID=` followed by your actual ID (looks like a UUID with dashes)
- ✅ A line starting with `SENTINEL_CLIENT_SECRET=` followed by your actual secret (long random string)
- ✅ **NO quotes** around the values
- ✅ **NO spaces** before or after the `=` sign

**❌ WRONG:**
```
SENTINEL_CLIENT_ID = "your_client_id_here"  ← Has quotes and spaces!
```

**✅ CORRECT:**
```
SENTINEL_CLIENT_ID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

### 🔐 Important Security Notes

- ✅ The `.env` file is already in `.gitignore` (won't be uploaded to GitHub)
- ✅ NEVER share your Client ID and Secret publicly
- ✅ NEVER commit `.env` to GitHub
- ✅ Keep these credentials private (like a password)

## Step 4: Restart Backend

After adding credentials:

```powershell
# Stop the current backend (Ctrl+C in terminal)

# Restart backend
cd "c:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form"
.\start-backend.ps1
```

## Step 5: Verify Setup

1. Open **http://localhost:8000/docs**
2. Look for new endpoints:
   - `POST /api/satellite/fetch`
   - `POST /api/satellite/fetch-city`
   - `GET /api/satellite/download/{filename}`
   - `GET /api/satellite/cities`
3. Check system status:
   - Open **http://localhost:8000/api/status**
   - Look for: `"satellite_api": "configured"` ✅

## Step 6: Test Download

### Option 1: Using API Docs (http://localhost:8000/docs)

1. Go to `/api/satellite/fetch-city` endpoint
2. Click "**Try it out**"
3. Enter request body:
```json
{
  "city_name": "Delhi",
  "days_before": 10
}
```
4. Click "**Execute**"
5. Wait 10-30 seconds (downloading from satellite!)
6. You should get a response with `download_url`

### Option 2: Using Python
```python
import requests

response = requests.post(
    "http://localhost:8000/api/satellite/fetch-city",
    json={"city_name": "Mumbai"}
)
print(response.json())
```

## Troubleshooting

### Error: "Sentinel Hub API not configured"
- ✅ Check if `.env` file exists in `backend/` folder
- ✅ Check if credentials are correctly pasted (no extra spaces)
- ✅ Restart backend server after adding credentials

### Error: "Invalid credentials"
- ✅ Double-check Client ID and Secret from Sentinel Hub dashboard
- ✅ Make sure you copied the entire string (no truncation)
- ✅ Verify your Sentinel Hub account is active

### Error: "No data available"
- ✅ Try increasing `days_before` parameter (e.g., 30 days)
- ✅ Some locations may have cloud coverage issues
- ✅ Sentinel-2 has 5-day revisit time, try different dates

### Slow Response
- ⏳ First request takes 15-30 seconds (downloading from satellite)
- ⏳ Images are ~10-30 MB, needs time to process
- ⏳ This is normal! Future requests will be cached

## Free Tier Limits

**Sentinel Hub Free Trial includes:**
- ✅ 1,000 Processing Units per month
- ✅ ~30-50 image downloads
- ✅ Full API access
- ✅ 3 months free trial

**One image download uses:**
- Small area (0.1° bbox): ~10-20 PU
- Medium area (0.5° bbox): ~50-100 PU

**Tips to save Processing Units:**
- Use smaller `bbox_size` (default 0.1 is good)
- Download once, save the image
- Reuse downloaded images for testing

## What You Get

After successful setup, you'll be able to:
- 🛰️ Download real satellite images from space
- 📍 Search by coordinates (lat/lon)
- 🌍 Search by city name
- 📅 Select date ranges
- 🗺️ Choose resolution (10m, 20m, 60m)
- 💾 Images saved in `backend/data/satellite_images/`

## Next Steps (Week 2 Tasks)

After setup:
1. ✅ Download image for your college/city
2. ✅ Test with different dates
3. ✅ Verify images are saved in data folder
4. ✅ Move to frontend integration

---

**Need Help?**
- Sentinel Hub Docs: https://docs.sentinel-hub.com/
- Support: https://forum.sentinel-hub.com/

**Status:** Ready for Week 2! 🚀
