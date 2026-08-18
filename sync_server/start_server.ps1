$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

# For the phone on the same Wi-Fi, open http://<this-PC-LAN-IP>:8088/v1 in the apps.
# For a public service set DATABASE_URL and APP_SECRET before starting this script.
python -m uvicorn main:app --host 0.0.0.0 --port 8088
