#!/bin/bash

# Delete all PM2 processes
echo "Deleting all PM2 processes..."
sudo pm2 delete all

# Navigate to project directory
echo "Navigating to duomo-property-manager-dubai directory..."
cd ~/duomo-property-manager-dubai || exit

# Pull the latest code from GitHub
echo "Pulling the latest code from GitHub..."
git pull

# Pull the latest code from GitHub
echo "Installing dependencies"
npm i

# Start the application using PM2
echo "Starting the duomo application with PM2..."
sudo pm2 start npm --name "duomo" -- run start

# Save the current PM2 process list
echo "Saving the current PM2 process list..."
sudo pm2 save

# List the PM2 processes
echo "Listing PM2 processes..."
sudo pm2 list

echo "Script executed successfully!"