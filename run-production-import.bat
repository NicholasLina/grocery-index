@echo off
echo Setting up production MongoDB connection...
set MONGODB_URI=mongodb+srv://nicktlina:mdb351NLiicn@grocery-index.amebkpw.mongodb.net/?retryWrites=true&w=majority&appName=grocery-index

echo Running StatCan data import to production database...
python download-table-1810024502.py

echo Import completed!
pause 