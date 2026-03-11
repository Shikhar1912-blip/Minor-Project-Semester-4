@echo off
powershell -NoProfile -NoExit -Command "cd 'C:\Users\Shikhar Varshney\Desktop\Minor Project\terra-form\backend'; & 'C:\Users\Shikhar Varshney\Desktop\Minor Project\.venv\Scripts\python.exe' -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
