import urllib.request
import urllib.error

try:
    response = urllib.request.urlopen('http://localhost:8000/api/alerts/summary')
    print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}:\n{e.read().decode()}")
except Exception as e:
    print(f"Other Error: {e}")
