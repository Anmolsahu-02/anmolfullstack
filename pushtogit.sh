echo " initialising git repo and making commits for anmolfinalfullstack project"
git init
git add .
read -p "Enter commit message: " commit_message
git commit -m "$commit_message"
git push -u origin main