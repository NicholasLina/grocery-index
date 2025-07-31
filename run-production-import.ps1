# PowerShell script to run StatCan data import to production database
Write-Host "Setting up production MongoDB connection..." -ForegroundColor Green

$env:MONGODB_URI = "mongodb+srv://nicktlina:mdb351NLiicn@grocery-index.amebkpw.mongodb.net/?retryWrites=true&w=majority&appName=grocery-index"

Write-Host "Running StatCan data import to production database..." -ForegroundColor Yellow
python download-table-1810024502.py

Write-Host "Import completed!" -ForegroundColor Green
Read-Host "Press Enter to continue" 