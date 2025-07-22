#!/bin/bash

# Load environment variables from .env
source .env

# Timestamp
TIMESTAMP=$(date +"%F-%H-%M")

# Parent of current working directory
PARENT_DIR="$(dirname "$PWD")"

# Backup directory path
BACKUP_DIR="$PARENT_DIR/mongodb-backups/$TIMESTAMP"

# Create directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] 🔄 Starting MongoDB backup..."

# Dump MongoDB
mongodump --uri="$MONGO_CENTRAL_DB_URI" --out="$BACKUP_DIR"

# Check result
if [ $? -eq 0 ]; then
    echo "[$(date)] ✅ Backup complete at $BACKUP_DIR"
else
    echo "[$(date)] ❌ Backup failed!"
    exit 1
fi

# Delete backups older than 7 days
find "$PARENT_DIR/mongodb-backups/" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

echo "[$(date)] 🧹 Deleted backups older than 7 days"


