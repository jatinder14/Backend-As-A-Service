#!/bin/bash

# Delete all PM2 processes
echo "Deleting all PM2 processes..."
sudo pm2 delete all

# Navigate to project directory
# echo "Navigating to duomo-property-manager-dubai directory..."
# cd ~/duomo-property-manager-dubai || exit

# Pull the latest code from GitHub
echo "Pulling the latest code from GitHub..."
git pull

#Make the script executable
chmod +x start-docker.sh
./start-docker.sh

echo "Script executed successfully!"